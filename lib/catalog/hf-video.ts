export type VideoProduct={id:string;title:string;image:string;category?:string};

type DbHeaders={apikey:string;Authorization?:string;"Content-Type":string};

function dbConfig(){
 const base=String(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||"").replace(/\/$/,"");
 const key=String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"");
 if(!base||!key)throw new Error("VIDEO_DB_NOT_CONFIGURED");
 const headers:DbHeaders={apikey:key,"Content-Type":"application/json"};
 if(!key.startsWith("sb_"))headers.Authorization="Bearer "+key;
 return{base,key,headers};
}

export function sourceHash(input:string){
 let h=2166136261;
 for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619)}
 return(h>>>0).toString(36);
}

export function motionPrompt(p:VideoProduct){
 const t=((p.title||"")+" "+(p.category||"")).toLowerCase();
 const preserve="Preserve the exact product identity, materials, colors, logos, proportions and scene. No morphing, no text changes, no new products. Smooth premium ecommerce motion, stable camera, no cuts.";
 if(/dress|shirt|top|skirt|jacket|hoodie|pants|trouser|jean|legging|shoe|fashion|clothing|apparel|swim|lingerie/.test(t))
  return `${preserve} Animate this fashion photo subtly: gentle natural breathing/body sway, tiny fabric and hair movement, soft cinematic push-in. Keep the model face and garment structure consistent.`;
 if(/beauty|serum|cream|makeup|skin|hair|cosmetic|perfume/.test(t))
  return `${preserve} Create a subtle premium beauty showcase: very slow camera push, soft light movement and tiny natural product or subject motion.`;
 if(/sofa|chair|table|lamp|mirror|decor|furniture|home|rug|bed|kitchen/.test(t))
  return `${preserve} Create a calm interior product showcase: slow camera push with subtle ambient depth and light movement. Keep furniture geometry perfectly stable.`;
 if(/phone|charger|gadget|tech|headphone|speaker|watch|electronic|accessory/.test(t))
  return `${preserve} Create a clean product showcase with a gentle camera orbit or parallax, tiny floating motion and soft moving reflections.`;
 if(/fitness|gym|band|dumbbell|exercise|training|sport/.test(t))
  return `${preserve} Create a short energetic but controlled product showcase with slight parallax, gentle movement and a smooth camera push.`;
 return `${preserve} Create a subtle 3-second ecommerce motion loop with a gentle camera push, slight parallax and soft lighting movement.`;
}

export async function rest(path:string,init?:RequestInit){
 const{base,headers}=dbConfig();
 const r=await fetch(base+"/rest/v1/"+path,{...init,headers:{...headers,...(init?.headers||{})},cache:"no-store"});
 const j=await r.json().catch(()=>null);
 if(!r.ok)throw new Error("VIDEO_DB_"+r.status+":"+String(j?.message||j?.error||"unknown"));
 return j;
}

