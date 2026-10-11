import "./masonry-grid.css";
import MasonryClient from "./MasonryClient";
import {YNOT_VISUAL_WORLDS} from "@/lib/visual/expanded-world-taxonomy";
import {headers} from "next/headers";
export const dynamic="force-dynamic";
type Product={id:string;title:string;image?:string;[key:string]:unknown};
export default async function SubcategoryPage({params,searchParams}:{params:Promise<{world:string;category:string;subcategory:string}>;searchParams:Promise<{q?:string;product?:string}>}){
 const p=await params;
 const s=await searchParams;
 const world=YNOT_VISUAL_WORLDS.find(w=>w.id===p.world);
 const category=world?.categories.find(x=>x.id===p.category);
 const sub=category?.subcategories.find(x=>x.id===p.subcategory);
 const query=String(s.q||"").trim()||String(sub?.queries?.[0]||"");
 let initialProducts:Product[]=[];
 let initialPagination:Record<string,unknown>|null=null;
 if(query){
  try{
   const h=await headers();
   const host=h.get("host")||"ynotworld.app";
   const proto=host.includes("localhost")?"http":"https";
   const url=new URL("/api/catalog",proto+"://"+host);
   url.searchParams.set("q",query);url.searchParams.set("source","all");
   url.searchParams.set("limit","36");url.searchParams.set("category_load","1");
   const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(8500)});
   if(response.ok){
    const data=await response.json();
    if(Array.isArray(data.products))initialProducts=data.products.filter((x:Product)=>Boolean(x?.id&&x?.image)).slice(0,36);
    if(data.pagination&&typeof data.pagination==="object")initialPagination=data.pagination;
   }
  }catch(error){console.warn("Masonry prefetch unavailable",{message:error instanceof Error?error.message:"UNKNOWN"})}
 }
 return <MasonryClient initialProducts={initialProducts} initialQuery={query} initialSelectedId={String(s.product||"")} initialPagination={initialPagination}/>;
}
