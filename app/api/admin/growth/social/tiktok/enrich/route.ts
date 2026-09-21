import {NextRequest,NextResponse} from "next/server";
import {requireYnotAdmin,adminErrorStatus} from "@/lib/ynot/admin-server";
import {getTikTokProfile,getTikTokVideos} from "@/lib/intelligence/fetchlayer-social";
import {enrichHostContact} from "@/lib/intelligence/fetchlayer-contacts";
export const runtime="nodejs";
function n(v:any){const x=Number(v);return Number.isFinite(x)?x:0}
export async function POST(req:NextRequest){
 try{await requireYnotAdmin(req);const b=await req.json(),username=String(b.username||"").trim();if(!username)return NextResponse.json({error:"USERNAME_REQUIRED"},{status:400});
 const [p,v]=await Promise.all([getTikTokProfile(username),getTikTokVideos(username,1,30,"latest")]);
 const profile=p?.profile||p?.user||p||{},videos=Array.isArray(v?.videos)?v.videos:[];
 const links=[profile?.bioLink?.url,profile?.bioLink,profile?.website,profile?.url].filter((x:any)=>typeof x==="string"&&/^https?:\/\//.test(x));
 const stats=profile?.stats||{};const followers=n(stats?.followerCount??profile?.followerCount);
 const plays=videos.reduce((a:number,x:any)=>a+n(x?.stats?.viewCount??x?.stats?.playCount??x?.viewCount??x?.playCount),0);
 const likes=videos.reduce((a:number,x:any)=>a+n(x?.stats?.likeCount??x?.likeCount),0);
 const comments=videos.reduce((a:number,x:any)=>a+n(x?.stats?.commentCount??x?.commentCount),0);
 let contact:any=null;try{contact=await enrichHostContact({hostName:String(profile?.displayName||profile?.nickname||profile?.username||username),companyHint:String(profile?.biography||profile?.bio||profile?.signature||"").slice(0,160),knownTargets:links.slice(0,5)})}catch{}
 return NextResponse.json({profile:{username:String(profile?.username||profile?.uniqueId||username).replace(/^@/,""),displayName:String(profile?.displayName||profile?.nickname||profile?.fullName||username),bio:String(profile?.biography||profile?.bio||profile?.signature||""),profileUrl:String(profile?.url||profile?.profileUrl||("https://www.tiktok.com/@"+String(username).replace(/^@/,""))),avatar:String(profile?.avatarUrl||profile?.avatar||profile?.profilePicUrl||""),verified:Boolean(profile?.verified),region:profile?.region||null,followers,following:n(stats?.followingCount??profile?.followingCount),likes:n(stats?.heartCount??stats?.likeCount??profile?.likes),videos:n(stats?.videoCount??videos.length),bioLinks:links},recentVideos:videos.slice(0,12),metrics:{sampleVideos:videos.length,totalViews:plays,totalLikes:likes,totalComments:comments,avgViews:videos.length?Math.round(plays/videos.length):0,avgEngagement:videos.length?Math.round((likes+comments)/videos.length):0},contact,notes:[...(Array.isArray(p?.notes)?p.notes:[]),...(Array.isArray(v?.notes)?v.notes:[])]});
 }catch(e){const m=e instanceof Error?e.message:"TIKTOK_ENRICH_FAILED";return NextResponse.json({error:m},{status:/FETCHLAYER_NOT_CONFIGURED/.test(m)?503:adminErrorStatus(e)});}}