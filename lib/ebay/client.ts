import {ebayApiBase,ebayLocale,ebayMarketplaceId,getEbayApplicationToken} from "@/lib/ebay/auth";
import {getEbayAccessToken} from "@/lib/ebay/oauth";

type EbayError={errorId?:number;domain?:string;category?:string;message?:string;longMessage?:string};

async function ebay(path:string,init:RequestInit={}){
 const token=await getEbayAccessToken();
 const response=await fetch(`${ebayApiBase()}${path}`,{
  ...init,
  headers:{
   Authorization:`Bearer ${token}`,
   Accept:"application/json",
   "Content-Type":"application/json",
   "Content-Language":ebayLocale(),
   "X-EBAY-C-MARKETPLACE-ID":ebayMarketplaceId(),
   ...(init.headers||{})
  },
  cache:"no-store"
 });
 const text=await response.text().catch(()=>"");
 let data:any=null;
 try{data=text?JSON.parse(text):null}catch{data=text}
 if(!response.ok){
  const errors=(data?.errors||[]) as EbayError[];
  console.error("eBay API error",JSON.stringify({path,status:response.status,errors:errors.map(e=>({errorId:e.errorId,domain:e.domain,category:e.category,message:e.message,longMessage:e.longMessage}))}));
  const first=errors[0];
  throw new Error(first?.longMessage||first?.message||`EBAY_API_${response.status}`);
 }
 return data;
}

export async function ensureEbaySellingPolicyManagement(){
 const current=await ebay("/sell/account/v1/program/get_opted_in_programs");
 const rows=Array.isArray(current)?current:(current?.programs||current?.optedInPrograms||current?.programTypes||[]);
 const opted=rows.some((x:any)=>String(typeof x==="string"?x:(x?.programType||x?.program||x?.name||"")).toUpperCase()==="SELLING_POLICY_MANAGEMENT");
 if(opted)return{alreadyOptedIn:true,programType:"SELLING_POLICY_MANAGEMENT"};
 await ebay("/sell/account/v1/program/opt_in",{method:"POST",body:JSON.stringify({programType:"SELLING_POLICY_MANAGEMENT"})});
 return{alreadyOptedIn:false,programType:"SELLING_POLICY_MANAGEMENT"};
}

export async function setupEbayFranceDefaults(){
 await ensureEbaySellingPolicyManagement();

 const readiness=await getEbayReadiness();
 let merchantLocationKey=readiness.locations?.[0]?.merchantLocationKey||"ynot-fr-59910";
 if(!readiness.locations?.length){
  await ebay(`/sell/inventory/v1/location/${encodeURIComponent(merchantLocationKey)}`,{
   method:"POST",
   body:JSON.stringify({
    name:"YNOT France",
    merchantLocationStatus:"ENABLED",
    locationTypes:["WAREHOUSE"],
    location:{address:{postalCode:"59910",country:"FR"}}
   })
  });
 }

 let paymentPolicyId=readiness.paymentPolicies?.[0]?.id||null;
 if(!paymentPolicyId){
  const created=await ebay("/sell/account/v1/payment_policy",{
   method:"POST",
   body:JSON.stringify({
    name:"YNOT Managed Payments",
    marketplaceId:ebayMarketplaceId(),
    categoryTypes:[{name:"ALL_EXCLUDING_MOTORS_VEHICLES",default:true}],
    paymentMethods:[]
   })
  });
  paymentPolicyId=created?.paymentPolicyId||null;
 }

 let returnPolicyId=readiness.returnPolicies?.[0]?.id||null;
 if(!returnPolicyId){
  const created=await ebay("/sell/account/v1/return_policy",{
   method:"POST",
   body:JSON.stringify({
    name:"YNOT 30 Day Returns",
    marketplaceId:ebayMarketplaceId(),
    categoryTypes:[{name:"ALL_EXCLUDING_MOTORS_VEHICLES",default:true}],
    returnsAccepted:true,
    returnPeriod:{value:30,unit:"DAY"},
    returnShippingCostPayer:"BUYER"
   })
  });
  returnPolicyId=created?.returnPolicyId||null;
 }

 let fulfillmentPolicyId=readiness.fulfillmentPolicies?.[0]?.id||null;
 if(!fulfillmentPolicyId){
  const created=await ebay("/sell/account/v1/fulfillment_policy",{
   method:"POST",
   body:JSON.stringify({
    name:"YNOT France Standard",
    marketplaceId:ebayMarketplaceId(),
    categoryTypes:[{name:"ALL_EXCLUDING_MOTORS_VEHICLES",default:false}],
    handlingTime:{value:3,unit:"DAY"},
    shippingOptions:[{
     optionType:"DOMESTIC",
     costType:"FLAT_RATE",
     shippingServices:[{
      sortOrder:1,
      shippingCarrierCode:"Colissimo",
      shippingServiceCode:"FR_ColiposteColissimo",
      freeShipping:true,
      shippingCost:{currency:"EUR",value:"0.00"},
      additionalShippingCost:{currency:"EUR",value:"0.00"}
     }]
    }]
   })
  });
  fulfillmentPolicyId=created?.fulfillmentPolicyId||null;
 }

 return{
  merchantLocationKey,
  paymentPolicyId,
  returnPolicyId,
  fulfillmentPolicyId,
  readiness:await getEbayReadiness()
 };
}

