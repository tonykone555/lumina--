import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const maxDuration=60;

export async function POST(req:NextRequest){
 try{
  const body=await req.json().catch(()=>({}));
  const raw=String(body?.imageUrl||"").trim();
  if(!raw)return NextResponse.json({error:"Missing product image"},{status:400});
  let url:URL;try{url=new URL(raw)}catch{return NextResponse.json({error:"Invalid product image"},{status:400})}
  if(!/^https?:$/.test(url.protocol))return NextResponse.json({error:"Unsupported product image"},{status:400});
  const imageResponse=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(12000),headers:{Accept:"image/*"}});
  if(!imageResponse.ok)return NextResponse.json({error:"Could not load product image"},{status:502});
  const type=(imageResponse.headers.get("content-type")||"image/jpeg").split(";")[0];
  if(!type.startsWith("image/"))return NextResponse.json({error:"Product media is not an image"},{status:400});
  const bytes=await imageResponse.arrayBuffer();
  if(bytes.byteLength>15*1024*1024)return NextResponse.json({error:"Image is too large"},{status:413});
  const form=new FormData();
  form.append("image",new File([bytes],"product-image",{type}));
  const scan=await fetch(new URL("/api/room/quick/analyze",req.nextUrl.origin),{method:"POST",body:form,cache:"no-store",signal:AbortSignal.timeout(50000)});
  const data=await scan.json().catch(()=>({error:"Could not analyze this product image"}));
  return NextResponse.json(data,{status:scan.status,headers:{"Cache-Control":"no-store","X-YNOT-Product-Scan":"room-scanner"}});
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:"Could not scan product image"},{status:502});
 }
}
