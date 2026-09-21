import {NextRequest,NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/creators/earn";
import {researchNicheOpportunity,scoreCatalogueProduct,type OpportunityProduct} from "@/lib/intelligence/opportunities";

export const runtime="nodejs";

export async function POST(req:NextRequest){
 try{
  await authenticatedUser(req);
  const b=await req.json();
  const niche=String(b.niche||b.query||"").trim().slice(0,160);
  const country=String(b.country||"FR").toUpperCase().slice(0,2);
  const products:Array<OpportunityProduct>=Array.isArray(b.products)?b.products.slice(0,80).map((p:any)=>({
   id:String(p.id||"").slice(0,500),
   title:String(p.title||"").slice(0,240),
   brand:String(p.brand||"").slice(0,160)||undefined,
   description:String(p.description||"").slice(0,1200)||undefined,
   category:String(p.category||"").slice(0,100)||undefined,
   price:Number.isFinite(Number(p.price))?Number(p.price):null,
   supplierPrice:Number.isFinite(Number(p.supplierPrice))?Number(p.supplierPrice):null,
   currency:String(p.currency||"EUR").toUpperCase().slice(0,5),
   image:String(p.image||"").slice(0,1200)||undefined,
   url:String(p.url||"").slice(0,1500)||undefined
  })).filter((p:any)=>p.id&&p.title):[];
  if(!niche)return NextResponse.json({error:"NICHE_REQUIRED"},{status:400});
  const signal=await researchNicheOpportunity(niche,country);
  const opportunities=products.map(p=>scoreCatalogueProduct(p,signal)).sort((a,b)=>b.opportunityScore-a.opportunityScore);
  const publicSignal={...signal,ads:undefined};
  return NextResponse.json({signal:publicSignal,opportunities});
 }catch(e){
  const m=e instanceof Error?e.message:"OPPORTUNITY_RESEARCH_FAILED";
  return NextResponse.json({error:m},{status:/SIGN_IN|SESSION/.test(m)?401:/FETCHLAYER_NOT_CONFIGURED/.test(m)?503:400});
 }
}
