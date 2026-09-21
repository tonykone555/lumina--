const BASE="https://apis.viggle.ai/v1";

function apiKey(){
 const key=String(process.env.VIGGLE_API_KEY||"").trim();
 if(!key)throw new Error("VIGGLE_NOT_CONFIGURED");
 return key;
}

async function remoteFile(url:string,name:string){
 const r=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw new Error("VIGGLE_INPUT_FETCH_"+r.status);
 const type=(r.headers.get("content-type")||"application/octet-stream").split(";")[0];
 const bytes=await r.arrayBuffer();
 if(bytes.byteLength>100*1024*1024)throw new Error("VIGGLE_INPUT_TOO_LARGE");
 return new File([bytes],name,{type});
}

async function request(path:string,init:RequestInit={}){
 const r=await fetch(BASE+path,{
  ...init,
  headers:{Authorization:`Bearer ${apiKey()}`,...(init.headers||{})},
  cache:"no-store",
  signal:AbortSignal.timeout(120000)
 });
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error("VIGGLE_API_"+r.status+": "+String(d?.message||d?.error||"unknown").slice(0,300));
 return d;
}

export async function renderViggleMotion(input:{characterImageUrl:string;motionVideoUrl:string}){
 const form=new FormData();
 form.append("image",await remoteFile(input.characterImageUrl,"character.png"));
 form.append("motion_video",await remoteFile(input.motionVideoUrl,"motion.mp4"));
 const created=await request("/renders",{method:"POST",body:form});
 const id=String(created?.id||"");
 if(!id)throw new Error("VIGGLE_RENDER_ID_MISSING");

 const started=Date.now(),timeoutMs=300000;
 while(Date.now()-started<timeoutMs){
  await new Promise(r=>setTimeout(r,3000));
  const job=await request("/renders/"+encodeURIComponent(id));
  const status=String(job?.status||"").toLowerCase();
  if(status==="ready"){
   const url=String(job?.video_url||"");
   if(!url)throw new Error("VIGGLE_VIDEO_URL_MISSING");
   return{
    requestId:id,
    url,
    thumbnail:null as string|null,
    model:"viggle/jst-2",
    status,
    provider:"viggle" as const,
    routingTier:"standard-motion",
    routingReason:"Viggle JST-2 character image + driving video motion transfer"
   };
  }
  if(status==="failed"||status==="cancelled")throw new Error("VIGGLE_RENDER_"+status.toUpperCase()+": "+String(job?.error||job?.message||"unknown").slice(0,300));
 }
 throw new Error("VIGGLE_RENDER_TIMEOUT");
}
