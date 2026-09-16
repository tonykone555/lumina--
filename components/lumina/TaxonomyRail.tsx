"use client";

import {useMemo,useState} from "react";
import {ChevronLeft} from "lucide-react";
import {SHOP_TAXONOMY,taxonomyCategory,type ShopCategory} from "./shopTaxonomy";

type Stage="category"|"subcategory"|"attributes";

const EXACT:Record<string,string[]>={
 "AI Tools":["Writing","Image Generation","Video","Research","Productivity","Marketing","Customer Support","Business"],
 "ChatGPT & Prompts":["Business","Marketing","Sales","Content","SEO","Study","Coding","Prompt Packs"],
 "AI Agents":["Sales Agent","Support Agent","Voice Agent","Research Agent","Marketing Agent","Workflow Agent","No-Code","Templates"],
 "Automation":["Zapier","Make","n8n","CRM","Email","Social Media","Lead Gen","Ecommerce"],
 "Content AI":["Copywriting","Social Posts","Blogging","Video Scripts","SEO","Email","Repurposing","Creator"],
 "Design AI":["Logos","Branding","Images","Presentations","Mockups","Social Media","Product Design","Templates"],
 "Business AI":["Sales","Marketing","Operations","Customer Support","Analytics","Lead Gen","Ecommerce","Small Business"],
 "Productivity AI":["Notes","Meetings","Scheduling","Research","Writing","Task Management","Knowledge Base","Personal"],
 "Developer AI":["Coding","Debugging","APIs","Agents","Automation","Web Apps","No-Code","Developer Tools"],
 "No-Code Tools":["Website Builder","Automation","Database","App Builder","Forms","CRM","AI Builder","Templates"],
 "AI Templates":["Prompts","Agents","Workflows","Notion","Business","Marketing","Content","Automation"],
 "AI Workflows":["Lead Generation","Content","Sales","Support","Research","Ecommerce","Operations","Personal"],
 "Online Courses":["Beginner","Intermediate","Advanced","Self-Paced","Certificate","Video Course","Workbook","Bundle"],
 "Coaching":["Business","Life","Career","Fitness","Mindset","Dating","Executive","1-to-1"],
 "AI Training":["ChatGPT","Automation","AI Agents","Prompting","Business AI","Content AI","No-Code","Beginner"],
 "Business & Marketing":["Entrepreneurship","Digital Marketing","SEO","Social Media","Sales","Email Marketing","Branding","Ecommerce"],
 "Fitness Coaching":["Fat Loss","Muscle Gain","Running","Home Training","Nutrition","Mobility","Beginners","Personal Plan"],
 "Language Learning":["English","French","Spanish","German","Conversation","Grammar","Beginners","Exam Prep"],
 "Creative Skills":["Design","Drawing","Painting","Crafts","Music","Writing","Photography","Video"],
 "Career Skills":["CV","Interview","Leadership","Management","Freelancing","Remote Work","Productivity","Career Change"],
 "Coding & Tech":["Web Development","Python","JavaScript","AI","Data","Apps","No-Code","Beginners"],
 "Finance Education":["Budgeting","Investing Basics","Business Finance","Bookkeeping","Personal Finance","Spreadsheets","Beginners","Templates"],
 "Personal Development":["Mindset","Habits","Confidence","Productivity","Relationships","Journaling","Goals","Wellness"],
 "Teacher Resources":["Lesson Plans","Worksheets","Classroom","Homeschool","Primary","Secondary","Printable","Bundles"],
 "Exam Prep":["Study Guides","Flashcards","Practice Tests","Revision","Math","Languages","Science","Digital"],
 "Music Lessons":["Guitar","Piano","Singing","Music Theory","Production","Beginners","Intermediate","Video Lessons"],
 "Photography Courses":["Portrait","Product","Editing","Lightroom","Mobile","Business","Beginners","Advanced"],
 "Ebooks":["Business","Self Help","Fitness","Recipes","Marketing","AI","Education","Guides"],
 "Guides":["How-To","Business","Travel","Fitness","Beauty","Marketing","Study","Step-by-Step"],
 "Printables":["Planner","Kids","Wall Art","Budget","Wedding","Teacher","Wellness","Organization"],
 "Digital Planners":["Daily","Weekly","Budget","Fitness","Study","Business","GoodNotes","Undated"],
 "Notion Templates":["Business","CRM","Content","Student","Finance","Goals","Project Management","Creator"],
 "Canva Templates":["Instagram","Branding","Presentations","Ebooks","Media Kit","Business","Pinterest","Marketing"],
 "Spreadsheets":["Budget","Business","Inventory","CRM","Finance","Project","Fitness","Planner"],
 "Presets":["Lightroom","Mobile","Portrait","Travel","Warm","Moody","Bright","Creator"],
 "Fonts":["Serif","Sans Serif","Script","Display","Handwritten","Retro","Minimal","Bundle"],
 "Icons":["Business","App","Social","Minimal","3D","Line","Color","Bundle"],
 "Mockups":["Apparel","Packaging","Phone","Laptop","Book","Cosmetics","Branding","Bundle"],
 "Website Templates":["Ecommerce","Portfolio","Business","Landing Page","Blog","Creator","Minimal","Premium"],
 "Shopify Themes":["Fashion","Beauty","Home","Single Product","Luxury","Minimal","Conversion","Mobile First"],
 "App Templates":["SaaS","Marketplace","Dashboard","Mobile App","AI App","CRM","Landing Page","No-Code"],
 "Stock Photos":["Lifestyle","Business","Fashion","Food","Travel","Wellness","Product","Bundle"],
 "Video Assets":["Reels","Transitions","LUTs","Overlays","Templates","B-Roll","Creator","Bundle"],
 "Music & SFX":["Lo-Fi","Cinematic","Podcast","YouTube","Ambient","Sound Effects","Loops","Royalty Free"],
 "SVG & Cricut Files":["Quotes","Seasonal","Wedding","Kids","Craft","Shirts","Bundles","Commercial Use"],
 "Business Templates":["Startup","Freelancer","Agency","Ecommerce","Finance","Operations","Planning","Bundle"],
 "Marketing Templates":["Social Media","Email","Ads","SEO","Content","Launch","Strategy","Bundle"],
 "Social Media Kits":["Instagram","TikTok","YouTube","Pinterest","Branding","Creator","Business","Bundle"],
 "Branding Kits":["Logo","Colors","Fonts","Brand Guide","Social","Packaging","Minimal","Premium"],
 "Email Templates":["Sales","Welcome","Newsletter","Abandoned Cart","Launch","Cold Email","Follow-Up","Ecommerce"],
 "Sales Scripts":["Cold Call","DM","Discovery Call","Closing","Objections","Follow-Up","B2B","High Ticket"],
 "SOPs":["Operations","Sales","Marketing","Customer Service","Hiring","Ecommerce","Agency","Templates"],
 "Business Plans":["Startup","Ecommerce","Agency","Coach","Restaurant","Retail","Financial Model","Template"],
 "Resume & CV":["Modern","ATS","Creative","Executive","Student","Cover Letter","Canva","Bundle"],
 "Portfolio Templates":["Designer","Photographer","Developer","Freelancer","Creator","Minimal","Canva","Website"],
 "Client Forms":["Onboarding","Questionnaire","Contract","Brief","Feedback","Invoice","Coach","Agency"],
 "Invoice Templates":["Freelancer","Small Business","Minimal","Canva","Excel","Google Sheets","Service","Bundle"],
 "Presentation Templates":["Pitch Deck","Business","Investor","Marketing","Canva","PowerPoint","Minimal","Modern"],
 "Consulting":["Business","Marketing","Ecommerce","Brand","Strategy","Operations","1-to-1","Audit"],
 "Design Services":["Logo","Branding","Website","Social Media","Packaging","Illustration","Canva","Custom"],
 "Marketing Services":["SEO","Social Media","Ads","Email","Content","Strategy","Audit","Ecommerce"],
 "Memberships":["Monthly","Annual","Education","Fitness","Business","Creator","Premium","Community"],
 "Communities":["Business","AI","Fitness","Creators","Learning","Accountability","Private","Premium"],
 "Paid Newsletters":["Business","AI","Marketing","Finance","Creator","Research","Weekly","Premium"],
 "Masterminds":["Business","Entrepreneurship","Marketing","High Ticket","Group Coaching","Accountability","Monthly","Premium"],
 "Resource Libraries":["Templates","Courses","Prompts","Design Assets","Business","Creator","Lifetime Access","Membership"],
 "Subscription Boxes":["Beauty","Food","Fitness","Pets","Books","Crafts","Lifestyle","Monthly"],
 "Car Accessories":["Interior","Exterior","Phone Mounts","Storage","Cleaning","Lighting","Travel","Tech"],
 "Car Care":["Cleaning","Detailing","Polish","Interior","Exterior","Kits","Tools","Premium"],
 "Power Tools":["Drills","Saws","Sanders","Drivers","Cordless","Workshop","DIY","Professional"],
 "Hand Tools":["Tool Sets","Screwdrivers","Wrenches","Pliers","Measuring","Woodworking","DIY","Professional"],
 "Camping":["Tents","Sleeping","Cooking","Lighting","Furniture","Backpacks","Family","Ultralight"],
 "Hiking":["Shoes","Backpacks","Poles","Hydration","Clothing","Navigation","Lightweight","Trail"],
 "Crystals":["Amethyst","Quartz","Rose Quartz","Protection","Love","Healing","Raw","Sets"],
 "Tarot":["Decks","Beginner","Vintage","Oracle","Guidebook","Art Deck","Spreads","Accessories"],
 "Astrology":["Zodiac","Birth Chart","Journals","Jewelry","Wall Art","Readings","Guides","Gifts"]
};

