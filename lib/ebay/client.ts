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

function norm(value:any){
 return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}
function textHaystack(product:any,queryHint=""){
 return [queryHint,product?.title,product?.brand,typeof product?.description==="string"?product.description:"",...(Array.isArray(product?.tags)?product.tags:[])].filter(Boolean).join(" ").toLowerCase();
}
function allowedValues(aspect:any){
 return (aspect?.aspectValues||[]).map((v:any)=>String(v?.localizedValue||"").trim()).filter(Boolean);
}
function safeAllowedMatch(values:string[],hay:string){
 const nh=norm(hay);
 const candidates=values.filter(v=>{
  const nv=norm(v);
  if(!nv||nv.length<3||/^\d+$/.test(nv))return false;
  return nh.split(" ").includes(nv)||nh.includes(` ${nv} `)||nh.startsWith(`${nv} `)||nh.endsWith(` ${nv}`);
 });
 return candidates.sort((a,b)=>b.length-a.length)[0];
}
function semanticType(values:string[],hay:string){
 const h=norm(hay);
 const groups=[
  {re:/\b(sofa|couch|canape|sitzer|settee)\b/,want:/\b(canape|sofa)\b/i},
  {re:/\b(armchair|fauteuil|sessel)\b/,want:/\b(fauteuil|armchair)\b/i},
  {re:/\b(pouf|ottoman|poire)\b/,want:/\b(pouf|poire|ottoman)\b/i},
  {re:/\b(coffee table|table basse|couchtisch)\b/,want:/\b(table basse|coffee table)\b/i},
  {re:/\b(dining table|table a manger|esstisch)\b/,want:/\b(table a manger|dining table)\b/i},
  {re:/\b(dress|robe|kleid)\b/,want:/\b(robe|dress)\b/i},
  {re:/\b(necklace|collier|halskette)\b/,want:/\b(collier|necklace)\b/i}
 ];
 for(const g of groups){
  if(g.re.test(h)){
   const m=values.find(v=>g.want.test(norm(v)));
   if(m)return m;
  }
 }
 return undefined;
}
function aspectValue(product:any,aspect:any,queryHint=""){
 const name=String(aspect?.localizedAspectName||"");
 const lower=norm(name);
 const values=allowedValues(aspect);
 const hay=textHaystack(product,queryHint);
 if(["brand","marque","marke"].includes(lower)&&product?.brand)return [String(product.brand)];
 if((lower==="mpn"||lower.includes("manufacturer part")||lower.includes("reference fabricant"))&&product?.mpn)return [String(product.mpn)];
 if((lower==="ean"||lower==="upc"||lower==="isbn")&&product?.[lower])return [String(product[lower])];
 if(["type","type de produit","type de meuble"].includes(lower)){
  const semantic=semanticType(values,hay);
  if(semantic)return [semantic];
 }
 const exact=safeAllowedMatch(values,hay);
 return exact?[exact]:undefined;
}

function canonicalCategoryQueries(queryHint:string,product:any){
 const h=norm([queryHint,product?.title].filter(Boolean).join(" "));
 if(/\b(sofa|couch|canape|sitzer|settee)\b/.test(h))return ["sofa","canape","canapé",String(product?.title||"")];
 if(/\b(armchair|fauteuil|sessel)\b/.test(h))return ["fauteuil","armchair",String(product?.title||"")];
 if(/\b(coffee table|table basse|couchtisch)\b/.test(h))return ["table basse","coffee table",String(product?.title||"")];
 if(/\b(dining table|table a manger|esstisch)\b/.test(h))return ["table à manger","dining table",String(product?.title||"")];
 if(/\b(dress|robe|kleid)\b/.test(h))return ["robe","dress",String(product?.title||"")];
 if(/\b(necklace|collier|halskette)\b/.test(h))return ["collier","necklace",String(product?.title||"")];
 return [String(queryHint||product?.title||"").trim().slice(0,350),String(product?.title||"")].filter(Boolean);
}
function categoryPath(s:any){
 const ancestors=(s?.categoryTreeNodeAncestors||[]).map((x:any)=>String(x?.categoryName||""));
 return [...ancestors,String(s?.category?.categoryName||"")].filter(Boolean);
}
function categoryDomainOk(s:any,queryHint:string,product:any){
 const h=norm([queryHint,product?.title].filter(Boolean).join(" "));
 const path=norm(categoryPath(s).join(" "));
 if(/\b(sofa|couch|canape|sitzer|settee|armchair|fauteuil|sessel|coffee table|table basse|couchtisch|dining table|table a manger|esstisch)\b/.test(h))
  return /\b(meubles|furniture|maison|home)\b/.test(path)&&!/\b(musique|music|cd|vinyle|barbecue)\b/.test(path);
 if(/\b(dress|robe|kleid)\b/.test(h))return /\b(vetement|mode|clothing|fashion|robe|dress)\b/.test(path);
 if(/\b(necklace|collier|halskette)\b/.test(h))return /\b(bijou|jewel|collier|necklace)\b/.test(path);
 return true;
}
function scoreCategorySuggestion(s:any,queryHint:string,product:any){
 const name=norm(s?.category?.categoryName||"");
 const path=norm(categoryPath(s).join(" "));
 const h=norm([queryHint,product?.title].filter(Boolean).join(" "));
 let score=categoryDomainOk(s,queryHint,product)?50:-500;
 for(const w of norm(queryHint).split(" ").filter((x:string)=>x.length>2)){
  if(name.includes(w))score+=30;
  if(path.includes(w))score+=10;
 }
 if(/\b(sofa|couch|canape|sitzer|settee)\b/.test(h)){
  if(/canape|sofa/.test(name))score+=180;
  if(/canape|sofa/.test(path))score+=80;
  if(/pouf|poire|gonflable|sacco/.test(name))score-=250;
 }
 if(/\b(armchair|fauteuil|sessel)\b/.test(h)){
  if(/fauteuil|armchair/.test(name))score+=180;
  if(/pouf|poire|gonflable/.test(name))score-=200;
 }
 return score;
}

