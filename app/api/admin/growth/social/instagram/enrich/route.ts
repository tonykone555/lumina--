import {NextRequest,NextResponse} from "next/server";
import {requireYnotAdmin,adminErrorStatus} from "@/lib/ynot/admin-server";
import {getInstagramProfile,getInstagramReels} from "@/lib/intelligence/fetchlayer-social";
import {enrichHostContact} from "@/lib/intelligence/fetchlayer-contacts";
export const runtime="nodejs";
function n(v:any){const x=Number(v);return Number.isFinite(x)?x:0}
export async function POST(req:NextRequest){
 try{await requireYnotAdmin(req);const b=await req.json(),username=String(b.username||"").trim();if(!username)return NextResponse.json({error:"USERNAME_REQUIRED"},{status:400});
 const [p,r]=await Promise.all([getInstagramProfile(username),getInstagramReels(username,1,12).catch(()=>({posts:[],notes:[]}))]);const profile=p?.profile||p||{},reels=Array.isArray(r?.posts)?r.posts:[];
 const bioLinks=(Array.isArray(profile?.bioLinks)?profile.bioLinks:[]).map((x:any)=>typeof x==="string"?x:x?.url).filter((x:any)=>typeof x==="string"&&/^https?:\/\//.test(x));
 const plays=reels.reduce((a:number,x:any)=>a+n(x?.playCount),0),likes=reels.reduce((a:number,x:any)=>a+n(x?.likeCount),0),comments=reels.reduce((a:number,x:any)=>a+n(x?.commentCount),0);
 let contact:any=null;try{contact=await enrichHostContact({hostName:String(profile?.fullName||profile?.username||username),companyHint:String(profile?.biography||"").slice(0,160),knownTargets:bioLinks.slice(0,5)})}catch{}
 return NextResponse.json({profile:{username:String(profile?.username||username).replace(/^@/,""),displayName:String(profile?.fullName||profile?.username||username),bio:String(profile?.biography||""),profileUrl:String(profile?.url||("https://www.instagram.com/"+String(username).replace(/^@/,"")+"/")),avatar:String(profile?.profilePicUrl||""),verified:Boolean(profile?.verified),privateAccount:Boolean(profile?.privateAccount),followers:n(profile?.stats?.followerCount),following:n(profile?.stats?.followingCount),bioLinks,highlights:Array.isArray(profile?.highlights)?profile.highlights:[]},reels:reels.slice(0,12),metrics:{sampleReels:reels.length,totalViews:plays,totalLikes:likes,totalComments:comments,avgViews:reels.length?Math.round(plays/reels.length):0,avgEngagement:reels.length?Math.round((likes+comments)/reels.length):0},contact,notes:[...(Array.isArray(p?.notes)?p.notes:[]),...(Array.isArray(r?.notes)?r.notes:[])]});
 }catch(e){const m=e instanceof Error?e.message:"INSTAGRAM_ENRICH_FAILED";return NextResponse.json({error:m},{status:/FETCHLAYER_NOT_CONFIGURED/.test(m)?503:adminErrorStatus(e)});}}