function attributesFor(label:string){
 const exact=EXACT[label];if(exact)return exact;
 const l=label.toLowerCase();
 if(/ai|automation|prompt|agent|no-code|workflow/.test(l))return ["Beginner","Business","Creator","Automation","Templates","No-Code","Productivity","Advanced"];
 if(/course|coaching|training|learning|education|lesson|skills|exam/.test(l))return ["Beginner","Intermediate","Advanced","Self-Paced","1-to-1","Certificate","Digital","Bundle"];
 if(/digital|template|ebook|guide|printable|planner|preset|font|icon|mockup|svg/.test(l))return ["Instant Download","Editable","Canva","Commercial Use","Beginner","Bundle","Premium","Best Value"];
 if(/business|marketing|sales|consult|service|branding|resume|invoice|sop/.test(l))return ["Small Business","Freelancer","Agency","Ecommerce","Beginner","Professional","Template","Premium"];
 if(/membership|community|newsletter|mastermind|subscription/.test(l))return ["Monthly","Annual","Beginner","Premium","Community","Resources","Live Access","Digital"];
 if(/car|auto|motor/.test(l))return ["Universal","Interior","Exterior","Portable","Smart","Budget","Premium","Top Rated"];
 if(/tool|diy|hardware|workshop/.test(l))return ["DIY","Professional","Cordless","Compact","Heavy Duty","Starter Kit","Premium","Top Rated"];
 if(/camp|hiking|outdoor|adventure|fishing/.test(l))return ["Lightweight","Waterproof","Compact","Beginner","Travel","Premium","Family","Adventure"];
 if(/crystal|tarot|oracle|astrology|ritual|spiritual/.test(l))return ["Beginner","Handmade","Personalized","Gift","Premium","Vintage","Natural","Set"];
 return ["New Arrivals","Best Value","Premium","Popular","Personalized","Handmade","Under €25","Under €50"];
}

