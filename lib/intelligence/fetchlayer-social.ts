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

function cursorBody(cursor?:string){return cursor?{cursor:cursor.slice(0,4000)}:{}}
export async function searchTikTokAdLibrary(query:string,country="FR",limit=100,pages=5,cursor=""){
 return post<any>("tiktok-ad-library","search-ads",{query:query.slice(0,160),queryMode:"keyword",country:country.toUpperCase().slice(0,3),adStatus:"active",mediaType:"all",limit:Math.max(1,Math.min(2000,limit)),pages:Math.max(1,Math.min(100,pages)),...cursorBody(cursor)});
}
export async function getTikTokAdvertiserAds(advertiser:string,country="FR",pages=1){
 return post<any>("tiktok-ad-library","advertiser-ads",{advertiser:advertiser.slice(0,200),country:country.toUpperCase().slice(0,3),adStatus:"all",pages:Math.max(1,Math.min(5,pages))});
}

export async function searchMetaAdLibrary(query:string,country="FR",limit=100,pages=5,cursor=""){
 return post<any>("facebook-ad-library","search-ads",{query:query.slice(0,300),country:country.toUpperCase().slice(0,2),activeStatus:"active",mediaType:"all",limit:Math.max(1,Math.min(2000,limit)),pages:Math.max(1,Math.min(100,pages)),...cursorBody(cursor)});
}
export async function searchLinkedInAdLibrary(query:string,country="FR",limit=100,pages=5,cursor=""){
 return post<any>("linkedin-ad-library","search-ads",{query:query.slice(0,300),country:country.toUpperCase().slice(0,2),dateRange:"current-year",limit:Math.max(1,Math.min(2000,limit)),pages:Math.max(1,Math.min(100,pages)),...cursorBody(cursor)});
}
export async function searchGoogleAdLibrary(query:string,region="FR",limit=100,pages=5,cursor=""){
 return post<any>("google-ad-library","search-ads",{query:query.slice(0,300),region:region.toUpperCase().slice(0,2),advertiserLimit:5,limit:Math.max(1,Math.min(2000,limit)),pages:Math.max(1,Math.min(100,pages)),...cursorBody(cursor)});
}

export type AdMediaPlatform="meta"|"tiktok"|"google"|"linkedin";
export async function getAdMedia(platform:AdMediaPlatform,ad:string,country="FR",advertiser=""){
 const base=platform==="meta"?"facebook-ad-library":platform+"-ad-library";
 const body:Record<string,unknown>={ad:ad.slice(0,1200),kinds:["video","image","thumbnail"],probe:true};
 if(platform==="meta"){
  body.country=country.toUpperCase().slice(0,2);
  body.preferHighQuality=true;
  body.includeVariations=true;
 }
 if(platform==="google"){
  body.region=country.toUpperCase().slice(0,2);
  if(advertiser)body.advertiser=advertiser.slice(0,500);
 }
 if(platform==="linkedin")body.preferHighQuality=true;
 return post<any>(base,"ad-media",body);
}

export async function searchGoogleIntent(query:string,country="FR",language="en"){
 return post<any>("google-search","search",{query:query.slice(0,300),country:country.toUpperCase().slice(0,2),language:language.slice(0,12),pages:1,timeRange:"month"});
}
export async function googleAutocomplete(query:string,country="FR",language="en"){
 return post<any>("google-search","autocomplete",{query:query.slice(0,300),country:country.toUpperCase().slice(0,2),language:language.slice(0,12)});
}