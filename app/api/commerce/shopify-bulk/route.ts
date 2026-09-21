import {NextRequest,NextResponse} from "next/server";
import {listSelectedCommerceProducts} from "@/lib/commerce/catalog-store";
import {fxRate} from "@/lib/commerce/currency";

export const runtime="nodejs";
export const maxDuration=60;

function safe(v:unknown){return String(v||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()}
function slug(v:string){return v.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,48)}
function categoryLabel(v:string){
  return ({fashion:"Apparel & Accessories",beauty:"Health & Beauty",tech:"Electronics",fitness:"Sporting Goods",home:"Home & Garden",kitchen:"Kitchen & Dining",pets:"Pet Supplies",office:"Office Supplies",travel:"Luggage & Travel",outdoors:"Outdoor Recreation",gifts:"Gifts"} as Record<string,string>)[v]||"General Merchandise";
}

export async function GET(req:NextRequest){
  const rows:any[]=await listSelectedCommerceProducts(10000);
  const groups=new Map<string,any[]>();
  for(const row of rows){
    const key=String(row.fingerprint||row.source_product_id||row.ynot_id);
    const arr=groups.get(key)||[]; arr.push(row); groups.set(key,arr);
  }

  const rates=new Map<string,number>();
  rates.set("EUR",1);
  const currencies=[...new Set(rows.map(r=>String(r.currency||"EUR").toUpperCase()))];
  await Promise.all(currencies.map(async c=>{
    if(c==="EUR")return;
    try{rates.set(c,await fxRate(c,"EUR"))}catch{rates.set(c,1)}
  }));

  const chosen=[...groups.entries()].map(([fingerprint,items])=>{
    const sorted=[...items].sort((a,b)=>{
      const ae=String(a.currency).toUpperCase()==="EUR"?1:0,be=String(b.currency).toUpperCase()==="EUR"?1:0;
      if(ae!==be)return be-ae;
      return Number(b.selection_score||0)-Number(a.selection_score||0);
    });
    const p=sorted[0],currency=String(p.currency||"EUR").toUpperCase(),rate=rates.get(currency)||1;
    const price=Math.max(.5,Math.round(Number(p.ynot_price||0)*rate*100)/100);
    const title=safe(p.cleaned_title||p.title).slice(0,150);
    const brand=safe(p.source_brand||p.brand||"").slice(0,80);
    const category=String(p.category||"general");
    const tags=[..."YNOT,commerce-ready,chatgpt-ready".split(","),category,...(Array.isArray(p.search_terms)?p.search_terms:[])].map(s=>safe(s)).filter(Boolean).slice(0,30);
    const images=[...new Set([p.image_url,...(Array.isArray(p.image_urls)?p.image_urls:[])].filter((x:any)=>/^https:\/\//i.test(String(x))))].slice(0,6);
    const ynotUrl="https://ynotworld.app/p/"+encodeURIComponent(p.ynot_id);
    const desc=(title+" by "+(brand||"YNOT")+". "+categoryLabel(category)+" selected and verified by YNOT. Shop through YNOT.").slice(0,900);
    return {
      input:{
        handle:"ynot-"+slug(fingerprint).slice(0,30),
        title,
        descriptionHtml:"<p>"+desc.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")+"</p>",
        vendor:"YNOT",
        productType:categoryLabel(category),
        status:"ACTIVE",
        tags,
        seo:{title,description:desc.slice(0,320)},
        metafields:[
          {namespace:"ynot",key:"ynot_id",type:"single_line_text_field",value:String(p.ynot_id)},
          {namespace:"ynot",key:"fingerprint",type:"single_line_text_field",value:String(fingerprint)},
          {namespace:"ynot",key:"external_url",type:"url",value:ynotUrl},
          {namespace:"ynot",key:"source_brand",type:"single_line_text_field",value:brand||"YNOT"}
        ],
        files:images.map((url:string)=>({originalSource:url,contentType:"IMAGE",alt:title})),
        productOptions:[{name:"Title",values:[{name:"Default Title"}]}],
        variants:[{
          optionValues:[{optionName:"Title",name:"Default Title"}],
          price:String(price.toFixed(2)),
          sku:"YNOT-"+String(p.ynot_id).replace(/^ynot-[a-z]{2}-/i,"").slice(0,12).toUpperCase(),
          inventoryItem:{tracked:false,requiresShipping:true}
        }]
      }
    };
  });

  const body=chosen.map(x=>JSON.stringify(x)).join("\n")+"\n";
  return new NextResponse(body,{headers:{
    "Content-Type":"application/jsonl; charset=utf-8",
    "Content-Disposition":"inline; filename=ynot-shopify-products.jsonl",
    "Cache-Control":"no-store",
    "X-YNOT-Unique-Products":String(chosen.length)
  }});
}
