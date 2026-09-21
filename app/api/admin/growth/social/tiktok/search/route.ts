import {NextRequest,NextResponse} from "next/server";
import {requireYnotAdmin,adminErrorStatus} from "@/lib/ynot/admin-server";
import {searchTikTokVideos} from "@/lib/intelligence/fetchlayer-social";

export const runtime="nodejs";

function n(v:any){const x=Number(v);return Number.isFinite(x)?x:0}
function authorOf(v:any){return v?.author||v?.creator||v?.user||{}}
function usernameOf(a:any,v:any){
 const raw=String(a?.username||a?.uniqueId||a?.handle||v?.username||"").replace(/^@/,"").trim();
 if(raw)return raw;
 const m=String(v?.url||"").match(/tiktok\.com\/@([^/]+)/i);return m?.[1]||"";
}
function classify(text:string,mode:string){
 const t=text.toLowerCase();
 const signals={creator:/creator|influencer|ugc|review|haul|unboxing|affiliate|content/.test(t),brand:/shop|store|brand|official|founder|ceo|skincare|activewear|fashion|beauty|product/.test(t),property:/airbnb|villa|vacation rental|property manager|holiday rental|real estate|apartment|penthouse/.test(t)};
 if(mode==="creator")return signals.creator?18:0;if(mode==="brand")return signals.brand?18:0;if(mode==="property")return signals.property?22:0;return Math.max(signals.creator?12:0,signals.brand?12:0,signals.property?14:0);
}
function prospectScore(x:any,mode:string){
 const followers=n(x.followers),views=n(x.totalViews),videos=n(x.videoCount),recent=n(x.recentVideos);
 let s=15+classify((x.bio||"")+" "+(x.sampleText||""),mode);
 s+=followers>=100000?24:followers>=25000?19:followers>=5000?13:followers>=1000?8:3;
 s+=views>=1000000?20:views>=250000?16:views>=50000?11:views>=10000?6:2;
 s+=videos>=4?8:videos>=2?5:2;s+=recent>=2?8:recent?4:0;
 return Math.min(100,Math.round(s));
}

export async function POST(req:NextRequest){
 try{
  await requireYnotAdmin(req);const b=await req.json();
  const query=String(b.query||"").trim().slice(0,160),mode=String(b.mode||"all").toLowerCase();
  if(!query)return NextResponse.json({error:"QUERY_REQUIRED"},{status:400});
  const raw=await searchTikTokVideos(query,Math.max(1,Math.min(3,Number(b.pages)||1)),Math.max(10,Math.min(90,Number(b.limit)||45)));
  const videos=Array.isArray(raw?.videos)?raw.videos:[];
  const map=new Map<string,any>();
  for(const v of videos){
   const a=authorOf(v),username=usernameOf(a,v);if(!username)continue;
   const key=username.toLowerCase(),created=v?.createdAt?Date.parse(v.createdAt):0,days=created?Math.max(0,(Date.now()-created)/86400000):9999;
   const stats=v?.stats||v?.statistics||{};const views=n(stats?.viewCount??stats?.playCount??v?.viewCount??v?.playCount);
   const likes=n(stats?.likeCount??v?.likeCount),comments=n(stats?.commentCount??v?.commentCount);
   const cur=map.get(key)||{username,displayName:String(a?.displayName||a?.nickname||a?.fullName||username),avatar:String(a?.avatarUrl||a?.avatar||a?.profilePicUrl||""),profileUrl:String(a?.url||a?.profileUrl||("https://www.tiktok.com/@"+username)),bio:String(a?.bio||a?.signature||""),followers:n(a?.stats?.followerCount??a?.followerCount),verified:Boolean(a?.verified),videoCount:0,totalViews:0,totalLikes:0,totalComments:0,recentVideos:0,sampleVideos:[],sampleText:""};
   cur.videoCount++;cur.totalViews+=views;cur.totalLikes+=likes;cur.totalComments+=comments;if(days<=30)cur.recentVideos++;
   if(cur.sampleVideos.length<4)cur.sampleVideos.push({id:String(v?.id||""),url:String(v?.url||""),description:String(v?.description||""),createdAt:v?.createdAt||null,coverUrl:String(v?.coverUrl||""),views,likes,comments});
   if(!cur.sampleText)cur.sampleText=String(v?.description||"");map.set(key,cur);
  }
  let prospects=[...map.values()].map(x=>({...x,avgViews:x.videoCount?Math.round(x.totalViews/x.videoCount):0,avgEngagement:x.videoCount?Math.round((x.totalLikes+x.totalComments)/x.videoCount):0,prospectScore:prospectScore(x,mode)}));
  prospects.sort((a,b)=>b.prospectScore-a.prospectScore||b.totalViews-a.totalViews);
  return NextResponse.json({query,mode,prospects,videoCount:videos.length,pagesFetched:raw?.pagesFetched||null,notes:Array.isArray(raw?.notes)?raw.notes:[]});
 }catch(e){const m=e instanceof Error?e.message:"TIKTOK_PROSPECT_SEARCH_FAILED";return NextResponse.json({error:m},{status:/FETCHLAYER_NOT_CONFIGURED/.test(m)?503:adminErrorStatus(e)});}
}