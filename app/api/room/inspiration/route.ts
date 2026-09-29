import {NextRequest,NextResponse} from "next/server";

const QUERIES=["interior design home","modern living room interior","bedroom interior design","kitchen interior design","bathroom interior design","dining room interior","home office interior","garden patio design","terrace outdoor living","house exterior architecture","balcony design","pool house exterior","Mediterranean home","Japandi interior","luxury apartment interior"];
const allowed=new Set(QUERIES);

export async function GET(req:NextRequest){
 const key=process.env.PEXELS_API_KEY||process.env.PEXELS_KEY;
 if(!key)return NextResponse.json({error:"Pexels is not configured"},{status:503});
 const requested=req.nextUrl.searchParams.get("q")||QUERIES[Math.floor(Math.random()*QUERIES.length)];
 const q=allowed.has(requested)?requested:QUERIES[0];
 const page=Math.max(1,Number(req.nextUrl.searchParams.get("page")||1));
 const headers={Authorization:key};
 try{
  const [pr,vr]=await Promise.all([
   fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&orientation=portrait&size=large&per_page=40&page=${page}`,{headers,next:{revalidate:3600}}),
   fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&orientation=portrait&per_page=20&page=${page}`,{headers,next:{revalidate:3600}})
  ]);
  if(!pr.ok||!vr.ok)return NextResponse.json({error:"Could not load inspiration"},{status:502});
  const [p,v]=await Promise.all([pr.json(),vr.json()]);
  const photos=(p.photos||[]).map((x:any)=>({id:`p-${x.id}`,type:"photo",src:x.src?.large2x||x.src?.large||x.src?.portrait,thumb:x.src?.medium||x.src?.portrait,width:x.width,height:x.height,alt:x.alt||q,creator:x.photographer,creatorUrl:x.photographer_url,sourceUrl:x.url}));
  const videos=(v.videos||[]).map((x:any)=>{const files=(x.video_files||[]).filter((f:any)=>f.file_type==="video/mp4").sort((a:any,b:any)=>(a.width||0)-(b.width||0));const file=files.find((f:any)=>(f.width||0)>=720)||files[files.length-1];const pic=x.video_pictures?.[0]?.picture;return{id:`v-${x.id}`,type:"video",src:file?.link,thumb:pic,width:x.width,height:x.height,alt:q,creator:x.user?.name,creatorUrl:x.user?.url,sourceUrl:x.url}}).filter((x:any)=>x.src&&x.thumb);
  const items=[...photos,...videos].sort((a:any,b:any)=>{const an=Number(a.id.replace(/\D/g,"")),bn=Number(b.id.replace(/\D/g,""));return (an%17)-(bn%17)});
  return NextResponse.json({query:q,queries:QUERIES,items},{headers:{"Cache-Control":"public, s-maxage=3600, stale-while-revalidate=86400"}});
 }catch{return NextResponse.json({error:"Could not load inspiration"},{status:500})}
}
