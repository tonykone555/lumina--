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
 Pets:["Dog","Cat","Pet Clothing","Collars & Leads","Beds","Toys","Feeding","Pet Accessories","Personalized Pet Gifts"]
};

const DETAIL:Record<string,string[]>={
 Men:["T-Shirts","Shirts","Hoodies","Sweatshirts","Jeans","Cargo Pants","Joggers","Jackets","Coats","Suits","Streetwear","Gym Wear","Sneakers","Accessories"],
 Menswear:["Casual","Streetwear","Smart Casual","Formal","Sportswear","Workwear","Oversized","Minimal","Premium","Designer","Basics","Seasonal"],
 Dresses:["Mini","Midi","Maxi","Bodycon","A-Line","Satin","Wedding Guest","Summer"],
 Sneakers:["Lifestyle","Running","Retro","Platform","Low Top","High Top","White","Limited"],
 "Men's Sneakers":["Lifestyle","Running","Training","Basketball","Retro","Low Top","High Top","Black","White","Limited"],
 "Gym Equipment":["Dumbbells","Adjustable Dumbbells","Barbells","Weight Plates","Benches","Power Racks","Cable Machines","Pull-Up Bars","Resistance Bands","Kettlebells","Gym Flooring","Accessories"],
 "Gym Nutrition":["Whey Protein","Protein Powder","Creatine","Pre-Workout","Electrolytes","BCAA","Mass Gainer","Protein Bars","Shakers","Meal Prep","Recovery"],
 Running:["Shoes","Road Running","Trail Running","Daily Trainer","Race Day","Cushioned","Stability","Lightweight","Waterproof","Reflective","Recovery"],
 Nike:["Men's Shoes","Training","Running","Football","Basketball","Sportswear","T-Shirts","Shorts","Hoodies","Bags"],
 adidas:["Men's Shoes","Training","Running","Football","Sportswear","Tracksuits","T-Shirts","Shorts","Bags"],
 Phones:["iPhone","Android","Unlocked","Budget","Premium","Compact","Large Screen","Refurbished"],
 Audio:["Headphones","Earbuds","Speakers","Soundbars","Portable","Noise Cancelling","Wireless","Premium"],
 Gaming:["Controllers","Headsets","Keyboards","Mice","Consoles","Desk Setup","RGB","Accessories"],
 Furniture:["Sofas","Chairs","Tables","Shelving","Bedroom","Office","Small Space","Statement"],
 Skincare:["Dry Skin","Oily Skin","Sensitive","Acne","Glow","Barrier Repair","Anti-Aging","Fragrance Free"]
};

const QUERY_GROUPS:{test:RegExp;tags:string[]}[]=[
 {test:/\b(running shoe|running shoes|runner|trainers?)\b/i,tags:["Men","Women","Road Running","Trail Running","Daily Trainer","Race Day","Cushioned","Lightweight","Stability","Neutral","Wide Fit","Waterproof","Breathable","Reflective","Nike","adidas","ASICS","HOKA","New Balance","On","Brooks","Under €100","€100–€150","Premium"]},
 {test:/\b(sneaker|sneakers)\b/i,tags:["Men","Women","Lifestyle","Running","Training","Retro","Low Top","High Top","Leather","Mesh","Chunky","Minimal","Nike","adidas","New Balance","Puma","Under €100","Premium"]},
 {test:/\b(hoodie|hoodies)\b/i,tags:["Men","Women","Oversized","Zip Up","Pullover","Heavyweight","Lightweight","Fleece","Gym","Streetwear","Minimal","Black","Neutral","Premium"]},
 {test:/\b(t[- ]?shirt|tee|tees)\b/i,tags:["Men","Women","Oversized","Slim Fit","Heavyweight","Performance","Graphic","Plain","Cotton","Gym","Streetwear","Premium"]},
 {test:/\b(chair|office chair|desk chair)\b/i,tags:["Ergonomic","High Back","Lumbar Support","Executive","Reclining","Mesh","Leather","Adjustable Arms","Headrest","Home Office","Premium","Under €200"]},
 {test:/\b(desk)\b/i,tags:["Standing Desk","Electric","Adjustable Height","Compact","Large","Cable Management","Home Office","Gaming","Wood","Black","Premium"]},
 {test:/\b(headphone|headphones|earbuds?)\b/i,tags:["Wireless","Noise Cancelling","Over-Ear","In-Ear","Gaming","Workout","Travel","Bluetooth","Low Latency","Premium","Budget"]},
 {test:/\b(phone|iphone|android)\b/i,tags:["Unlocked","Premium","Budget","Compact","Large Screen","Camera Focused","Long Battery","Refurbished","5G","Dual SIM"]},
 {test:/\b(protein|whey)\b/i,tags:["Whey","Isolate","Casein","Vegan","Mass Gainer","Low Sugar","High Protein","Chocolate","Vanilla","Unflavoured","Recovery","Shaker"]},
 {test:/\b(creatine)\b/i,tags:["Monohydrate","Micronized","Powder","Capsules","Unflavoured","Performance","Recovery","Stack"]},
 {test:/\b(dumbbell|dumbbells)\b/i,tags:["Adjustable","Hex","Rubber Coated","Home Gym","Heavy","Compact","Pair","Set","Storage Rack","Premium"]},
 {test:/\b(dress|dresses)\b/i,tags:["Mini","Midi","Maxi","Bodycon","A-Line","Satin","Wedding Guest","Party","Summer","Formal","Black","Red","Premium"]},
 {test:/\b(bag|backpack|duffel|luggage)\b/i,tags:["Men","Women","Leather","Waterproof","Laptop","Travel","Gym","Carry-On","Minimal","Black","Premium","Large Capacity"]}
];

