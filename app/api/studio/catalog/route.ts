import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

/**
 * YNOT Studio discovery expands the original curated 70 with YNOT's live
 * global catalogue. Results are discovery candidates; do not infer stock,
 * shipping to France, GTINs, or guaranteed YNOT checkout from them.
 */
const SEARCHES=[[["home","designer pendant light"],["fashion","women midi dress"],["beauty","face serum skincare"],["tech","wireless headphones"]],[["fitness","yoga mats"],["jewelry","silver necklace"],["kitchen","espresso coffee machine"],["outdoor","outdoor lounge chair"]],[["pets","dog beds"],["travel","cabin luggage suitcase"],["kids","baby toys"],["auto","car accessories"]],[["electric","electric dirt bike"],["sports","football training equipment"],["electric","electric scooter"],["sports","tennis racket"]],[["fitness","adjustable dumbbells"],["jewelry","gold earrings"],["kitchen","ceramic dinnerware"],["outdoor","patio furniture"]],[["pets","cat scratchers"],["travel","travel backpack"],["kids","baby stroller"],["auto","car phone mount"]],[["home","modern sofa"],["fashion","women sneakers"],["beauty","hair styling tools"],["tech","bluetooth speakers"]],[["fitness","running shoes"],["jewelry","bracelets jewelry"],["kitchen","air fryer"],["outdoor","garden lighting"]],[["pets","dog leash"],["travel","weekender bag"],["kids","kids clothing"],["auto","car organizer"]],[["home","travertine coffee table"],["fashion","handbags"],["beauty","moisturizer face cream"],["tech","digital camera"]],[["fitness","resistance bands"],["jewelry","rings jewelry"],["kitchen","cast iron cookware"],["outdoor","camping equipment"]],[["pets","cat toys"],["travel","travel accessories"],["kids","educational toys"],["auto","car detailing kit"]],
 [["electric","electric dirt bike"],["sports","football training equipment"],["electric","electric scooter"],["sports","tennis racket"]],
 [["electric","electric bicycle"],["sports","basketball accessories"],["electric","electric surfboard"],["sports","soccer ball"]]] as const;
type CatalogProduct={id?:string;title?:string;brand?:string;price?:number;currency?:string;image?:string;url?:string;description?:string;source?:string};
const rejection=/gift card|digital download|pattern only|manual pdf|replacement part|screen protector for|charger cable only|pillow case only|sofa cover|chair cover|slipcover|wall sticker|free shipping/i;
const checks:Record<string,RegExp>={
 home:/pendant|lamp|light|chandelier|armchair|chair|sofa|couch|table|console|ottoman|furniture|shelf|bed|rug|vase|mirror|decor|stool/i,
 fashion:/dress|shirt|sweater|cardigan|hoodie|trousers|pants|jeans|skirt|coat|jacket|sneaker|boots|shoes|handbag|tote|blouse|linen|jumpsuit/i,
 beauty:/serum|skincare|moisturiz|cream|lipstick|makeup|concealer|foundation|mascara|shampoo|hair|fragrance|perfume|conditioner/i,
 tech:/headphone|earbud|speaker|watch|camera|smartphone|phone|laptop|tablet|keyboard|mouse|monitor|projector|electronics/i,
 fitness:/yoga|dumbbell|resistance band|exercise|gym|fitness|running|training|kettlebell|pilates|sport/i,
 jewelry:/necklace|pendant|earring|bracelet|ring|jewelry|jewellery|gemstone/i,
 kitchen:/coffee|espresso|air fryer|cookware|cooking|dinnerware|ceramic|plate|cup|mug|pot|pan|cutlery|kettle/i,
 outdoor:/outdoor|patio|garden|camping|tent|pergola|lantern|lawn|grill/i,
 pets:/dog|cat|pet|leash|scratcher|kennel|aquarium/i,
 travel:/suitcase|luggage|backpack|travel|weekender|duffle|packing cube/i,
 kids:/baby|toddler|kids|children|stroller|toy|nursery|playset/i,
 auto:/car |auto|vehicle|automotive|detailing|dashboard|seat cover|carphone/i,
 electric:/electric|ebike|e-bike|scooter|dirt bike|efoil|surfboard/i,
 sports:/football|soccer|basketball|tennis|racket|ripple ball|sport|training ball/i
};
function score(title:string,brand:string,price:number,description:string){
 const txt=(title+" "+brand).toLowerCase();
 let n=0;
 if(/sculptur|designer|alabaster|travertine|boucl|rattan|contemporary|organic|ceramic|glass|brass|velvet|linen|natural stone|marble|walnut|handmade/.test(txt))n+=35;
 if(/modern|accent|architectural|statement|mid century|luxury/.test(txt))n+=15;
 if(price>=65&&price<=1600)n+=15;
 if(description.length>70)n+=10;
 if(title.length<=90)n+=5;
 return n;
}
export async function GET(req:NextRequest){
 const pageNumber=Number(req.nextUrl.searchParams.get("page")||"0");
 if(!Number.isInteger(pageNumber)||pageNumber<0||pageNumber>=SEARCHES.length)return NextResponse.json({products:[],hasMore:false,page:pageNumber});
 const queries=SEARCHES[pageNumber];
 const results=await Promise.allSettled(queries.map(async ([category,query])=>{
  const url=new URL("/api/catalog",req.nextUrl.origin);
  url.searchParams.set("q",query);url.searchParams.set("country","FR");url.searchParams.set("source","shopify");url.searchParams.set("category_load","1");
  const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(23000)});
  if(!response.ok)throw new Error("CATALOG_UNAVAILABLE");
  const data=await response.json() as {products?:CatalogProduct[]};
  return {category,query,products:Array.isArray(data.products)?data.products:[]};
 }));
 const distinct=new Map<string,any>();
 for(const result of results){
  if(result.status!=="fulfilled")continue;
  for(const p of result.value.products){
   const title=String(p.title||"").trim(),id=String(p.id||"");
   const category=result.value.category,price=Number(p.price);
   if(!id||!title||rejection.test(title)||!checks[category]?.test(title)||!/^https:\/\//.test(String(p.image||""))||!/^https:\/\//.test(String(p.url||"")))continue;
   if(!Number.isFinite(price)||price<5||price>12000||String(p.currency||"EUR").toUpperCase()!=="EUR")continue;
   const key=(title+" "+String(p.brand||"")).toLowerCase().replace(/[^a-z0-9]/g,"");
   if(distinct.has(key))continue;
   distinct.set(key,{id,title,brand:p.brand||"Independent store",price:Math.round(price*100)/100,
    image:p.image,sourceUrl:p.url,category,description:String(p.description||"").slice(0,420),
    score:score(title,p.brand||"",price,String(p.description||""))});
  }
 }
 const products=[...distinct.values()].sort((a,b)=>b.score-a.score).slice(0,280);
 return NextResponse.json({products,page:pageNumber,hasMore:pageNumber+1<SEARCHES.length,searches:queries.map(([,q])=>q),source:"YNOT live multi-store catalogue"},
  {headers:{"Cache-Control":"public, s-maxage=1800, stale-while-revalidate=3600"}});
}
