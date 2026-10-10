import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 const raw=req.nextUrl.searchParams.get("url")||"";
 let target:URL;
 try{target=new URL(raw)}catch{return new NextResponse(null,{status:400})}
 if(target.protocol!=="https:"||target.hostname!=="cdn.shopify.com"||!target.pathname.startsWith("/s/files/"))return new NextResponse(null,{status:403});
 try{
  const upstream=await fetch(target.toString(),{signal:AbortSignal.timeout(9000),next:{revalidate:86400}});
  if(!upstream.ok)return new NextResponse(null,{status:upstream.status});
  const type=upstream.headers.get("content-type")||"";
  if(!type.startsWith("image/"))return new NextResponse(null,{status:415});
  const size=Number(upstream.headers.get("content-length")||0);
  if(size>4_000_000)return new NextResponse(null,{status:413});
  const bytes=await upstream.arrayBuffer();
  if(bytes.byteLength>4_000_000)return new NextResponse(null,{status:413});
  return new NextResponse(bytes,{headers:{"Content-Type":type,"Cache-Control":"public, s-maxage=86400, stale-while-revalidate=604800","X-Content-Type-Options":"nosniff"}});
 }catch{return new NextResponse(null,{status:502})}
}