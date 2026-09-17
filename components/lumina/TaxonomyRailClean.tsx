"use client";

import {useMemo,useState} from "react";
import {SHOP_TAXONOMY,taxonomyCategory,type ShopCategory} from "./shopTaxonomy";

type Stage="category"|"subcategory"|"attributes";

const TAGS:Record<string,string[]>={
  Fashion:["Women","Men","Dresses","Tops","Bottoms","Denim","Knitwear","Outerwear","Activewear","Swimwear","Lingerie","Streetwear","Occasionwear","Vintage"],
  "Jewelry & Accessories":["Rings","Necklaces","Earrings","Bracelets","Charms","Fine Jewelry","Watches","Sunglasses","Hats","Scarves","Belts","Wallets"],
  Shoes:["Sneakers","Trainers","Heels","Boots","Sandals","Flats","Loafers","Running Shoes","Hiking Shoes","Slippers"],
  "Bags & Travel":["Handbags","Shoulder Bags","Crossbody","Tote Bags","Backpacks","Clutches","Travel Bags","Luggage","Laptop Bags","Pouches"],
  "Beauty & Personal Care":["Skincare","Makeup","Hair Care","Fragrance","Bath & Body","Nails","Grooming","Beauty Tools","Natural Beauty","Self-Care Sets"],
  Hair:["Shampoo","Conditioner","Repair","Scalp Care","Styling","Hair Tools","Volume","Curl Care","Hair Oils","Hair Accessories"],
  "Home & Living":["Furniture","Home Decor","Lighting","Kitchen","Dining","Bedding","Bathroom","Storage","Rugs","Wall Art","Mirrors","Candles","Garden"],
  "Fitness & Sports":["Activewear","Gym Clothing","Training Gear","Home Gym","Running","Yoga","Pilates","Cycling","Recovery","Outdoor Sports","Sports Accessories"],
  "Tech & Gadgets":["Phones","Phone Accessories","Computers","Computer Accessories","Audio","Headphones","Speakers","Gaming","Smart Home","Wearables","Cameras","Desk Tech","Charging","Gadgets"],
  "Auto & Mobility":["Car Accessories","Car Care","Interior Accessories","Exterior Accessories","Motorcycle","Cycling Accessories","EV Accessories","Dash Cams","Car Tech","Travel Safety"],
  "Outdoor & Adventure":["Camping","Hiking","Travel Gear","Outdoor Clothing","Outdoor Cooking","Hydration","Backpacks","Survival Gear","Beach","Fishing"],
  Gifts:["Gifts for Her","Gifts for Him","Couples","Birthday","Wedding","Anniversary","Baby","Housewarming","Personalized Gifts","Handmade Gifts","Gift Boxes"],
  Pets:["Dog","Cat","Pet Clothing","Collars & Leads","Beds","Toys","Feeding","Pet Accessories","Personalized Pet Gifts"],
};

const DETAIL:Record<string,string[]>={
  Dresses:["Mini","Midi","Maxi","Bodycon","A-Line","Satin","Wedding Guest","Summer"],
  Tops:["T-Shirts","Blouses","Shirts","Knitwear","Crop","Tank","Long Sleeve","Oversized"],
  Denim:["Straight","Wide Leg","Skinny","Bootcut","High Rise","Low Rise","Dark Wash","Light Wash"],
  Swimwear:["Bikinis","One Piece","High Waist","Triangle","Cover Ups","Plus Size","Minimal","Resort"],
  Sneakers:["Lifestyle","Running","Retro","Platform","Low Top","High Top","White","Limited"],
  Heels:["Kitten","Block","Stiletto","Platform","Slingback","Black","Nude","Occasion"],
  Handbags:["Leather","Mini","Structured","Shoulder","Top Handle","Black","Neutral","Premium"],
  Skincare:["Dry Skin","Oily Skin","Sensitive","Acne","Glow","Barrier Repair","Anti-Aging","Fragrance Free"],
  Makeup:["Foundation","Concealer","Blush","Bronzer","Eyes","Lips","Natural","Longwear"],
  Furniture:["Sofas","Chairs","Tables","Shelving","Bedroom","Office","Small Space","Statement"],
  Lighting:["Table Lamps","Floor Lamps","Pendant","Wall Lights","Desk Lamps","Smart","Ambient","Minimal"],
  Activewear:["Leggings","Sports Bras","Sets","Tops","Shorts","Seamless","Running","Yoga"],
  Running:["Shoes","Tops","Shorts","Hydration","GPS","Reflective","Recovery","Race Day"],
  Phones:["iPhone","Android","Unlocked","Budget","Premium","Compact","Large Screen","Refurbished"],
  Audio:["Headphones","Earbuds","Speakers","Soundbars","Portable","Noise Cancelling","Wireless","Premium"],
  Gaming:["Controllers","Headsets","Keyboards","Mice","Consoles","Desk Setup","RGB","Accessories"],
  Camping:["Tents","Sleeping","Cooking","Lighting","Furniture","Backpacks","Family","Ultralight"],
  Hiking:["Shoes","Backpacks","Poles","Hydration","Clothing","Navigation","Lightweight","Trail"],
  Dog:["Collars","Harnesses","Beds","Toys","Bowls","Clothing","Personalized","Travel"],
  Cat:["Beds","Toys","Scratchers","Bowls","Collars","Furniture","Personalized","Indoor"],
  "Car Accessories":["Interior","Exterior","Phone Mounts","Storage","Cleaning","Lighting","Travel","Tech"],
  "Car Care":["Cleaning","Detailing","Polish","Interior","Exterior","Kits","Tools","Premium"],
};

