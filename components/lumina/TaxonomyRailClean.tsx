"use client";

import {useEffect,useMemo,useState} from "react";
import {SHOP_TAXONOMY,taxonomyCategory,type ShopCategory} from "./shopTaxonomy";
import ProductGalleryStability from "./ProductGalleryStability";

type Stage="category"|"subcategory"|"attributes";

const TAGS:Record<string,string[]>={
  Fashion:["Women","Men","Menswear","T-Shirts","Shirts","Hoodies","Sweatshirts","Joggers","Cargo Pants","Jeans","Jackets","Coats","Suits","Sneakers","Streetwear","Gym Wear","Activewear","Dresses","Tops","Bottoms","Denim","Knitwear","Outerwear","Swimwear","Occasionwear","Vintage"],
  "Jewelry & Accessories":["Rings","Necklaces","Earrings","Bracelets","Charms","Fine Jewelry","Watches","Sunglasses","Hats","Caps","Scarves","Belts","Wallets","Men's Watches","Chains"],
  Shoes:["Men's Sneakers","Sneakers","Trainers","Running Shoes","Gym Shoes","Basketball Shoes","Football Boots","Lifestyle","Boots","Loafers","Sandals","Hiking Shoes","Slides"],
  "Bags & Travel":["Backpacks","Gym Bags","Duffel Bags","Laptop Bags","Crossbody","Travel Bags","Luggage","Messenger Bags","Handbags","Shoulder Bags","Tote Bags","Pouches"],
  "Beauty & Personal Care":["Skincare","Men's Grooming","Shaving","Beard Care","Fragrance","Deodorant","Body Care","Hair Care","Makeup","Bath & Body","Beauty Tools","Self-Care Sets"],
  Hair:["Men's Hair","Shampoo","Conditioner","Repair","Scalp Care","Styling","Hair Tools","Volume","Curl Care","Hair Oils","Hair Accessories"],
  "Home & Living":["Furniture","Home Decor","Lighting","Kitchen","Dining","Bedding","Bathroom","Storage","Rugs","Wall Art","Mirrors","Candles","Garden"],
  "Fitness & Sports":["Gym Equipment","Gym Nutrition","Protein","Creatine","Supplements","Pre-Workout","Recovery","Shakers","Weight Training","Bodybuilding","Strength Training","Home Gym","Dumbbells","Kettlebells","Benches","Resistance Bands","Gym Clothing","Men's Activewear","Training Shoes","Running","Football","Basketball","Boxing","Cycling","Swimming","Outdoor Sports","Sports Accessories","Nike","adidas","Under Armour","Puma","Gymshark"],
  "Tech & Gadgets":["Phones","Phone Accessories","Computers","Computer Accessories","Audio","Headphones","Speakers","Gaming","Smart Home","Wearables","Cameras","Desk Tech","Charging","Gadgets"],
  "Auto & Mobility":["Car Accessories","Car Care","Interior Accessories","Exterior Accessories","Motorcycle","Cycling Accessories","EV Accessories","Dash Cams","Car Tech","Travel Safety"],
  "Outdoor & Adventure":["Camping","Hiking","Travel Gear","Outdoor Clothing","Outdoor Cooking","Hydration","Backpacks","Survival Gear","Beach","Fishing"],
  Gifts:["Gifts for Him","Gifts for Her","Couples","Birthday","Wedding","Anniversary","Baby","Housewarming","Personalized Gifts","Handmade Gifts","Gift Boxes"],
  Pets:["Dog","Cat","Pet Clothing","Collars & Leads","Beds","Toys","Feeding","Pet Accessories","Personalized Pet Gifts"],
};

