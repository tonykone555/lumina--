import {NextRequest,NextResponse} from "next/server";
import {persistCandidate,type SellableCandidate} from "@/lib/commerce/sellable-catalog";
export const runtime="nodejs";

function authorized(req:NextRequest){const secret=process.env.YNOT_OPERATOR_SECRET;return Boolean(secret&&req.headers.get("authorization")===`Bearer ${secret}`)}

export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:"UNAUTHORIZED"},{status:401});
 try{
  const body=await req.json() as {product?:SellableCandidate;products?:SellableCandidate[]};
  const products=body.products??(body.product?[body.product]:[]);if(!products.length)return NextResponse.json({error:"PRODUCT_REQUIRED"},{status:400});
  if(products.length>50)return NextResponse.json({error:"BATCH_TOO_LARGE"},{status:400});
  const results=[];for(const product of products){try{results.push({ok:true,...await persistCandidate(product)})}catch(e){results.push({ok:false,id:product?.id,error:e instanceof Error?e.message:"RESEARCH_FAILED"})}}
  return NextResponse.json({ok:results.some(x=>x.ok),count:results.length,results});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"INVALID_REQUEST"},{status:400})}
}
