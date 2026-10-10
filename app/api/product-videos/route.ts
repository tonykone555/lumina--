import {NextRequest,NextResponse} from "next/server";
import {searchTikTokVideos} from "@/lib/intelligence/fetchlayer-social";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type Video={
 id:string;
 url:string;
 embedUrl:string;
 caption:string;
 username:string;
 thumbnail?:string;
 views?:number|null;
 likes?:number|null;
 shares?:number|null;
 source:"tiktok";
};

function str(...values:any[]){
 for(const v of values)if(typeof v==="string"&&v.trim())return v.trim();
 return "";
}
function num(...values:any[]){
 for(const v of values){const n=Number(v);if(Number.isFinite(n))return n}
 return null;
}
function videoId(row:any){
 const raw=str(row?.video_id,row?.videoId,row?.id,row?.item_id,row?.aweme_id,row?.awemeId);
 if(/^\d+$/.test(raw))return raw;
 const url=str(row?.url,row?.web_url,row?.share_url,row?.video_url,row?.videoUrl);
 return url.match(/\/video\/(\d+)/)?.[1]||"";
}
function username(row:any){
 return str(row?.author?.unique_id,row?.author?.uniqueId,row?.author?.username,row?.username,row?.author_name,row?.authorName).replace(/^@/,"");
}
function rows(data:any){
 const candidates=[
  data?.videos,data?.items,data?.results,data?.data?.videos,data?.data?.items,data?.data?.results,data?.data
 ];
 for(const x of candidates)if(Array.isArray(x))return x;
 return Array.isArray(data)?data:[];
}
function normalize(row:any):Video|null{
 const id=videoId(row);
 if(!id)return null;
 const user=username(row);
 const direct=str(row?.url,row?.web_url,row?.share_url)||`https://www.tiktok.com/@${user||"_"}/video/${id}`;
 const caption=str(row?.caption,row?.desc,row?.description,row?.text).slice(0,240);
 const thumb=str(row?.thumbnail,row?.cover,row?.cover_url,row?.coverUrl,row?.image,row?.video?.cover,row?.video?.dynamic_cover);
 return{
  id,
  url:direct,
  embedUrl:`https://www.tiktok.com/player/v1/${id}?autoplay=0&loop=0&controls=1&progress_bar=1&play_button=1&volume_control=1&fullscreen_button=1&timestamp=1&music_info=1&description=1&rel=0&native_context_menu=0`,
  caption,
  username:user,
  thumbnail:thumb||undefined,
  views:num(row?.views,row?.view_count,row?.viewCount,row?.stats?.playCount,row?.stats?.views),
  likes:num(row?.likes,row?.like_count,row?.likeCount,row?.stats?.diggCount),
  shares:num(row?.shares,row?.share_count,row?.shareCount,row?.stats?.shareCount),
  source:"tiktok"
 };
}
function queryFrom(req:NextRequest){
 const s=req.nextUrl.searchParams;
 const title=str(s.get("title")).slice(0,180);
 const brand=str(s.get("brand")).slice(0,80);
 const tags=str(s.get("tags")).slice(0,140);
 const raw=[brand,title,tags].filter(Boolean).join(" ");
 return raw.replace(/\b(buy|shop|sale|discount|cheap|best price|free shipping)\b/gi," ").replace(/\s+/g," ").trim().slice(0,220);
}

export async function GET(req:NextRequest){
 const query=queryFrom(req);
 if(!query)return NextResponse.json({query,videos:[]});
 try{
  const data=await searchTikTokVideos(query,1,18);
  const seen=new Set<string>();
  const videos=rows(data).map(normalize).filter((v):v is Video=>Boolean(v&&v.id&&!seen.has(v.id)&&(seen.add(v.id),true))).slice(0,12);
  return NextResponse.json({query,videos},{headers:{"Cache-Control":"s-maxage=900, stale-while-revalidate=3600"}});
 }catch(error){
  const message=error instanceof Error?error.message:"VIDEO_SEARCH_FAILED";
  console.error("Product video search failed",{query,message});
  return NextResponse.json({query,videos:[],error:message},{status:200,headers:{"Cache-Control":"s-maxage=60, stale-while-revalidate=300"}});
 }
}