export async function getEbayReadiness(){
 const marketplace=encodeURIComponent(ebayMarketplaceId());
 const [locations,fulfillment,payment,returns]=await Promise.all([
  ebay("/sell/inventory/v1/location?limit=200"),
  ebay(`/sell/account/v1/fulfillment_policy?marketplace_id=${marketplace}`),
  ebay(`/sell/account/v1/payment_policy?marketplace_id=${marketplace}`),
  ebay(`/sell/account/v1/return_policy?marketplace_id=${marketplace}`)
 ]);
 const locationRows=locations?.locations||[];
 const fulfillmentRows=fulfillment?.fulfillmentPolicies||[];
 const paymentRows=payment?.paymentPolicies||[];
 const returnRows=returns?.returnPolicies||[];
 return{
  marketplaceId:ebayMarketplaceId(),
  ready:locationRows.length>0&&fulfillmentRows.length>0&&paymentRows.length>0&&returnRows.length>0,
  locations:locationRows.map((x:any)=>({merchantLocationKey:x.merchantLocationKey,name:x.name,status:x.merchantLocationStatus,location:x.location})),
  fulfillmentPolicies:fulfillmentRows.map((x:any)=>({id:x.fulfillmentPolicyId,name:x.name})),
  paymentPolicies:paymentRows.map((x:any)=>({id:x.paymentPolicyId,name:x.name})),
  returnPolicies:returnRows.map((x:any)=>({id:x.returnPolicyId,name:x.name}))
 };
}

async function ebayTaxonomy(path:string){
 const token=(await getEbayApplicationToken()).access_token;
 const response=await fetch(`${ebayApiBase()}${path}`,{
  headers:{Authorization:`Bearer ${token}`,Accept:"application/json","X-EBAY-C-MARKETPLACE-ID":ebayMarketplaceId()},
  cache:"no-store"
 });
 const text=await response.text().catch(()=>"");
 let data:any=null;try{data=text?JSON.parse(text):null}catch{data=text}
 if(!response.ok){
  const first=data?.errors?.[0];
  throw new Error(first?.longMessage||first?.message||`EBAY_TAXONOMY_${response.status}`);
 }
 return data;
}

function textHaystack(product:any){
 return [product?.title,product?.brand,product?.description,...(Array.isArray(product?.tags)?product.tags:[])].filter(Boolean).join(" ").toLowerCase();
}
function aspectValue(product:any,aspect:any){
 const name=String(aspect?.localizedAspectName||"");
 const lower=name.toLowerCase();
 if(lower==="brand"&&product?.brand)return [String(product.brand)];
 if((lower==="mpn"||lower.includes("manufacturer part"))&&product?.mpn)return [String(product.mpn)];
 if((lower==="ean"||lower==="upc"||lower==="isbn")&&product?.[lower])return [String(product[lower])];
 const values=(aspect?.aspectValues||[]).map((v:any)=>String(v?.localizedValue||"")).filter(Boolean);
 const hay=textHaystack(product);
 const match=values.find((v:string)=>hay.includes(v.toLowerCase()));
 return match?[match]:undefined;
}

