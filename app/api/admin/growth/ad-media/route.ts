import {NextRequest,NextResponse} from "next/server";
import {requireYnotAdmin,adminErrorStatus} from "@/lib/ynot/admin-server";

export const runtime="nodejs";
const BASE:Record<string,string>={meta:"facebook-ad-library",tiktok:"tiktok-ad-library",google:"google-ad-library",linkedin:"linkedin-ad-library"};

function mediaResponse(upstream:Response){
 const outHeaders=new Headers();
 for(const name of ["content-type","content-length","content-range","accept-ranges","etag","last-modified"]){const value=upstream.headers.get(name);if(value)outHeaders.set(name,value)}
 outHeaders.set("Cache-Control","private, max-age=300");
 return new NextResponse(upstream.body,{status:upstream.status,headers:outHeaders});
}

export async function GET(req:NextRequest){
 try{
  await requireYnotAdmin(req);
  const platform=String(req.nextUrl.searchParams.get("platform")||"").toLowerCase();
  const url=String(req.nextUrl.searchParams.get("url")||"");
  const base=BASE[platform];
  if(!base)return NextResponse.json({error:"PLATFORM_NOT_SUPPORTED"},{status:400});
  if(!/^https:\/\//i.test(url))return NextResponse.json({error:"MEDIA_URL_REQUIRED"},{status:400});

  const range=req.headers.get("range");
  const directHeaders:Record<string,string>={"User-Agent":"Mozilla/5.0 (compatible; YNOTMedia/1.0)",Accept:"image/avif,image/webp,image/*,video/*,*/*;q=0.8"};
  if(range)directHeaders.Range=range;
  try{
   const direct=await fetch(url,{headers:directHeaders,cache:"no-store",redirect:"follow",signal:AbortSignal.timeout(25000)});
   const ct=String(direct.headers.get("content-type")||"").toLowerCase();
   if(direct.ok&&(ct.startsWith("image/")||ct.startsWith("video/")))return mediaResponse(direct);
  }catch{}

  const key=String(process.env.FETCHLAYER_API_KEY||"").trim();
  if(!key)return NextResponse.json({error:"MEDIA_SOURCE_UNAVAILABLE",message:"Direct media failed and FetchLayer is not configured."},{status:502});
  const headers:Record<string,string>={Authorization:`Bearer ${key}`};
  if(range)headers.Range=range;
  const upstream=await fetch(`https://api.fetchlayer.dev/${base}/media?url=${encodeURIComponent(url)}`,{headers,cache:"no-store",signal:AbortSignal.timeout(120000)});
  if(!upstream.ok){const text=await upstream.text().catch(()=>"");return NextResponse.json({error:`FETCHLAYER_MEDIA_${upstream.status}`,message:text.slice(0,300)},{status:upstream.status})}
  return mediaResponse(upstream);
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"AD_MEDIA_PROXY_FAILED"},{status:adminErrorStatus(e)})}
}
