import {saveGrokProduct,readGrokProduct} from "@/lib/grok/product-queue";
import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 try{
  const body=await request.json();
  const p=body?.product;
  if(!p||typeof p.id!=="string"||typeof p.title!=="string"||p.id.length>200||p.title.length>500) return NextResponse.json({error:"INVALID_PRODUCT"},{status:400});
  const product={id:p.id,title:p.title,brand:String(p.brand||"").slice(0,300),original_brand:String(p.original_brand||p.brand||"").slice(0,300),maker:String(p.maker||p.manufacturer||"").slice(0,300)||null,supplier:String(p.supplier||p.merchant_name||"").slice(0,300)||null,price:typeof p.price==="number"?p.price:null,currency:String(p.currency||"EUR").slice(0,5),image:String(p.image||"").slice(0,2000),images:Array.isArray(p.images)?p.images.slice(0,12).filter((v:unknown)=>typeof v==="string").map((v:string)=>v.slice(0,2000)):[],url:String(p.url||"").slice(0,2000),source_url:String(p.source_url||p.merchant_url||p.url||"").slice(0,2000),source:String(p.source||"").slice(0,80)};
  const row=await saveGrokProduct(product);return NextResponse.json({queued:true,id:row.id,status:row.status});
 }catch{return NextResponse.json({error:"QUEUE_REQUEST_FAILED"},{status:500})}
}

export async function GET(request:NextRequest){
 const id=new URL(request.url).searchParams.get("productId");
 if(!id||id.length>200)return NextResponse.json({error:"PRODUCT_ID_REQUIRED"},{status:400});
 try{const row=await readGrokProduct(id);return NextResponse.json({found:!!row,status:row?.status||"not_sent",createdAt:row?.created_at||null,updatedAt:row?.updated_at||null,review:row?.review||null})}
 catch{return NextResponse.json({error:"QUEUE_READ_FAILED"},{status:503})}
}