function setInput(input:HTMLInputElement,value:string){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;setter?.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}))}
function searchNow(category:ShopCategory,subcategory?:string,attributes:string[]=[]){const terms=[category.query,subcategory,...attributes].filter(Boolean).join(" ");const tags=[subcategory,...attributes].filter(Boolean) as string[];window.dispatchEvent(new CustomEvent("shop:tags-changed",{detail:{tags,root:category.root,path:subcategory?[subcategory,...attributes]:[]}}));const input=document.querySelector<HTMLInputElement>(".lv4-search input");if(input){setInput(input,terms);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(".lv4-search button")?.click())}}

export default function TaxonomyRail(){
 const[stage,setStage]=useState<Stage>("category"),[categoryId,setCategoryId]=useState("fashion"),[subcategory,setSubcategory]=useState(""),[selected,setSelected]=useState<string[]>([]);
 const category=useMemo(()=>taxonomyCategory(categoryId),[categoryId]);
 const options=useMemo(()=>stage==="category"?SHOP_TAXONOMY.map(x=>x.label):stage==="subcategory"?category.sub:attributesFor(subcategory),[stage,category,subcategory]);
 function choose(label:string){if(stage==="category"){const next=SHOP_TAXONOMY.find(x=>x.label===label);if(!next)return;setCategoryId(next.id);setSubcategory("");setSelected([]);setStage("subcategory");searchNow(next);return}if(stage==="subcategory"){setSubcategory(label);setSelected([]);setStage("attributes");searchNow(category,label);return}const next=selected.includes(label)?selected.filter(x=>x!==label):[...selected,label].slice(-4);setSelected(next);searchNow(category,subcategory,next)}
 function back(){if(stage==="attributes"){setStage("subcategory");setSelected([]);searchNow(category,subcategory)}else if(stage==="subcategory"){setStage("category");setSubcategory("");setSelected([])}}
 return <div className="ynot-taxonomy-progressive ynot-subcat" aria-label="Shopping category navigator">
  {stage!=="category"&&<div className="ynot-subcat-head"><button className="ynot-subcat-back" onClick={back} aria-label="Back"><ChevronLeft/></button><div><small>{stage==="subcategory"?"CATEGORY":"REFINE"}</small><b>{stage==="subcategory"?category.label:subcategory}</b><span>{stage==="subcategory"?"Choose a subcategory":"Add up to four attributes for more accurate results"}</span></div></div>}
  {stage==="attributes"&&selected.length>0&&<div className="ynot-subcat-head ynot-subcat-head-minimal"><span className="ynot-subcat-count active">{selected.length}</span><b>{selected.join(" + ")}</b></div>}
  <div className="ynot-subcat-bubbles">{options.map((label,index)=><button key={`${stage}-${categoryId}-${subcategory}-${label}-${index}`} className={stage==="attributes"&&selected.includes(label)?"selected":""} onClick={()=>choose(label)}>{label}</button>)}</div>
 </div>
}