function fallbackFor(category:ShopCategory,subcategory:string){const exact=DETAIL[subcategory];if(exact)return exact;const root=category.root;if(root==="fashion")return["Men","Women","Casual","Streetwear","Premium","Minimal","Sportswear","Occasion"];if(root==="fitness")return["Men","Gym","Strength","Protein","Creatine","Equipment","Performance","Recovery","Training","Sports Brands"];if(root==="tech")return["Portable","Wireless","Smart","Compact","Premium","Budget","Top Rated","New"];if(root==="home")return["Modern","Minimal","Small Space","Storage","Natural","Premium","Smart","Best Sellers"];return["Best Value","Premium","Popular","Under €25","Under €50","New Arrivals"]}
function normalize(v:string){return v.toLowerCase().replace(/[^a-z0-9€]+/g," ").replace(/\s+/g," ").trim()}
function queryAwareTags(query:string,category:ShopCategory,subcategory:string){const q=normalize(query);const exact=QUERY_GROUPS.find(group=>group.test.test(query))?.tags||[];const base=[...exact,...fallbackFor(category,subcategory)];const seen=new Set<string>();return base.filter(tag=>{const n=normalize(tag);if(!n||seen.has(n))return false;seen.add(n);if(q.includes(n))return false;return true}).slice(0,24)}

export default function TaxonomyRailClean(){
 const[stage,setStage]=useState<Stage>("category"),[categoryId,setCategoryId]=useState("fashion"),[subcategory,setSubcategory]=useState(""),[selected,setSelected]=useState<string[]>([]),[typedQuery,setTypedQuery]=useState("");
 const category=useMemo(()=>taxonomyCategory(categoryId),[categoryId]);
 const options=useMemo(()=>{if(stage==="category")return SHOP_TAXONOMY.map(x=>x.label);if(stage==="subcategory")return TAGS[category.label]||category.sub;return queryAwareTags(typedQuery,category,subcategory)},[stage,category,subcategory,typedQuery]);
 useEffect(()=>{const input=document.querySelector<HTMLInputElement>(".ynot-bottom-search input");if(!input)return;const sync=()=>setTypedQuery(input.value);sync();input.addEventListener("input",sync);return()=>input.removeEventListener("input",sync)},[]);
 useEffect(()=>{let frame=0;const polish=()=>{frame=0;const hair=document.querySelector<HTMLElement>(".lv4-category-bubble.cat-hair"),retail=document.querySelector<HTMLElement>(".lv4-category-bubble.cat-retail");if(hair){const b=hair.querySelector("b"),s=hair.querySelector("span");if(b)b.textContent="Health & Wellness";if(s)s.textContent="Recovery · sleep · wellness"}if(retail){const b=retail.querySelector("b"),s=retail.querySelector("span");if(b)b.textContent="Digital Product";if(s)s.textContent="Software · templates · courses"}};const schedule=()=>{if(!frame)frame=requestAnimationFrame(polish)};schedule();const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true});return()=>{observer.disconnect();if(frame)cancelAnimationFrame(frame)}},[]);
 function emit(tags:string[]){window.dispatchEvent(new CustomEvent("shop:tags-changed",{detail:{tags,root:category.root,categoryId:category.id,category:category.label,path:[subcategory,...tags].filter(Boolean)}}))}
 function choose(label:string){if(stage==="category"){const next=SHOP_TAXONOMY.find(x=>x.label===label);if(!next)return;setCategoryId(next.id);setSubcategory("");setSelected([]);setStage("subcategory");return}if(stage==="subcategory"){setSubcategory(label);setSelected([]);setStage("attributes");emit([label]);return}const next=selected.includes(label)?selected.filter(x=>x!==label):[...selected,label].slice(-8);setSelected(next);emit([subcategory,...next].filter(Boolean))}
 function back(){if(stage==="attributes"){setStage("subcategory");setSelected([]);emit([]);return}if(stage==="subcategory"){setStage("category");setSubcategory("");setSelected([]);emit([])}}
 return <><ProductGalleryStability/><style>{`.lv4-category-bubble>b{font-size:clamp(28px,2.45vw,46px)!important;line-height:.98!important;letter-spacing:-.035em!important}.lv4-category-bubble>span{font-size:clamp(13px,1vw,18px)!important;line-height:1.15!important;margin-top:8px!important}.ynot-subcat-bubbles button.selected{border-color:rgba(255,255,255,.7)!important;background:rgba(255,255,255,.16)!important}@media(max-width:899px){.lv4-category-bubble>b{font-size:clamp(25px,7vw,36px)!important}.lv4-category-bubble>span{font-size:12px!important;max-width:170px!important}}`}</style><div className="ynot-taxonomy-progressive ynot-subcat ynot-taxonomy-inline" aria-label="Shopping category navigator"><div className="ynot-subcat-bubbles">{stage!=="category"&&<button className="ynot-taxonomy-inline-back" onClick={back} aria-label="Back">←</button>}{options.map((label,index)=><button key={`${stage}-${categoryId}-${subcategory}-${label}-${index}`} className={stage==="attributes"&&selected.includes(label)?"selected":""} onClick={()=>choose(label)}>{label}</button>)}</div></div></>
}
