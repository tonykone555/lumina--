import {NextRequest,NextResponse} from "next/server";
import {requireYnotAdmin,adminErrorStatus} from "@/lib/ynot/admin-server";
import {searchAirbnbListings} from "@/lib/intelligence/fetchlayer-airbnb";
import {hostQualification} from "@/lib/intelligence/host-property-analysis";

export const runtime="nodejs";

function photoUrls(x:any){
 const raw=x?.photos||x?.images||x?.photoUrls||[];
 return (Array.isArray(raw)?raw:[]).map((p:any)=>typeof p==="string"?p:p?.url||p?.large||p?.picture).filter(Boolean).slice(0,12);
}
function moneyAmount(v:any){const n=Number(v?.amount??v);return Number.isFinite(n)?n:null}
function normalize(x:any){
 const price=x?.price||{};
 const nightly=moneyAmount(price?.perNight??x?.nightlyPrice??x?.pricePerNight);
 const currency=String(price?.perNight?.currency||price?.total?.currency||x?.currency||"EUR");
 const id=String(x?.id||x?.listingId||x?.listing_id||x?.roomId||"");
 const host=x?.host||x?.hostProfile||{};
 const item={
  id,title:String(x?.title||x?.name||"Airbnb listing"),url:String(x?.url||x?.listingUrl||(id?"https://www.airbnb.com/rooms/"+id:"")),
  location:String(x?.location?.name||x?.location?.city||x?.city||x?.localizedLocation||""),
  propertyType:String(x?.propertyType||x?.property_type||x?.roomType||""),
  roomType:String(x?.roomType||x?.room_type||""),
  nightlyPrice:nightly,currency,rating:moneyAmount(x?.rating?.overall??x?.rating??x?.avgRating),
  reviewCount:Number(x?.reviewCount??x?.reviewsCount??x?.rating?.reviewCount??0)||0,
  photos:photoUrls(x),
  host:{name:String(host?.name||host?.firstName||x?.hostName||""),isSuperhost:Boolean(host?.isSuperhost||host?.superhost),profileUrl:String(host?.profileUrl||"")}
 };
 return{...item,qualificationScore:hostQualification(item)};
}
export async function POST(req:NextRequest){
 try{
  await requireYnotAdmin(req);
  const b=await req.json(),location=String(b.location||"").trim().slice(0,180);
  if(!location)return NextResponse.json({error:"LOCATION_REQUIRED"},{status:400});
  const raw=await searchAirbnbListings({location,pages:Math.max(1,Math.min(5,Number(b.pages)||1)),currency:String(b.currency||"EUR")});
  const rows=Array.isArray(raw?.listings)?raw.listings:Array.isArray(raw?.results)?raw.results:Array.isArray(raw?.data)?raw.data:[];
  const minNightly=Math.max(0,Number(b.min_nightly||b.minNightly||0));
  const listings=rows.map(normalize).filter((x:any)=>!minNightly||Number(x.nightlyPrice||0)>=minNightly).sort((a:any,b:any)=>(b.qualificationScore-a.qualificationScore)||(Number(b.nightlyPrice||0)-Number(a.nightlyPrice||0)));
  return NextResponse.json({location,listings,checkIn:raw?.checkIn||null,checkOut:raw?.checkOut||null,notes:raw?.notes||[],pagesFetched:raw?.pagesFetched||null});
 }catch(e){const m=e instanceof Error?e.message:"HOST_SEARCH_FAILED";return NextResponse.json({error:m},{status:/FETCHLAYER_NOT_CONFIGURED/.test(m)?503:adminErrorStatus(e)});}
}