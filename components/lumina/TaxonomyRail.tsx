"use client";

import {useMemo,useState} from "react";
import {SHOP_TAXONOMY,taxonomyCategory} from "./shopTaxonomy";

function setInput(input:HTMLInputElement,value:string){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;setter?.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}))}
function runSearch(categoryId:string,label?:string){const category=taxonomyCategory(categoryId),term=[category.query,label].filter(Boolean).join(" ");window.dispatchEvent(new CustomEvent("shop:tags-changed",{detail:{tags:label?[label]:[],root:category.root,path:label?[label]:[]}}));const input=document.querySelector<HTMLInputElement>(".lv4-search input");if(input){setInput(input,term);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(".lv4-search button")?.click())}const bottom=document.querySelector<HTMLInputElement>(".ynot-bottom-search input");if(bottom)setInput(bottom,label||category.label)}

export default function TaxonomyRail(){
 const[active,setActive]=useState("fashion");
 const category=useMemo(()=>taxonomyCategory(active),[active]);
 return <div className="ynot-taxonomy-rail" aria-label="Shopping categories">
  <div className="ynot-taxonomy-main" role="tablist" aria-label="Main categories">{SHOP_TAXONOMY.map(item=><button key={item.id} role="tab" aria-selected={active===item.id} className={active===item.id?"active":""} onClick={()=>{setActive(item.id);runSearch(item.id)}}>{item.label}</button>)}</div>
  <div className="ynot-taxonomy-sub" aria-label={`${category.label} subcategories`}>{category.sub.map(label=><button key={label} onClick={()=>runSearch(category.id,label)}>{label}</button>)}</div>
 </div>
}
