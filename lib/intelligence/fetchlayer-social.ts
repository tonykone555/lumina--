const KEY=()=>String(process.env.FETCHLAYER_API_KEY||"").trim();

async function post<T>(base:string,path:string,body:Record<string,unknown>):Promise<T>{
 const key=KEY();if(!key)throw new Error("FETCHLAYER_NOT_CONFIGURED");
 const r=await fetch("https://api.fetchlayer.dev/"+base+"/"+path,{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(120000)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error("FETCHLAYER_"+base.toUpperCase().replace(/-/g,"_")+"_"+r.status+": "+String((data as any)?.error||(data as any)?.message||"unknown").slice(0,300));
 return data as T;
}

export async function searchTikTokVideos(query:string,pages=1,limit=30){
 return post<any>("tiktok","search-videos",{query:query.slice(0,160),pages:Math.max(1,Math.min(5,pages)),limit:Math.max(1,Math.min(120,limit))});
}
export async function getTikTokProfile(username:string){return post<any>("tiktok","user-profile",{username:username.slice(0,220)});}
export async function getTikTokVideos(username:string,pages=1,limit=30,sort:"latest"|"popular"|"oldest"="latest"){
 return post<any>("tiktok","user-videos",{username:username.slice(0,220),pages:Math.max(1,Math.min(3,pages)),limit:Math.max(1,Math.min(90,limit)),sort});
}
export async function getInstagramProfile(username:string){return post<any>("instagram","user-profile",{username:username.slice(0,220)});}
export async function getInstagramReels(username:string,pages=1,limit=12){
 return post<any>("instagram","user-reels",{username:username.slice(0,220),pages:Math.max(1,Math.min(3,pages)),limit:Math.max(1,Math.min(36,limit))});
}
export async function searchTikTokAdLibrary(query:string,country="FR",limit=30){
 return post<any>("tiktok-ad-library","search-ads",{query:query.slice(0,160),queryMode:"keyword",country:country.toUpperCase().slice(0,3),adStatus:"active",mediaType:"all",limit:Math.max(1,Math.min(100,limit))});
}
export async function getTikTokAdvertiserAds(advertiser:string,country="FR",pages=1){
 return post<any>("tiktok-ad-library","advertiser-ads",{advertiser:advertiser.slice(0,200),country:country.toUpperCase().slice(0,3),adStatus:"all",pages:Math.max(1,Math.min(5,pages))});
}