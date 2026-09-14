import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";

type UnsplashPhoto={
 id?:string;
 width?:number;
 height?:number;
 color?:string;
 urls?:{raw?:string;full?:string;regular?:string};
 user?:{name?:string;links?:{html?:string}};
 links?:{html?:string;download_location?:string};
};

const HOME_SIGNAL=/interesting trending products worth discovering|choose a world|discover/i;
const PREMIUM_HOME_QUERY="luxury fashion boutique editorial shopping interior contemporary design premium lifestyle";

function accessKey(){
 return process.env.UNSPLASH_ACCESS_KEY||process.env.UNSPLASH_API_KEY||process.env.NEXT_UNSPLASH_ACCESS_KEY||"";
}
function normalizeQuery(input:string){
 const q=input.trim().slice(0,180);
 if(!q||HOME_SIGNAL.test(q))return PREMIUM_HOME_QUERY;
 if(/fashion|dress|clothing|style/i.test(q))return `${q} fashion editorial luxury campaign`;
 if(/home|furniture|decor|lighting|interior/i.test(q))return `${q} premium interior editorial`;
 if(/fitness|gym|running|training|activewear/i.test(q))return `${q} premium fitness editorial`;
 if(/beauty|skin|skincare|hair/i.test(q))return `${q} beauty editorial clean studio`;
 if(/tech|audio|phone|gadget/i.test(q))return `${q} premium technology editorial`;
 return `${q} premium editorial lifestyle`;
}
function score(photo:UnsplashPhoto,index:number){
 const w=Number(photo.width||0),h=Number(photo.height||0),landscape=w>h,wide=w/h;
 return (landscape?30:0)+(w>=1800?25:0)+(wide>=1.35?12:0)+(wide<=2.2?8:0)-index*1.5;
}

export async function GET(req:NextRequest){
 const raw=(req.nextUrl.searchParams.get("q")||"").trim();
 const query=normalizeQuery(raw);
 const key=accessKey();
 if(!key)return NextResponse.json({image:null,error:"UNSPLASH_KEY_MISSING"},{headers:{"Cache-Control":"public, max-age=60"}});
 try{
  const params=new URLSearchParams({query,orientation:"landscape",content_filter:"high",per_page:"12",order_by:"relevant"});
  const response=await fetch(`https://api.unsplash.com/search/photos?${params}`,{
   headers:{Authorization:`Client-ID ${key}`,"Accept-Version":"v1"},
   next:{revalidate:1800}
  });
  if(!response.ok)throw new Error(`UNSPLASH_${response.status}`);
  const data=await response.json() as {results?:UnsplashPhoto[]};
  const results=(data.results||[]).filter(p=>Boolean(p.urls?.raw||p.urls?.regular));
  const photo=results.sort((a,b)=>score(b,results.indexOf(b))-score(a,results.indexOf(a)))[0];
  if(!photo)return NextResponse.json({image:null,error:"NO_BACKGROUND_FOUND"},{headers:{"Cache-Control":"public, max-age=300"}});
  const base=photo.urls?.raw||photo.urls?.regular||"";
  const joiner=base.includes("?")?"&":"?";
  const image=`${base}${joiner}auto=format&fit=crop&crop=entropy&w=2400&h=1500&q=88`;
  const photographer=photo.user?.name||"Unsplash photographer";
  const profile=photo.user?.links?.html||photo.links?.html||"https://unsplash.com";
  const creditUrl=`${profile}${profile.includes("?")?"&":"?"}utm_source=ynot&utm_medium=referral`;
  return NextResponse.json({image,credit:{name:photographer,url:creditUrl},query,home:HOME_SIGNAL.test(raw)||!raw,photoId:photo.id||null},{headers:{"Cache-Control":"public, s-maxage=1800, stale-while-revalidate=86400"}});
 }catch(error){
  console.error("Unsplash background error",error);
  return NextResponse.json({image:null,error:"BACKGROUND_UNAVAILABLE"},{headers:{"Cache-Control":"public, max-age=60"}});
 }
}
