import { NextRequest,NextResponse } from "next/server";
export const runtime="nodejs";

const MAX_SOURCE_BYTES=12*1024*1024;

function safeServiceUrl(value:string){
 try{const url=new URL(value);if(!/^https?:$/.test(url.protocol))return null;return url}catch{return null}
}

export async function GET(req:NextRequest){
 const src=req.nextUrl.searchParams.get("src")||"";
 try{const parsed=new URL(src);if(!/^https?:$/.test(parsed.protocol))throw new Error("invalid source")}catch{return NextResponse.json({error:"Invalid image source"},{status:400})}

 try{
  const source=await fetch(src,{signal:AbortSignal.timeout(9000),cache:"force-cache",headers:{Accept:"image/*"}});
  if(!source.ok)return NextResponse.json({error:"Image unavailable"},{status:502});
  const type=(source.headers.get("content-type")||"").toLowerCase();
  if(type&&!type.startsWith("image/"))return NextResponse.json({error:"Invalid image response"},{status:502});
  const declared=Number(source.headers.get("content-length")||0);
  if(declared>MAX_SOURCE_BYTES)return NextResponse.json({error:"Image too large"},{status:413});
  const bytes=await source.arrayBuffer();
  if(!bytes.byteLength||bytes.byteLength>MAX_SOURCE_BYTES)return NextResponse.json({error:"Invalid image size"},{status:413});

  const service=safeServiceUrl(process.env.REMBG_SERVICE_URL||"");
  if(!service)return new NextResponse(bytes,{status:200,headers:{
   "Content-Type":type||"image/jpeg",
   "Cache-Control":"public, s-maxage=604800, stale-while-revalidate=2592000",
   "Access-Control-Allow-Origin":"*"
  }});

  const body=new FormData();
  body.append("file",new Blob([bytes],{type:type||"image/jpeg"}),"product-image");
  const endpoint=new URL("/remove",service).toString();
  const response=await fetch(endpoint,{method:"POST",body,signal:AbortSignal.timeout(28000),cache:"no-store"});
  if(!response.ok)return new NextResponse(bytes,{status:200,headers:{"Content-Type":type||"image/jpeg","Cache-Control":"public, s-maxage=604800, stale-while-revalidate=2592000","Access-Control-Allow-Origin":"*"}});
  const result=await response.arrayBuffer();
  if(!result.byteLength)return new NextResponse(bytes,{status:200,headers:{"Content-Type":type||"image/jpeg","Cache-Control":"public, s-maxage=604800, stale-while-revalidate=2592000","Access-Control-Allow-Origin":"*"}});

  return new NextResponse(result,{status:200,headers:{
   "Content-Type":"image/png",
   "Cache-Control":"public, s-maxage=604800, stale-while-revalidate=2592000"
  }});
 }catch{return NextResponse.json({error:"Image processing unavailable"},{status:502})}
}