export async function getEbayCategoryPreview(product:any,queryHint=""){
 const marketplace=encodeURIComponent(ebayMarketplaceId());
 const tree=await ebayTaxonomy(`/commerce/taxonomy/v1/get_default_category_tree_id?marketplace_id=${marketplace}`);
 const treeId=String(tree?.categoryTreeId||"");
 if(!treeId)throw new Error("EBAY_CATEGORY_TREE_MISSING");
 const queries=[...new Set(canonicalCategoryQueries(queryHint,product).map(q=>String(q||"").trim()).filter(Boolean))].slice(0,4);
 const responses=await Promise.all(queries.map(async q=>{
  const payload=await ebayTaxonomy(`/commerce/taxonomy/v1/category_tree/${encodeURIComponent(treeId)}/get_category_suggestions?q=${encodeURIComponent(q.slice(0,350))}`);
  return (payload?.categorySuggestions||[]).map((s:any)=>({...s,_query:q}));
 }));
 const seen=new Set<string>();
 const allSuggestions=responses.flat().filter((s:any)=>{
  const id=String(s?.category?.categoryId||"");
  if(!id||seen.has(id))return false;
  seen.add(id);return true;
 });
 const ranked=[...allSuggestions].sort((a,b)=>scoreCategorySuggestion(b,queryHint,product)-scoreCategorySuggestion(a,queryHint,product));
 const top=ranked[0];
 const categoryId=String(top?.category?.categoryId||"");
 if(!categoryId)throw new Error("EBAY_CATEGORY_SUGGESTION_MISSING");
 const domainOk=categoryDomainOk(top,queryHint,product);
 const aspectsPayload=await ebayTaxonomy(`/commerce/taxonomy/v1/category_tree/${encodeURIComponent(treeId)}/get_item_aspects_for_category?category_id=${encodeURIComponent(categoryId)}`);
 const all=(aspectsPayload?.aspects||[]) as any[];
 const aspects:Record<string,string[]>={};
 const required:string[]=[];
 const missingRequired:string[]=[];
 for(const a of all){
  const name=String(a?.localizedAspectName||"").trim();
  if(!name)continue;
  const isRequired=a?.aspectConstraint?.aspectRequired===true;
  const isBrand=["brand","marque","marke"].includes(norm(name));
  if(isRequired)required.push(name);
  if(!isRequired&&!isBrand)continue;
  const value=aspectValue(product,a,String(top?._query||queryHint));
  if(value?.length)aspects[name]=value;
  else if(isRequired)missingRequired.push(name);
 }
 return{
  categoryTreeId:treeId,
  categoryQuery:String(top?._query||queries[0]||""),
  categoryId,
  categoryName:String(top?.category?.categoryName||""),
  categoryDomainOk:domainOk,
  alternatives:ranked.slice(1,6).map((s:any)=>({id:String(s?.category?.categoryId||""),name:String(s?.category?.categoryName||""),query:String(s?._query||""),domainOk:categoryDomainOk(s,queryHint,product),path:categoryPath(s)})),
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
