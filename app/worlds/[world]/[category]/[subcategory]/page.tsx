import WorldSubcategoryClient from "@/components/lumina/WorldSubcategoryClient";
import {YNOT_VISUAL_WORLDS} from "@/lib/visual/expanded-world-taxonomy";

export const dynamic="force-dynamic";

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
 let initialProducts:any[]=[];
 let initialPagination:any=null;
 try{
  const base=(process.env.NEXT_PUBLIC_APP_URL||"https://ynotworld.app").replace(/\/$/,"");
  const url=`${base}/api/catalog?q=${encodeURIComponent(query)}&source=shopify&limit=24&category_load=1`;
  const response=await fetch(url,{next:{revalidate:30},signal:AbortSignal.timeout(3500)});
  const data=await response.json();
  if(response.ok&&Array.isArray(data?.products)){
   initialProducts=data.products;
   initialPagination=data.pagination||null;
  }
 }catch{}
 return <WorldSubcategoryClient initialProducts={initialProducts} initialPagination={initialPagination}/>;
}
