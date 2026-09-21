const KEY=()=>String(process.env.FETCHLAYER_API_KEY||"").trim();

async function post<T>(base:string,path:string,body:Record<string,unknown>):Promise<T>{
 const key=KEY();if(!key)throw new Error("FETCHLAYER_NOT_CONFIGURED");
 const r=await fetch(`https://api.fetchlayer.dev/${base}/${path}`,{
  method:"POST",
  headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
  body:JSON.stringify(body),
  cache:"no-store",
  signal:AbortSignal.timeout(120000)
 });
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(`FETCHLAYER_${base.toUpperCase()}_${r.status}: ${String((data as any)?.error||(data as any)?.message||"unknown").slice(0,260)}`);
 return data as T;
}

export type PublicContact={
 email?:string|null;
 confidence?:string|null;
 sourceUrl?:string|null;
 onTargetDomain?:boolean|null;
 status?:string|null;
 complete?:boolean|null;
 notes?:string[];
 target?:string;
};

export async function googleFindHostPresence(input:{hostName:string;listingTitle?:string;city?:string;companyHint?:string}){
 const q=[input.hostName,input.companyHint,input.listingTitle,input.city,"property management OR vacation rental"].filter(Boolean).join(" ").slice(0,240);
 const data=await post<any>("google-search","search",{query:q,limit:10});
 const organic:Array<any>=Array.isArray(data?.organic)?data.organic:Array.isArray(data?.results)?data.results:[];
 const candidates=organic.map((x:any)=>({
  title:String(x.title||""),
  url:String(x.url||x.link||""),
  siteName:String(x.siteName||x.site_name||""),
  snippet:String(x.snippet||"")
 })).filter((x:any)=>x.url&&/^https?:\/\//.test(x.url));
 return{query:q,candidates:candidates.slice(0,10)};
}

export async function findPublishedEmail(target:string):Promise<PublicContact>{
 const data=await post<any>("email-finder","find-email",{target});
 return{
  target,
  email:data?.email||data?.address||data?.result?.email||null,
  confidence:data?.confidence||data?.result?.confidence||null,
  sourceUrl:data?.sourceUrl||data?.source_url||data?.result?.sourceUrl||null,
  onTargetDomain:data?.onTargetDomain??data?.on_target_domain??null,
  status:data?.status||null,
  complete:data?.complete??null,
  notes:Array.isArray(data?.notes)?data.notes:[]
 };
}

export async function enrichHostContact(input:{hostName:string;listingTitle?:string;city?:string;companyHint?:string;knownTargets?:string[]}){
 const presence=await googleFindHostPresence(input);
 const targets=[
  ...(input.knownTargets||[]),
  ...presence.candidates.map(x=>x.url)
 ].filter(Boolean).slice(0,6);

 const checked:PublicContact[]=[];
 for(const target of targets){
  try{
   const found=await findPublishedEmail(target);
   checked.push(found);
   if(found.email&&String(found.confidence||"").toLowerCase()==="high")break;
  }catch{}
 }
 const ranked=[...checked].sort((a,b)=>{
  const rank=(x:PublicContact)=>String(x.confidence||"").toLowerCase()==="high"?3:String(x.confidence||"").toLowerCase()==="medium"?2:x.email?1:0;
  return rank(b)-rank(a);
 });
 return{
  identitySearch:presence.query,
  webCandidates:presence.candidates,
  contacts:ranked,
  bestContact:ranked.find(x=>x.email)||null
 };
}
