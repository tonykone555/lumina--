const BASE="https://api.muapi.ai/api/v1";

function apiKey(){
 const value=String(process.env.MUAPI_API_KEY||"").trim();
 if(!value)throw new Error("MUAPI_NOT_CONFIGURED");
 return value;
}

async function mu(path:string,init:RequestInit={}){
 const r=await fetch(BASE+path,{
  ...init,
  headers:{"x-api-key":apiKey(),"Content-Type":"application/json",...(init.headers||{})},
  cache:"no-store",
  signal:AbortSignal.timeout(120000)
 });
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error("MUAPI_"+r.status+": "+String(data?.error||data?.message||"unknown").slice(0,300));
 return data;
}

async function waitFor(requestId:string){
 const started=Date.now();
 while(Date.now()-started<300000){
  await new Promise(r=>setTimeout(r,3000));
  const data=await mu("/predictions/"+encodeURIComponent(requestId)+"/result",{method:"GET"});
  const status=String(data?.status||"").toLowerCase();
  if(status==="completed"){
   const url=String(data?.outputs?.[0]||data?.output||data?.video_url||"");
   if(!url)throw new Error("MUAPI_NO_OUTPUT");
   return{url,status};
  }
  if(status==="failed"||status==="cancelled"){
   throw new Error("MUAPI_"+status.toUpperCase()+": "+String(data?.error||data?.message||"unknown").slice(0,300));
  }
 }
 throw new Error("MUAPI_TIMEOUT");
}

async function submit(endpoint:string,body:Record<string,unknown>){
 const created=await mu("/"+endpoint,{method:"POST",body:JSON.stringify(body)});
 const requestId=String(created?.request_id||created?.id||"");
 if(!requestId)throw new Error("MUAPI_REQUEST_ID_MISSING");
 const done=await waitFor(requestId);
 return{requestId,...done};
}

export async function renderMuapiStudioVideo(input:{
 mode:string;
 prompt:string;
 baseImageUrl:string;
 sourceVideoUrl?:string;
}){
 if(!input.baseImageUrl)throw new Error("BASE_IMAGE_REQUIRED");

 if(input.mode==="video-avatar"||input.mode==="video-self"){
  if(!input.sourceVideoUrl)throw new Error("SOURCE_VIDEO_REQUIRED");
  const result=await submit("runway-act-two-i2v",{
   image_url:input.baseImageUrl,
   reference_video_url:input.sourceVideoUrl,
   aspect_ratio:"9:16"
  });
  return{
   requestId:result.requestId,
   url:result.url,
   thumbnail:null as string|null,
   model:"muapi/runway-act-two-i2v",
   prompt:input.prompt,
   status:result.status,
   provider:"muapi" as const,
   routingTier:"standard-motion",
   routingReason:"MuAPI Runway Act Two image + driving-video performance transfer"
  };
 }

 const result=await submit("runway-image-to-video",{
  image_url:input.baseImageUrl,
  prompt:input.prompt,
  aspect_ratio:"9:16",
  resolution:"720p",
  duration:5
 });
 return{
  requestId:result.requestId,
  url:result.url,
  thumbnail:null as string|null,
  model:"muapi/runway-image-to-video",
  prompt:input.prompt,
  status:result.status,
  provider:"muapi" as const,
  routingTier:"standard-video",
  routingReason:"MuAPI Runway image-to-video standard route"
 };
}