function hfConfig(){
 const base=String(process.env.HUGGINGFACE_SPACE_URL||"https://lightricks-ltx-video-distilled.hf.space").replace(/\/$/,"");
 const token=String(process.env.HUGGINGFACE_TOKEN||"");
 const api=String(process.env.HUGGINGFACE_SPACE_API_NAME||"image_to_video").replace(/^\//,"");
 return{base,token,api};
}

function hfHeaders(token:string,json=false){
 const h:Record<string,string>={};
 if(token)h.Authorization="Bearer "+token;
 if(json)h["Content-Type"]="application/json";
 return h;
}

async function uploadGradioImage(imageUrl:string,base:string,token:string){
 const source=await fetch(imageUrl,{cache:"no-store"});
 if(!source.ok)throw new Error("HF_IMAGE_DOWNLOAD_"+source.status);
 const bytes=await source.arrayBuffer();
 if(!bytes.byteLength||bytes.byteLength>12*1024*1024)throw new Error("HF_IMAGE_SIZE_INVALID");
 const mime=(source.headers.get("content-type")||"image/jpeg").split(";")[0];
 if(!mime.startsWith("image/"))throw new Error("HF_IMAGE_TYPE_INVALID");
 const ext=mime.includes("png")?"png":mime.includes("webp")?"webp":mime.includes("gif")?"gif":"jpg";
 const form=new FormData();
 form.append("files",new Blob([bytes],{type:mime}),"ynot-product."+ext);
 const upload=await fetch(base+"/gradio_api/upload",{method:"POST",headers:hfHeaders(token),body:form,cache:"no-store"});
 const data=await upload.json().catch(()=>null);
 if(!upload.ok)throw new Error("HF_UPLOAD_"+upload.status+":"+String(data?.detail||data?.error||"unknown"));
 const path=String(Array.isArray(data)?data[0]:"");
 if(!path)throw new Error("HF_UPLOAD_PATH_MISSING");
 return{path,orig_name:"ynot-product."+ext,meta:{_type:"gradio.FileData"}};
}

export async function submitHuggingFace(product:VideoProduct,prompt:string){
 const{base,token,api}=hfConfig();
 const image=await uploadGradioImage(product.image,base,token);
 const negative="worst quality, inconsistent motion, blurry, jittery, distorted, warped product, changed logo, changed text, duplicate objects, deformed face, deformed hands";
 // Official Lightricks Space input order:
 // prompt, negative prompt, image file, hidden video, height, width, mode,
 // duration, video frames, seed, randomize seed, guidance scale, improve texture.
 const data=[
  prompt,
  negative,
  image,
  null,
  640,
  512,
  "image-to-video",
  2.0,
  9,
  42,
  true,
  3.0,
  false
 ];
 const r=await fetch(`${base}/gradio_api/call/${encodeURIComponent(api)}`,{
  method:"POST",headers:hfHeaders(token,true),cache:"no-store",
  body:JSON.stringify({data})
 });
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error("HF_SUBMIT_"+r.status+":"+String(d?.detail||d?.error||d?.message||"unknown"));
 const eventId=String(d?.event_id||"");
 if(!eventId)throw new Error("HF_EVENT_ID_MISSING");
 return eventId;
}

function parseSse(raw:string){
 const blocks=raw.split(/\n\n+/);let complete:any=null;let failed="";
 for(const block of blocks){
  const event=(block.match(/^event:\s*(.+)$/m)?.[1]||"").trim();
  const data=(block.match(/^data:\s*(.+)$/m)?.[1]||"").trim();
  if(event==="error"||event==="failed"){failed=data||event;continue}
  if(event==="complete"&&data){try{complete=JSON.parse(data)}catch{complete=data}}
 }
 return{complete,failed};
}

function findFileUrl(value:any,base:string):string{
 const visit=(v:any):string=>{
  if(!v)return"";
  if(typeof v==="string"){
   if(/^https?:\/\//i.test(v))return v;
   if(v.startsWith("/gradio_api/file=")||v.startsWith("/file="))return base+v;
   return"";
  }
  if(Array.isArray(v)){for(const x of v){const u=visit(x);if(u)return u}return""}
  if(typeof v==="object"){
   for(const key of ["url","path","video","video_url","name"]){const u=visit(v[key]);if(u)return u}
   for(const x of Object.values(v)){const u=visit(x);if(u)return u}
  }
  return"";
 };
 return visit(value);
}

export async function pollHuggingFace(eventId:string,timeoutMs=9000){
 const{base,token,api}=hfConfig();
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
 let raw="";
 try{
  const r=await fetch(`${base}/gradio_api/call/${encodeURIComponent(api)}/${encodeURIComponent(eventId)}`,{headers:hfHeaders(token),cache:"no-store",signal:controller.signal});
  if(!r.ok)throw new Error("HF_STATUS_"+r.status);
  const reader=r.body?.getReader(),decoder=new TextDecoder();
  if(reader){
   while(true){const{done,value}=await reader.read();if(done)break;raw+=decoder.decode(value,{stream:true});const parsed=parseSse(raw);if(parsed.complete||parsed.failed)break}
  }else raw=await r.text();
 }catch(e){if((e as any)?.name!=="AbortError")throw e}
 finally{clearTimeout(timer)}
 const parsed=parseSse(raw);
 if(parsed.failed)return{status:"failed" as const,error:parsed.failed,url:""};
 if(parsed.complete){const url=findFileUrl(parsed.complete,base);return url?{status:"ready" as const,url,error:""}:{status:"failed" as const,error:"HF_OUTPUT_FILE_MISSING",url:""}}
 return{status:"processing" as const,url:"",error:""};
}

export async function persistVideo(productId:string,hash:string,remoteUrl:string,posterUrl:string){
 const{base,key}=dbConfig();
 const source=await fetch(remoteUrl,{cache:"no-store"});
 if(!source.ok)throw new Error("HF_VIDEO_DOWNLOAD_"+source.status);
 const bytes=await source.arrayBuffer();
 if(bytes.byteLength>50*1024*1024)throw new Error("HF_VIDEO_TOO_LARGE");
 const contentType=source.headers.get("content-type")||"video/mp4";
 const ext=contentType.includes("webm")?"webm":"mp4";
 const safeId=productId.replace(/[^a-zA-Z0-9._-]+/g,"_").slice(0,180);
 const path=`generated/${safeId}/${hash}.${ext}`;
 const uploadHeaders:Record<string,string>={apikey:key,"Content-Type":contentType,"x-upsert":"true"};
 if(!key.startsWith("sb_"))uploadHeaders.Authorization="Bearer "+key;
 const up=await fetch(`${base}/storage/v1/object/product-media/${path.split("/").map(encodeURIComponent).join("/")}`,{method:"POST",headers:uploadHeaders,body:bytes,cache:"no-store"});
 if(!up.ok)throw new Error("VIDEO_STORE_"+up.status+":"+(await up.text()).slice(0,160));
 const publicUrl=`${base}/storage/v1/object/public/product-media/${path.split("/").map(encodeURIComponent).join("/")}`;
 await rest("ynot_product_media?on_conflict=product_id,media_type,source_image_hash",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify([{product_id:productId,source_image_url:posterUrl,source_image_hash:hash,media_type:"video_ai",provider:"huggingface-zerogpu-lightricks",video_url:publicUrl,poster_url:posterUrl,preset:null,status:"ready",priority:50,metadata:{model:"ltx-video-0.9.8-13b-distilled",space:"Lightricks/ltx-video-distilled",cached:true},updated_at:new Date().toISOString()}])});
 return publicUrl;
}

export function huggingFaceConfigured(){return true}