export async function getEbayCategoryPreview(product:any){
 const marketplace=encodeURIComponent(ebayMarketplaceId());
 const tree=await ebayTaxonomy(`/commerce/taxonomy/v1/get_default_category_tree_id?marketplace_id=${marketplace}`);
 const treeId=String(tree?.categoryTreeId||"");
 if(!treeId)throw new Error("EBAY_CATEGORY_TREE_MISSING");
 const query=encodeURIComponent(String(product?.title||"").slice(0,350));
 const suggestions=await ebayTaxonomy(`/commerce/taxonomy/v1/category_tree/${encodeURIComponent(treeId)}/get_category_suggestions?q=${query}`);
 const top=suggestions?.categorySuggestions?.[0];
 const categoryId=String(top?.category?.categoryId||"");
 if(!categoryId)throw new Error("EBAY_CATEGORY_SUGGESTION_MISSING");
 const aspectsPayload=await ebayTaxonomy(`/commerce/taxonomy/v1/category_tree/${encodeURIComponent(treeId)}/get_item_aspects_for_category?category_id=${encodeURIComponent(categoryId)}`);
 const all=(aspectsPayload?.aspects||[]) as any[];
 const aspects:Record<string,string[]>={};
 const required:string[]=[];
 const missingRequired:string[]=[];
 for(const a of all){
  const name=String(a?.localizedAspectName||"").trim();
  if(!name)continue;
  const isRequired=a?.aspectConstraint?.aspectRequired===true;
  if(isRequired)required.push(name);
  const value=aspectValue(product,a);
  if(value?.length)aspects[name]=value;
  else if(isRequired)missingRequired.push(name);
 }
 return{
  categoryTreeId:treeId,
  categoryId,
  categoryName:String(top?.category?.categoryName||""),
  ancestors:(top?.categoryTreeNodeAncestors||[]).map((x:any)=>({id:String(x?.categoryId||""),name:String(x?.categoryName||"")})),
  aspects,
  requiredAspects:required,
  missingRequiredAspects:missingRequired,
  aspectCount:all.length
 };
}

export type PublishEbayProduct={
 sku:string;title:string;description:string;imageUrls:string[];quantity:number;price:number;currency?:string;
 categoryId:string;merchantLocationKey:string;fulfillmentPolicyId:string;paymentPolicyId:string;returnPolicyId:string;
 condition?:string;brand?:string;aspects?:Record<string,string[]>;mpn?:string;upc?:string[];
};

export async function publishEbayProduct(input:PublishEbayProduct){
 const sku=input.sku.trim().slice(0,50);
 if(!sku)throw new Error("EBAY_SKU_REQUIRED");
 if(!input.categoryId)throw new Error("EBAY_CATEGORY_REQUIRED");
 if(!input.merchantLocationKey||!input.fulfillmentPolicyId||!input.paymentPolicyId||!input.returnPolicyId)throw new Error("EBAY_POLICIES_REQUIRED");
 const product:any={title:input.title.trim().slice(0,80),description:input.description.trim().slice(0,4000),imageUrls:input.imageUrls.filter(Boolean).slice(0,12),aspects:input.aspects||{}};
 if(input.brand)product.brand=input.brand;
 if(input.mpn)product.mpn=input.mpn;
 if(input.upc?.length)product.upc=input.upc;
 await ebay(`/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,{method:"PUT",body:JSON.stringify({availability:{shipToLocationAvailability:{quantity:Math.max(0,Math.floor(input.quantity||0))}},condition:input.condition||"NEW",product})});
 const offer=await ebay("/sell/inventory/v1/offer",{method:"POST",body:JSON.stringify({
  sku,marketplaceId:ebayMarketplaceId(),format:"FIXED_PRICE",availableQuantity:Math.max(0,Math.floor(input.quantity||0)),
  categoryId:String(input.categoryId),merchantLocationKey:input.merchantLocationKey,listingDescription:input.description.trim().slice(0,4000),
  listingPolicies:{fulfillmentPolicyId:input.fulfillmentPolicyId,paymentPolicyId:input.paymentPolicyId,returnPolicyId:input.returnPolicyId},
  pricingSummary:{price:{currency:input.currency||"EUR",value:Number(input.price).toFixed(2)}}
 })});
 const offerId=offer?.offerId;
 if(!offerId)throw new Error("EBAY_OFFER_ID_MISSING");
 const published=await ebay(`/sell/inventory/v1/offer/${encodeURIComponent(offerId)}/publish`,{method:"POST"});
 return{sku,offerId,listingId:published?.listingId||null,status:"published"};
}
