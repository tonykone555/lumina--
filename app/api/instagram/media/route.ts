import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
const ALLOWED=["cdninstagram.com","fbcdn.net","instagram.com"];
function allowed(host:string){const h=host.toLowerCase();return ALLOWED.some(d=>h===d||h.endsWith("."+d))}

export async function GET(req:NextRequest){
 const raw=req.nextUrl.searchParams.get("url");if(!raw)return new NextResponse(null,{status:400});
 try{
  const url=new URL(raw);if(url.protocol!=="https:"||!allowed(url.hostname))return new NextResponse(null,{status:403});
  const upstream=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0","Accept":"image/avif,image/webp,image/apng,image/*,*/*;q=0.8"},cache:"no-store",signal:AbortSignal.timeout(12000)});
  if(!upstream.ok||!upstream.body)return new NextResponse(null,{status:upstream.status||502});
  return new NextResponse(upstream.body,{headers:{"Content-Type":upstream.headers.get("content-type")||"image/jpeg","Cache-Control":"public, max-age=1800, stale-while-revalidate=86400"}});
 }catch{return new NextResponse(null,{status:400})}
}