const DETAIL:Record<string,string[]>={
  Men:["T-Shirts","Shirts","Hoodies","Sweatshirts","Jeans","Cargo Pants","Joggers","Jackets","Coats","Suits","Streetwear","Gym Wear","Sneakers","Accessories"],
  Menswear:["Casual","Streetwear","Smart Casual","Formal","Sportswear","Workwear","Oversized","Minimal","Premium","Designer","Basics","Seasonal"],
  "T-Shirts":["Graphic","Oversized","Slim Fit","Basic","Sports","Gym","Premium Cotton","Black","White","Streetwear"],
  Hoodies:["Oversized","Zip Up","Pullover","Gym","Streetwear","Black","Neutral","Graphic","Heavyweight"],
  Joggers:["Gym","Slim","Relaxed","Tech Fleece","Cargo","Running","Black","Grey","Performance"],
  "Cargo Pants":["Relaxed","Slim","Utility","Techwear","Streetwear","Black","Khaki","Ripstop"],
  Dresses:["Mini","Midi","Maxi","Bodycon","A-Line","Satin","Wedding Guest","Summer"],
  Tops:["T-Shirts","Blouses","Shirts","Knitwear","Crop","Tank","Long Sleeve","Oversized"],
  Denim:["Straight","Wide Leg","Skinny","Bootcut","High Rise","Low Rise","Dark Wash","Light Wash"],
  Swimwear:["Bikinis","One Piece","High Waist","Triangle","Cover Ups","Plus Size","Minimal","Resort"],
  Sneakers:["Lifestyle","Running","Retro","Platform","Low Top","High Top","White","Limited"],
  "Men's Sneakers":["Lifestyle","Running","Training","Basketball","Retro","Low Top","High Top","Black","White","Limited"],
  Heels:["Kitten","Block","Stiletto","Platform","Slingback","Black","Nude","Occasion"],
  Handbags:["Leather","Mini","Structured","Shoulder","Top Handle","Black","Neutral","Premium"],
  Skincare:["Dry Skin","Oily Skin","Sensitive","Acne","Glow","Barrier Repair","Anti-Aging","Fragrance Free"],
  Makeup:["Foundation","Concealer","Blush","Bronzer","Eyes","Lips","Natural","Longwear"],
  Furniture:["Sofas","Chairs","Tables","Shelving","Bedroom","Office","Small Space","Statement"],
  Lighting:["Table Lamps","Floor Lamps","Pendant","Wall Lights","Desk Lamps","Smart","Ambient","Minimal"],
  Activewear:["Leggings","Sports Bras","Sets","Tops","Shorts","Seamless","Running","Yoga"],
  "Men's Activewear":["Gym T-Shirts","Stringers","Tanks","Shorts","Joggers","Compression","Base Layers","Tracksuits","Training Jackets","Performance"],
  "Gym Equipment":["Dumbbells","Adjustable Dumbbells","Barbells","Weight Plates","Benches","Power Racks","Cable Machines","Pull-Up Bars","Resistance Bands","Kettlebells","Gym Flooring","Accessories"],
  "Gym Nutrition":["Whey Protein","Protein Powder","Creatine","Pre-Workout","Electrolytes","BCAA","Mass Gainer","Protein Bars","Shakers","Meal Prep","Recovery"],
  Protein:["Whey","Isolate","Casein","Vegan","Mass Gainer","Ready To Drink","Protein Bars","High Protein Snacks"],
  Creatine:["Monohydrate","Powder","Capsules","Unflavoured","Micronized","Stacks"],
  Supplements:["Vitamins","Minerals","Electrolytes","Omega 3","Magnesium","Recovery","Performance","Daily Health"],
  "Weight Training":["Dumbbells","Barbells","Benches","Racks","Belts","Straps","Gloves","Chalk","Plates","Machines"],
  Bodybuilding:["Protein","Creatine","Gym Clothing","Belts","Straps","Shakers","Meal Prep","Posing","Recovery","Training Gear"],
  Running:["Shoes","Tops","Shorts","Hydration","GPS","Reflective","Recovery","Race Day"],
  Football:["Boots","Balls","Training Kits","Shin Guards","Goalkeeper","Jerseys","Cones","Bags","Recovery"],
  Basketball:["Shoes","Balls","Jerseys","Shorts","Hoops","Training","Compression","Accessories"],
  Boxing:["Gloves","Hand Wraps","Punch Bags","Head Guards","Pads","Shorts","Shoes","Training Gear"],
  Nike:["Men's Shoes","Training","Running","Football","Basketball","Sportswear","T-Shirts","Shorts","Hoodies","Bags"],
  adidas:["Men's Shoes","Training","Running","Football","Sportswear","Tracksuits","T-Shirts","Shorts","Bags"],
  "Under Armour":["Training","Men's Activewear","Compression","Running","T-Shirts","Shorts","Shoes","Bags"],
  Puma:["Football","Running","Training","Sneakers","Sportswear","Tracksuits","T-Shirts"],
  Gymshark:["Men's Activewear","Stringers","T-Shirts","Shorts","Joggers","Compression","Gym Bags"],
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
  if(root==="fashion")return ["Men","Women","New Arrivals","Casual","Streetwear","Premium","Minimal","Black","Neutral","Summer","Occasion","Sportswear"];
  if(root==="skin"||root==="hair")return ["Best Sellers","Men's Grooming","Sensitive","Hydrating","Repair","Natural","Premium","Travel Size","Sets"];
  if(root==="home")return ["Modern","Minimal","Small Space","Storage","Natural","Premium","Smart","Best Sellers"];
  if(root==="fitness")return ["Men","Gym","Strength","Protein","Creatine","Equipment","Performance","Recovery","Training","Sports Brands","Top Rated","Premium"];
  if(root==="tech")return ["Portable","Wireless","Smart","Compact","Premium","Budget","Top Rated","New"];
  return ["New Arrivals","Best Value","Premium","Popular","Personalized","Handmade","Under €25","Under €50"];
}

