import {NextRequest,NextResponse} from "next/server";
import {requireYnotAdmin,adminErrorStatus} from "@/lib/ynot/admin-server";

export const runtime="nodejs";
const BASE:Record<string,string>={meta:"facebook-ad-library",tiktok:"tiktok-ad-library",google:"google-ad-library",linkedin:"linkedin-ad-library"};

export async function GET(req:NextRequest){
 try{
  await requireYnotAdmin(req);
  const platform=String(req.nextUrl.searchParams.get("platform")||"").toLowerCase();
  const url=String(req.nextUrl.searchParams.get("url")||"");
  const base=BASE[platform];
  if(!base)return NextResponse.json({error:"PLATFORM_NOT_SUPPORTED"},{status:400});
  if(!/^https:\/\//i.test(url))return NextResponse.json({error:"MEDIA_URL_REQUIRED"},{status:400});
  const key=String(process.env.FETCHLAYER_API_KEY||"").trim();
  if(!key)return NextResponse.json({error:"FETCHLAYER_NOT_CONFIGURED"},{status:503});
  const headers:Record<string,string>={Authorization:`Bearer ${key}`};
  const range=req.headers.get("range");if(range)headers.Range=range;
  const upstream=await fetch(`https://api.fetchlayer.dev/${base}/media?url=${encodeURIComponent(url)}`,{headers,cache:"no-store",signal:AbortSignal.timeout(120000)});
  if(!upstream.ok){const text=await upstream.text().catch(()=>"");return NextResponse.json({error:`FETCHLAYER_MEDIA_${upstream.status}`,message:text.slice(0,300)},{status:upstream.status})}
  const outHeaders=new Headers();
  for(const name of ["content-type","content-length","content-range","accept-ranges","etag","last-modified"]){const value=upstream.headers.get(name);if(value)outHeaders.set(name,value)}
  outHeaders.set("Cache-Control","private, max-age=300");
  return new NextResponse(upstream.body,{status:upstream.status,headers:outHeaders});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"AD_MEDIA_PROXY_FAILED"},{status:adminErrorStatus(e)})}
}
