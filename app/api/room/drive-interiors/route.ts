import {NextResponse} from 'next/server';

// Legacy route name retained so existing Room panels can continue calling it.
const BASE='https://iycxkwoxbkanfyraohge.supabase.co';
const BUCKET='YNOT FEED';
// Verified contents at switchover: keeps feed usable even if Storage listing is temporarily unavailable.
const KNOWN=[
 ...Array.from({length:23},(_,i)=>`IMG_${6946+i}.jpeg`),
 'Quit9To5Interior10.jpeg','Quit9To5Interior101.jpeg','Quit9To5Interior104.jpeg',
 'Quit9To5Interior11.jpeg','Quit9To5Interior111.jpeg','Quit9To5Interior14.jpeg',
 'Quit9To5Interior17.jpeg','Quit9To5Interior22.jpeg','Quit9To5Interior24.jpeg',
 'Quit9To5Interior31.jpeg','Quit9To5Interior36.jpeg','Quit9To5Interior40.jpeg',
 'Quit9To5Interior56.jpeg','Quit9To5Interior60.jpeg','Quit9To5Interior62.jpeg',
 'Quit9To5Interior63.jpeg','Quit9To5Interior7.jpeg','Quit9To5Interior71.jpeg',
 'Quit9To5Interior73.jpeg','Quit9To5Interior79.jpeg','Quit9To5Interior87.jpeg',
 'Quit9To5Interior89.jpeg','Quit9To5Interior9.jpeg','Quit9To5Interior97.jpeg'
];
const isImage=(name:string)=>/\.(jpe?g|png|webp|avif|gif)$/i.test(name);
function item(name:string){
 const path=name.split('/').map(encodeURIComponent).join('/');
 const src=`${BASE}/storage/v1/object/public/${encodeURIComponent(BUCKET)}/${path}`;
 return {id:`ynot-feed-${name}`,type:'photo',src,thumb:src,alt:'Interior inspiration',source:'ynot-feed'};
}
export async function GET(){
 let names:string[]=[];
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(key){
  try{
   const r=await fetch(`${BASE}/storage/v1/object/list/${encodeURIComponent(BUCKET)}`,{
    method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({prefix:'',limit:1000,offset:0,sortBy:{column:'name',order:'asc'}}),
    signal:AbortSignal.timeout(4500),next:{revalidate:120}
   });
   if(r.ok){const data=await r.json();if(Array.isArray(data))names=data.filter((x:any)=>typeof x?.name==='string'&&isImage(x.name)).map((x:any)=>x.name)}
  }catch(e){console.warn('YNOT_FEED_LIST_UNAVAILABLE',e instanceof Error?e.name:'error')}
 }
 const verified=[...new Set((names.length?names:KNOWN).filter(isImage))];
 return NextResponse.json({items:verified.map(item),count:verified.length,source:'ynot-feed'},
  {headers:{'Cache-Control':'public, s-maxage=120, stale-while-revalidate=900'}});
}