function fallbackFor(category:ShopCategory,subcategory:string){
  const exact=DETAIL[subcategory];if(exact)return exact;
  const root=category.root;
  if(root==="fashion")return ["New Arrivals","Casual","Premium","Minimal","Black","Neutral","Summer","Occasion"];
  if(root==="skin"||root==="hair")return ["Best Sellers","Sensitive","Hydrating","Repair","Natural","Premium","Travel Size","Sets"];
  if(root==="home")return ["Modern","Minimal","Small Space","Storage","Natural","Premium","Smart","Best Sellers"];
  if(root==="fitness")return ["Beginner","Performance","Lightweight","Recovery","Training","Outdoor","Premium","Top Rated"];
  if(root==="tech")return ["Portable","Wireless","Smart","Compact","Premium","Budget","Top Rated","New"];
  return ["New Arrivals","Best Value","Premium","Popular","Personalized","Handmade","Under €25","Under €50"];
}

function setInput(input:HTMLInputElement,value:string){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;setter?.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}))}
function searchNow(category:ShopCategory,subcategory?:string,attributes:string[]=[]){const terms=[category.query,subcategory,...attributes].filter(Boolean).join(" ");const tags=[subcategory,...attributes].filter(Boolean) as string[];window.dispatchEvent(new CustomEvent("shop:tags-changed",{detail:{tags,root:category.root,categoryId:category.id,category:category.label,path:subcategory?[subcategory,...attributes]:[]}}));const input=document.querySelector<HTMLInputElement>(".lv4-search input");if(input){setInput(input,terms);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(".lv4-search button")?.click())}}

export default function TaxonomyRailClean(){
  const[stage,setStage]=useState<Stage>("category"),[categoryId,setCategoryId]=useState("fashion"),[subcategory,setSubcategory]=useState(""),[selected,setSelected]=useState<string[]>([]);
  const category=useMemo(()=>taxonomyCategory(categoryId),[categoryId]);
  const options=useMemo(()=>stage==="category"?SHOP_TAXONOMY.map(x=>x.label):stage==="subcategory"?(TAGS[category.label]||category.sub):fallbackFor(category,subcategory),[stage,category,subcategory]);
  function choose(label:string){
    if(stage==="category"){const next=SHOP_TAXONOMY.find(x=>x.label===label);if(!next)return;setCategoryId(next.id);setSubcategory("");setSelected([]);setStage("subcategory");searchNow(next);return}
    if(stage==="subcategory"){setSubcategory(label);setSelected([]);setStage("attributes");searchNow(category,label);return}
    const next=selected.includes(label)?selected.filter(x=>x!==label):[...selected,label].slice(-4);setSelected(next);searchNow(category,subcategory,next)
  }
  function back(){if(stage==="attributes"){setStage("subcategory");setSelected([]);searchNow(category);return}if(stage==="subcategory"){setStage("category");setSubcategory("");setSelected([]);window.dispatchEvent(new CustomEvent("shop:tags-changed",{detail:{tags:[],root:"",categoryId:"",category:"",path:[]}}))}}
  return <div className="ynot-taxonomy-progressive ynot-subcat ynot-taxonomy-inline" aria-label="Shopping category navigator"><div className="ynot-subcat-bubbles">{stage!=="category"&&<button className="ynot-taxonomy-inline-back" onClick={back} aria-label="Back to previous category level">←</button>}{options.map((label,index)=><button key={`${stage}-${categoryId}-${subcategory}-${label}-${index}`} className={stage==="attributes"&&selected.includes(label)?"selected":""} onClick={()=>choose(label)}>{label}</button>)}</div></div>
}
