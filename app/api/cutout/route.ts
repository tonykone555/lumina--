import { NextRequest,NextResponse } from "next/server";
export const runtime="nodejs";

export async function GET(req:NextRequest){
 const src=req.nextUrl.searchParams.get("src")||"";
 try{const parsed=new URL(src);if(!/^https?:$/.test(parsed.protocol))throw new Error("invalid source")}catch{return NextResponse.json({error:"Invalid image source"},{status:400})}
 const key=process.env.YNOT_REMOVE_BG_API_KEY;
 if(!key)return NextResponse.redirect(src,307);
 try{
  const body=new URLSearchParams({image_url:src,size:"auto",format:"png"});
  const response=await fetch("https://api.remove.bg/v1.0/removebg",{method:"POST",headers:{"X-Api-Key":key,"Content-Type":"application/x-www-form-urlencoded"},body:body.toString(),signal:AbortSignal.timeout(15000),cache:"no-store"});
  if(!response.ok)return NextResponse.redirect(src,307);
  const bytes=await response.arrayBuffer();
  return new NextResponse(bytes,{status:200,headers:{"Content-Type":"image/png","Cache-Control":"public, s-maxage=604800, stale-while-revalidate=2592000"}})
 }catch{return NextResponse.redirect(src,307)}
}