function setInput(input:HTMLInputElement,value:string){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;setter?.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}))}
function esc(value:string){return value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}
function removeTerms(text:string,terms:string[]){let out=` ${text} `;for(const term of [...terms].sort((a,b)=>b.length-a.length)){out=out.replace(new RegExp(`\\s${esc(term)}(?=\\s|$)`,`ig`)," ")}return out.replace(/\s+/g," ").trim()}
function searchNow(category:ShopCategory,subcategory?:string,attributes:string[]=[],previousTags:string[]=[]){
 const tags=[subcategory,...attributes].filter(Boolean) as string[];window.dispatchEvent(new CustomEvent("shop:tags-changed",{detail:{tags,root:category.root,categoryId:category.id,category:category.label,path:subcategory?[subcategory,...attributes]:[]}}));
 const native=document.querySelector<HTMLInputElement>(".lv4-search input");
 if(!subcategory&&!attributes.length){if(native){setInput(native,category.query);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(".lv4-search button")?.click())}return}
 const bottom=document.querySelector<HTMLInputElement>(".ynot-bottom-search input"),base=removeTerms(bottom?.value||"",previousTags),combined=[base,...tags].filter(Boolean).join(" ").replace(/\s+/g," ").trim();
 if(bottom)setInput(bottom,combined);if(native)setInput(native,combined);if(native&&combined.length>=2)requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(".lv4-search button")?.click())
}

export default function TaxonomyRailClean(){
  const[stage,setStage]=useState<Stage>("category"),[categoryId,setCategoryId]=useState("fashion"),[subcategory,setSubcategory]=useState(""),[selected,setSelected]=useState<string[]>([]);
  const category=useMemo(()=>taxonomyCategory(categoryId),[categoryId]);
  const options=useMemo(()=>stage==="category"?SHOP_TAXONOMY.map(x=>x.label):stage==="subcategory"?(TAGS[category.label]||category.sub):fallbackFor(category,subcategory),[stage,category,subcategory]);
  useEffect(()=>{
    let frame=0;
    const polish=()=>{frame=0;const hair=document.querySelector<HTMLElement>(".lv4-category-bubble.cat-hair"),retail=document.querySelector<HTMLElement>(".lv4-category-bubble.cat-retail");if(hair){const b=hair.querySelector("b"),s=hair.querySelector("span");if(b)b.textContent="Health & Wellness";if(s)s.textContent="Recovery · sleep · wellness"}if(retail){const b=retail.querySelector("b"),s=retail.querySelector("span");if(b)b.textContent="Digital Product";if(s)s.textContent="Software · templates · courses"};const ynot=[...document.querySelectorAll<HTMLButtonElement>(".ynot-world-row button")].find(x=>x.textContent?.trim().toUpperCase()==="YNOT");if(ynot&&!ynot.dataset.ynotPointerGuard){ynot.dataset.ynotPointerGuard="1";ynot.addEventListener("pointerup",e=>e.stopImmediatePropagation(),true)}};
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(polish)};schedule();const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true});return()=>{observer.disconnect();if(frame)cancelAnimationFrame(frame)}
  },[]);
  function choose(label:string){
    if(stage==="category"){const next=SHOP_TAXONOMY.find(x=>x.label===label);if(!next)return;setCategoryId(next.id);setSubcategory("");setSelected([]);setStage("subcategory");searchNow(next);return}
    if(stage==="subcategory"){const previous=[subcategory,...selected].filter(Boolean);setSubcategory(label);setSelected([]);setStage("attributes");searchNow(category,label,[],previous);return}
    const previous=[subcategory,...selected].filter(Boolean),next=selected.includes(label)?selected.filter(x=>x!==label):[...selected,label].slice(-8);setSelected(next);searchNow(category,subcategory,next,previous)
  }
  function back(){if(stage==="attributes"){const previous=[subcategory,...selected].filter(Boolean);setStage("subcategory");setSelected([]);searchNow(category,undefined,[],previous);return}if(stage==="subcategory"){setStage("category");setSubcategory("");setSelected([]);window.dispatchEvent(new CustomEvent("shop:tags-changed",{detail:{tags:[],root:"",categoryId:"",category:"",path:[]}}))}}
  return <><ProductGalleryStability/><style>{`
    .lv4-category-bubble>b{font-size:clamp(28px,2.45vw,46px)!important;line-height:.98!important;letter-spacing:-.035em!important}.lv4-category-bubble>span{font-size:clamp(13px,1vw,18px)!important;line-height:1.15!important;margin-top:8px!important}
    @media(max-width:899px){.lv4-category-bubble>b{font-size:clamp(25px,7vw,36px)!important}.lv4-category-bubble>span{font-size:12px!important;max-width:170px!important}}
  `}</style><div className="ynot-taxonomy-progressive ynot-subcat ynot-taxonomy-inline" aria-label="Shopping category navigator"><div className="ynot-subcat-bubbles">{stage!=="category"&&<button className="ynot-taxonomy-inline-back" onClick={back} aria-label="Back to previous category level">←</button>}{options.map((label,index)=><button key={`${stage}-${categoryId}-${subcategory}-${label}-${index}`} className={stage==="attributes"&&selected.includes(label)?"selected":""} onClick={()=>choose(label)}>{label}</button>)}</div></div></>
}
