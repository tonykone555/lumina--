import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";

type ProductInput={id:string;title?:string;image?:string;category?:string};
type MediaRow={product_id:string;media_type:string;video_url?:string|null;poster_url?:string|null;preset?:string|null;status:string;priority:number;source_image_url?:string|null;source_image_hash?:string|null;metadata?:any};

function dbConfig(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL;
 const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error("MEDIA_DB_NOT_CONFIGURED");
 return{base:url.replace(/\/$/,""),headers:{apikey:key,...(key.startsWith("sb_")?{}:{Authorization:"Bearer "+key}),"Content-Type":"application/json"}};
}
function hashString(input:string){let h=2166136261;for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
function presetFor(p:ProductInput){
 const t=((p.title||"")+" "+(p.category||"")).toLowerCase();
 if(/dress|shirt|top|skirt|scarf|jacket|hoodie|pants|trouser|jean|legging|shoe|fashion|clothing|apparel/.test(t))return"fashion_alive";
 if(/beauty|serum|cream|makeup|skin|hair|cosmetic/.test(t))return"beauty_alive";
 if(/sofa|chair|table|lamp|mirror|decor|furniture|home|rug|bed/.test(t))return"context_push";
 if(/phone|charger|module|gadget|tech|headphone|speaker|watch|electronic/.test(t))return"product_orbit";
 if(/fitness|gym|band|dumbbell|exercise|training|sport/.test(t))return"active_float";
 return"soft_float";
}
function mediaWeight(row:MediaRow){return row.media_type==="ugc_real"?400:row.media_type==="video_uploaded"?300:row.media_type==="video_ai"?200:100}
async function rest(path:string,init?:RequestInit){const{base,headers}=dbConfig();const r=await fetch(base+"/rest/v1/"+path,{...init,headers:{...headers,...(init?.headers||{})},cache:"no-store"});const j=await r.json().catch(()=>null);if(!r.ok)throw new Error("MEDIA_DB_"+r.status+":"+String(j?.message||j?.error||"unknown"));return j}

export async function POST(req:NextRequest){
 try{
  const body=await req.json();const products:(ProductInput[])=(Array.isArray(body?.products)?body.products:[]).slice(0,24).map((p:any)=>({id:String(p?.id||"").slice(0,500),title:String(p?.title||"").slice(0,260),image:String(p?.image||"").slice(0,1500),category:String(p?.category||"").slice(0,120)})).filter(p=>p.id&&p.image);
  if(!products.length)return NextResponse.json({media:{}});
  const motionRows=products.map(p=>({product_id:p.id,source_image_url:p.image||"",source_image_hash:hashString(p.image||""),media_type:"motion_fast",provider:"ynot-motion",video_url:null,poster_url:p.image||null,preset:presetFor(p),status:"ready",priority:10,metadata:{version:1,title:p.title||null,category:p.category||null},updated_at:new Date().toISOString()}));
  await rest("ynot_product_media?on_conflict=product_id,media_type,source_image_hash",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(motionRows)});
  const idList=products.map(p=>"\""+p.id.replace(/\"/g,"")+"\"").join(",");
  const rows=(await rest("ynot_product_media?select=product_id,media_type,video_url,poster_url,preset,status,priority,source_image_url,source_image_hash,metadata&status=eq.ready&product_id=in.("+encodeURIComponent(idList)+")")) as MediaRow[];
  const media:Record<string,MediaRow>={};
  for(const row of Array.isArray(rows)?rows:[]){const current=media[row.product_id];if(!current||mediaWeight(row)+Number(row.priority||0)>mediaWeight(current)+Number(current.priority||0))media[row.product_id]=row}
  return NextResponse.json({media});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"PRODUCT_MEDIA_FAILED"},{status:500})}
}