import type {Metadata} from "next";
import AppShell from "@/components/lumina/AppShell";
import {getSeoCategory} from "@/lib/seo-categories";

const BASE="https://ynotworld.app";

type SearchParams=Record<string,string|string[]|undefined>;
type Props={params:Promise<{category:string}>;searchParams?:Promise<SearchParams>};

function humanizeSlug(slug:string){
 try{return decodeURIComponent(slug).replace(/[-_]+/g," ").replace(/\s+/g," ").trim()}catch{return slug.replace(/[-_]+/g," ").replace(/\s+/g," ").trim()}
}
function first(v:string|string[]|undefined){return Array.isArray(v)?v[0]:v}
function buildSearch(slug:string,sp:SearchParams){
 let q=humanizeSlug(slug);
 const min=first(sp.min),max=first(sp.max),budget=first(sp.budget),style=first(sp.style),colour=first(sp.color)||first(sp.colour),country=first(sp.country);
 if(style)q+=` ${style} style`;
 if(colour)q+=` ${colour}`;
 if(min&&max)q+=` between ${min} and ${max}`;
 else if(max)q+=` under ${max}`;
 else if(min)q+=` over ${min}`;
 else if(budget)q+=` under ${budget}`;
 if(country)q+=` available in ${String(country).toUpperCase().slice(0,2)}`;
 return q.replace(/\s+/g," ").trim().slice(0,300);
}

export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {category:slug}=await params;
 const known=getSeoCategory(slug);
 const label=known?.name||humanizeSlug(slug);
 const title=known?.title||`${label} — shop on YNOT`;
 const description=known?.description||`Explore ${label} across YNOT's live shopping catalogue.`;
 const url=`${BASE}/shop/${encodeURIComponent(slug)}`;
 return {title:{absolute:title},description,alternates:{canonical:url},robots:{index:true,follow:true},openGraph:{type:"website",url,title,description,siteName:"YNOT",images:[{url:"/ynot-microphone.jpg",alt:`YNOT ${label} shopping`}]},twitter:{card:"summary_large_image",title,description,images:["/ynot-microphone.jpg"]}};
}

export default async function ShoppingKeywordPage({params,searchParams}:Props){
 const {category:slug}=await params;
 const sp=searchParams?await searchParams:{};
 const query=buildSearch(slug,sp);
 return <>
  <h1 style={{position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0,0,0,0)",whiteSpace:"nowrap",border:0}}>Shop {humanizeSlug(slug)} on YNOT</h1>
  <AppShell initialQuery={query}/>
 </>;
}
