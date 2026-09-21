import {NextRequest,NextResponse} from "next/server";
import {authenticatedUser,ensureCreator,rest,shareUrl} from "@/lib/creators/earn";
import {creatorOfferFromMainSupplier} from "@/lib/commerce/sourcing";

export const runtime="nodejs";

export async function GET(req:NextRequest){
 try{const u=await authenticatedUser(req),c=await ensureCreator(u);const rows=await rest(`ynot_creator_products?creator_id=eq.${c.id}&status=eq.active&select=*&order=created_at.desc&limit=100`);return NextResponse.json({products:rows||[],storefront:`/c/${c.referral_code}`})}
 catch(e){const m=e instanceof Error?e.message:"CREATOR_PRODUCTS_FAILED";return NextResponse.json({error:m},{status:/SIGN_IN|SESSION/.test(m)?401:400})}
}
export async function POST(req:NextRequest){
 try{
  const u=await authenticatedUser(req),c=await ensureCreator(u),b=await req.json();
  const id=String(b.id||b.product_id||"").trim().slice(0,500),title=String(b.title||"").trim().slice(0,240),image=String(b.image||b.image_url||"").slice(0,1200),url=String(b.url||b.product_url||"").slice(0,1500);
  if(!id||!title||!image)return NextResponse.json({error:"PRODUCT_DETAILS_REQUIRED"},{status:400});
  const price=Number(b.price),defaultRate=Number(c.commission_rate||.05),explicitCreatorPayout=Number(b.creator_payout);
  const baseline=creatorOfferFromMainSupplier({
   title,
   brand:String(b.brand||"YNOT"),
   retailPrice:price,
   mainSupplierPrice:Number(b.supplierPrice),
   category:String(b.category||"")||undefined,
   currency:String(b.currency||"EUR").toUpperCase(),
   shipTo:"FR"
  });
  const creatorPayout=Number.isFinite(explicitCreatorPayout)&&explicitCreatorPayout>0?explicitCreatorPayout:Number(baseline?.creatorPayout||0);
  const hasCreatorPayout=Number.isFinite(creatorPayout)&&creatorPayout>0&&Number.isFinite(price)&&price>0,rate=hasCreatorPayout?Math.min(.9,creatorPayout/price):defaultRate,commissionCents=Number.isFinite(price)&&price>0?Math.round((hasCreatorPayout?creatorPayout:price*rate)*100):null;
  const sourcing=b.sourcing&&typeof b.sourcing==="object"?b.sourcing:null;
  const payload={creator_id:c.id,product_id:id,title,brand:String(b.brand||"YNOT").slice(0,160),image_url:image,product_url:url,price:Number.isFinite(price)?price:null,currency:String(b.currency||"EUR").toUpperCase().slice(0,5),category:String(b.category||"").slice(0,100)||null,commission_rate:rate,commission_cents:commissionCents,status:"active",metadata:{description:String(b.description||"").slice(0,1000),creator_payout:hasCreatorPayout?creatorPayout:null,baseline_supplier:"shopify",sourcing},updated_at:new Date().toISOString()};
  const rows=await rest("ynot_creator_products?on_conflict=creator_id,product_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify([payload])});
  return NextResponse.json({product:rows?.[0]||payload,share_url:shareUrl(id,c.referral_code)});
 }catch(e){const m=e instanceof Error?e.message:"PROMOTE_PRODUCT_FAILED";return NextResponse.json({error:m},{status:/SIGN_IN|SESSION/.test(m)?401:400})}
}
export async function DELETE(req:NextRequest){
 try{const u=await authenticatedUser(req),c=await ensureCreator(u),id=String(req.nextUrl.searchParams.get("id")||"").slice(0,500);if(!id)return NextResponse.json({error:"PRODUCT_ID_REQUIRED"},{status:400});await rest(`ynot_creator_products?creator_id=eq.${c.id}&product_id=eq.${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify({status:"inactive",updated_at:new Date().toISOString()})});return NextResponse.json({ok:true})}
 catch(e){const m=e instanceof Error?e.message:"REMOVE_PRODUCT_FAILED";return NextResponse.json({error:m},{status:/SIGN_IN|SESSION/.test(m)?401:400})}
}
