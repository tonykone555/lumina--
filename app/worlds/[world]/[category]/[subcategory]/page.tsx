import {Suspense} from "react";
import WorldSubcategoryClient from "@/components/lumina/WorldSubcategoryClient";
import {YNOT_VISUAL_WORLDS} from "@/lib/visual/expanded-world-taxonomy";

export const dynamic="force-dynamic";

async function LoadedSubcategory({query}:{query:string}){
 let initialProducts:any[]=[];
 let initialPagination:any=null;
 try{
  const base=(process.env.NEXT_PUBLIC_APP_URL||"https://ynotworld.app").replace(/\/$/,"");
  const url=`${base}/api/catalog?q=${encodeURIComponent(query)}&source=shopify&limit=36&category_load=1`;
  const response=await fetch(url,{next:{revalidate:30},signal:AbortSignal.timeout(5000)});
  const data=await response.json();
  if(response.ok&&Array.isArray(data?.products)){
   initialProducts=data.products;
   initialPagination=data.pagination||null;
  }
 }catch{}
 return <WorldSubcategoryClient initialProducts={initialProducts} initialPagination={initialPagination}/>;
}

function MasonryShell(){
 return <main className="page" style={{minHeight:"100dvh",background:"#080808",color:"#fff",paddingTop:64}}>
  <div style={{position:"fixed",top:14,left:"50%",transform:"translateX(-50%)",zIndex:20,width:"min(520px,92vw)",height:48,borderRadius:999,background:"rgba(17,17,17,.58)",border:"1px solid rgba(255,255,255,.18)",backdropFilter:"blur(18px)"}}/>
  <section style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3,padding:"70px 3px 100px"}}>
   {Array.from({length:18}).map((_,i)=><div key={i} style={{minHeight:i%3===1?260:220,background:"linear-gradient(110deg,#111 8%,#1b1b1b 18%,#111 33%)",backgroundSize:"200% 100%",borderRadius:2,opacity:.9}}/>)}
  </section>
 </main>;
}

export default async function SubcategoryPage({
 params,
 searchParams
}:{
 params:Promise<{world:string;category:string;subcategory:string}>;
 searchParams?:Promise<{q?:string|string[]}>;
}){
 const p=await params;
 const sp=await searchParams;
 const world=YNOT_VISUAL_WORLDS.find(w=>w.id===String(p.world));
 const cat=world?.categories.find(c=>c.id===String(p.category));
 const sub=cat?.subcategories.find(s=>s.id===String(p.subcategory));
 if(!world||!cat||!sub)return <main/>;
 const rawQ=Array.isArray(sp?.q)?sp?.q[0]:sp?.q;
 const query=String(rawQ||sub.queries?.[0]||sub.title||"").trim();
 return <Suspense fallback={<MasonryShell/>}><LoadedSubcategory query={query}/></Suspense>;
}
