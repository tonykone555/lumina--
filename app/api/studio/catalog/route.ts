import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

/**
 * YNOT Studio discovery expands the original curated 70 with YNOT's live
 * global catalogue. Results are discovery candidates; do not infer stock,
 * shipping to France, GTINs, or guaranteed YNOT checkout from them.
 */
const SEARCHES=[
 ["sculptural pendant lights","modern chandeliers","designer hanging lamps","glass ceiling pendants"],
 ["boucle armchairs","designer accent chairs","sculptural lounge chairs","upholstered dining chairs"],
 ["contemporary modular sofas","modern sectional sofas","curved designer sofa","small space accent chair"],
 ["travertine coffee table","sculptural side tables","modern console tables","designer nesting tables"],
 ["rattan pendant lights","ceramic pendant lights","minimalist ceiling lamp","statement pendant chandelier"],
 ["velvet accent chairs","swivel armchairs","wood dining chairs","mid century modern lounge chair"],
 ["designer sofa bed","cream boucle couch","linen loveseat","modular corner sofa"],
 ["natural stone tables","marble coffee tables","organic shaped side table","designer console table"],
 ["wabi sabi pendant lighting","brass pendant chandelier","contemporary hanging lamps","alabaster hanging light"],
 ["contemporary occasional chairs","leather lounge chair","custom upholstered chair","architectural accent chair"],
 ["modern accent furniture","sculptural hallway console","minimalist living room sofa","luxury contemporary ottoman"],
 ["modern dining pendant light","handmade pendant lamp","scandinavian dining chair","statement interior furniture"]
] as const;
type CatalogProduct={id?:string;title?:string;brand?:string;price?:number;currency?:string;image?:string;url?:string;description?:string;source?:string};
const exclusion=/necklace|jewelry|jewellery|pendant charm|earring|bracelet|cover only|chair cover|sofa cover|slipcover|canopy kit|bulb only|bulb cover|replacement part|laptop|toy chair|gaming chair|high chair|wheelchair|chair mat|chair legs|tablecloth|table tennis|mystery box|jersey chair|pendant connector|lamp socket|mobile phone|christmas ornament/i;
function kind(title:string):"lighting"|"chairs"|"furniture"|null{
 if(/pendant (?:lamp|light)|chandelier|hanging (?:lamp|light)|ceiling (?:lamp|light)|suspension lamp|pendant lighting|pendant chandelier|pendant fixture/i.test(title))return "lighting";
 if(/armchair|accent chair|lounge chair|dining chair|occasional chair|swivel chair|upholstered chair|reading chair|side chair|accent seating|boucle chair|bouclé chair/i.test(title))return "chairs";
 if(/sofa|couch|loveseat|coffee table|side table|console table|nesting table|ottoman|accent table/i.test(title))return "furniture";
 return null;
}
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
 const results=await Promise.allSettled(queries.map(async query=>{
  const url=new URL("/api/catalog",req.nextUrl.origin);
  url.searchParams.set("q",query);url.searchParams.set("country","FR");url.searchParams.set("source","shopify");url.searchParams.set("category_load","1");
  const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(23000)});
  if(!response.ok)throw new Error("CATALOG_UNAVAILABLE");
  const data=await response.json() as {products?:CatalogProduct[]};
  return Array.isArray(data.products)?data.products:[];
 }));
 const distinct=new Map<string,any>();
 for(const result of results){
  if(result.status!=="fulfilled")continue;
  for(const p of result.value){
   const title=String(p.title||"").trim(),id=String(p.id||"");
   if(!id||!title||exclusion.test(title)||!/^https:\/\//.test(String(p.image||""))||!/^https:\/\//.test(String(p.url||"")))continue;
   const category=kind(title),price=Number(p.price);
   if(!category||!Number.isFinite(price)||price<40||price>4000||String(p.currency||"EUR").toUpperCase()!=="EUR")continue;
   const key=(title+" "+String(p.brand||"")).toLowerCase().replace(/[^a-z0-9]/g,"");
   if(distinct.has(key))continue;
   distinct.set(key,{id,title,brand:p.brand||"Independent store",price:Math.round(price*100)/100,
    image:p.image,sourceUrl:p.url,category,description:String(p.description||"").slice(0,420),
    score:score(title,p.brand||"",price,String(p.description||""))});
  }
 }
 const products=[...distinct.values()].sort((a,b)=>b.score-a.score).slice(0,270);
 return NextResponse.json({products,page:pageNumber,hasMore:pageNumber+1<SEARCHES.length,searches:queries,source:"YNOT live multi-store catalogue"},
  {headers:{"Cache-Control":"public, s-maxage=1800, stale-while-revalidate=3600"}});
}
