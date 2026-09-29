export type Channel3Product={id:string;title:string;brand:string;price:number|null;currency?:string;image:string;images?:string[];url:string;description?:string;tags?:string[];source:string;merchant?:string;commissionRate?:number|null;availability?:string;verifiedMerchant?:boolean;[key:string]:unknown};

/* Channel3 is intentionally a small premium-retailer layer in YNOT Room.
   Keeping this list narrow avoids spending search credits on the full graph. */
export const CHANNEL3_HOME_RETAILERS=[
 "ikea.com","homedepot.com","walmart.com","wayfair.com","westelm.com","cb2.com",
 "potterybarn.com","crateandbarrel.com","article.com","ashleyfurniture.com","target.com",
 "lowes.com","zarahome.com"
] as const;
const HOME_WORDS=/\b(sofa|couch|sectional|loveseat|chair|armchair|table|desk|bed|mattress|cabinet|dresser|wardrobe|shelf|shelving|sideboard|console|bench|stool|ottoman|rug|carpet|lamp|light|mirror|planter|plant|decor|furniture|home|kitchen|dining|living room|bedroom|storage|bookcase|bookshelf)\b/i;

function text(v:unknown){return typeof v==="string"?v.trim():""}
function money(v:any){const candidates=[v?.price,v?.amount,v?.value,v?.sale_price,v?.current_price];for(const x of candidates){if(typeof x==="number"&&Number.isFinite(x))return x;if(typeof x==="string"){const n=Number.parseFloat(x.replace(/[^0-9,.-]/g,"").replace(",","."));if(Number.isFinite(n))return n}}return null}
function currency(v:any){return text(v?.currency)||text(v?.price?.currency)||text(v?.offer?.currency)||"USD"}
function imageUrl(v:any){return text(v?.url)||text(v?.src)||text(v?.image_url)||text(v?.imageUrl)}
function offerList(p:any){return Array.isArray(p?.offers)?p.offers:Array.isArray(p?.merchant_offers)?p.merchant_offers:p?.offer?[p.offer]:[]}
function host(v:string){try{return new URL(v).hostname.toLowerCase().replace(/^www\./,"")}catch{return""}}
function allowedDomain(v:string){const h=host(v)||v.toLowerCase().replace(/^www\./,"");return CHANNEL3_HOME_RETAILERS.some(d=>h===d||h.endsWith(`.${d}`))}
function offerUrl(o:any){return text(o?.affiliate_url)||text(o?.affiliateUrl)||text(o?.url)||text(o?.merchant_url)||text(o?.merchantUrl)}
function bestOffer(p:any){const offers=offerList(p).filter(Boolean);return offers.find((o:any)=>allowedDomain(offerUrl(o))&&o?.availability!=="out_of_stock"&&o?.available!==false)||offers.find((o:any)=>allowedDomain(offerUrl(o)))||null}
function productImages(p:any){const raw=[p?.image,p?.image_url,p?.imageUrl,p?.thumbnail,...(Array.isArray(p?.images)?p.images:[])];return [...new Set(raw.map(imageUrl).concat(raw.filter((x:any)=>typeof x==="string")).filter(Boolean))].slice(0,10)}

export async function searchChannel3(query:string,{limit=24,country="FR"}:{limit?:number;country?:string}={}):Promise<Channel3Product[]>{
 const apiKey=process.env.CHANNEL3_API_KEY;if(!apiKey)return[];
 const clean=query.trim();if(!clean||!HOME_WORDS.test(clean))return[];
 const response=await fetch("https://api.trychannel3.com/v1/search",{method:"POST",headers:{"x-api-key":apiKey,"content-type":"application/json",accept:"application/json"},body:JSON.stringify({query:clean,filters:{website_ids:[...CHANNEL3_HOME_RETAILERS]},config:{country},limit:Math.min(Math.max(limit,1),40)}),next:{revalidate:21600}});
 if(!response.ok){const detail=await response.text().catch(()=>"");throw new Error(`CHANNEL3_${response.status}:${detail.slice(0,240)}`)}
 const raw:any=await response.json();const rows=Array.isArray(raw)?raw:Array.isArray(raw?.products)?raw.products:Array.isArray(raw?.results)?raw.results:Array.isArray(raw?.data)?raw.data:Array.isArray(raw?.items)?raw.items:[];
 return rows.map((p:any,index:number)=>{const offer=bestOffer(p);if(!offer)return null;const images=productImages(p);const url=offerUrl(offer)||text(p?.url)||text(p?.product_url)||text(p?.productUrl);if(!allowedDomain(url))return null;const brand=text(p?.brand?.name)||text(p?.brand)||text(p?.manufacturer)||text(offer?.brand)||"";const merchant=text(offer?.merchant?.name)||text(offer?.merchant)||text(offer?.seller?.name)||text(offer?.seller)||text(offer?.domain)||host(url);const price=money(offer)??money(p);const rate=Number(offer?.commission_rate??offer?.commissionRate??p?.commission_rate??p?.commissionRate);return{id:`channel3-${text(p?.id)||text(p?.product_id)||index}`,title:text(p?.title)||text(p?.name)||"Product",brand:brand||merchant,price,currency:currency(offer)||currency(p),image:images[0]||imageUrl(offer?.image),images,url,description:text(p?.description)||text(p?.subtitle),tags:["Channel3","Verified retailer",merchant].filter(Boolean),source:"channel3",merchant,commissionRate:Number.isFinite(rate)?rate:null,availability:text(offer?.availability)||text(p?.availability),verifiedMerchant:true} as Channel3Product}).filter((p:any):p is Channel3Product=>Boolean(p?.title&&p?.image&&p?.url&&p?.price&&p.price>0));
}
