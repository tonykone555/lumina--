import {NextResponse} from "next/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 const q="dyson airwrap";
 const urls=["https://www.tikwm.com/api/feed/search?keywords="+encodeURIComponent(q)+"&count=10&cursor=0","https://api.tikwm.com/api/feed/search?keywords="+encodeURIComponent(q)+"&count=10&cursor=0"];
 const checks=await Promise.all(urls.map(async url=>{
  const start=Date.now();
  try{
   const r=await fetch(url,{headers:{"Accept":"application/json","User-Agent":"Mozilla/5.0","Referer":"https://www.tikwm.com/"},cache:"no-store",signal:AbortSignal.timeout(6500)});
   const body=await r.text();let data:any={};try{data=JSON.parse(body)}catch{}
   const list=Array.isArray(data?.data?.videos)?data.data.videos:Array.isArray(data?.data)?data.data:[];
   return {host:new URL(url).host,status:r.status,ms:Date.now()-start,apiCode:data.code,apiMessage:String(data.msg||"").slice(0,100),count:list.length,examples:list.slice(0,2).map((x:any)=>({id:String(x.video_id||x.id||""),title:String(x.title||"").slice(0,90),cover:Boolean(x.cover),time:x.create_time||null}))};
  }catch(e){return {host:new URL(url).host,ms:Date.now()-start,error:e instanceof Error?e.message:"REQUEST_FAILED"}}
 }));
 return NextResponse.json({test:"tikwm-product-keyword",checks},{headers:{"Cache-Control":"no-store"}});
}