"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowUpRight,Bookmark,Check,ExternalLink} from "lucide-react";
type Item={id:string;title:string;brand:string;price:number;image:string;sourceUrl:string;category:string;description?:string};
function money(n:number){return new Intl.NumberFormat("en-GB",{style:"currency",currency:"EUR",maximumFractionDigits:2}).format(n)}
function fromCatalog(p:any):Item{return{id:String(p.id),title:String(p.title||""),brand:String(p.brand||""),price:Number(p.price||0),image:String(p.image||""),sourceUrl:String(p.url||""),category:String(p.category||"furniture"),description:String(p.description||"")}}
export default function StudioProductPage({productId,queryTitle,initial}:{productId:string;queryTitle:string;initial:Item|null}){
 const [product,setProduct]=useState<Item|null>(initial);
 const [loading,setLoading]=useState(!initial);
 const [saved,setSaved]=useState(false);
 const [photo,setPhoto]=useState("");
 useEffect(()=>{
  let live=true;
  try{const stored=sessionStorage.getItem("ynot-studio-product:"+productId);if(stored){const item=JSON.parse(stored);if(live&&item.id===productId){setProduct(item);setLoading(false)}}}catch{}
  const search=async()=>{if(initial)return;try{const r=await fetch("/api/catalog?country=FR&source=shopify&q="+encodeURIComponent(queryTitle),{signal:AbortSignal.timeout(25000)});const j=await r.json();const match=(Array.isArray(j.products)?j.products:[]).find((p:any)=>String(p.id)===productId);if(live&&match){const item=fromCatalog(match);setProduct(item)}}catch{}finally{if(live)setLoading(false)}};if(!initial&&queryTitle)void search();else setLoading(false);
  return()=>{live=false};
 },[productId,queryTitle,initial]);
 useEffect(()=>{if(!product)return;try{const old=JSON.parse(localStorage.getItem("ynot-saved-items")||"[]");setSaved(Array.isArray(old)&&old.some((p:any)=>String(p.id)===product.id))}catch{}},[product?.id]);
 const save=()=>{if(!product)return;let rows:any[]=[];try{const v=JSON.parse(localStorage.getItem("ynot-saved-items")||"[]");if(Array.isArray(v))rows=v}catch{}
 const exists=rows.some(p=>String(p.id)===product.id);const item={...product,currency:"EUR",url:product.sourceUrl,images:[product.image],source:"shopify-global-catalog",section:"Studio",sections:["Studio"],note:"Saved from YNOT Studio"};const next=exists?rows.filter(p=>String(p.id)!==product.id):[item,...rows];localStorage.setItem("ynot-saved-items",JSON.stringify(next));localStorage.setItem("ynot-saved-products",JSON.stringify(next.map(p=>p.id)));setSaved(!exists);window.dispatchEvent(new Event("ynot:saves-changed"));};
 return <main className="ynot-studio-product">
  <header><Link href={"/worlds/studio?product="+encodeURIComponent(productId)}><ArrowLeft size={19}/> Back to Studio</Link><Link href="/worlds">YNOT <span>/ WORLD</span></Link></header>
  {product?<div className="ynot-studio-product-grid">
   <div className="ynot-studio-product-visual"><div className="ynot-studio-product-blur" style={{backgroundImage:`url("${product.image.replaceAll('"',"%22")}")`}}/><img src={photo||product.image} alt={product.title}/></div>
   <section className="ynot-studio-product-info"><small>YNOT STUDIO / {product.category.toUpperCase()}</small><h1>{product.title}</h1><p className="ynot-studio-product-brand">{product.brand||"Independent store"}</p>
   <strong>{product.price>0?money(product.price):"Price on request"}</strong><p className="ynot-studio-product-note">Catalogue price is indicative. Availability, shipping and final purchase terms require confirmation.</p>
   <p>{product.description||"A distinctive piece selected from YNOT's interior design catalogue for residential and commercial spaces."}</p>
   <div className="ynot-studio-product-actions"><button onClick={save} className={saved?"saved":""}><Bookmark size={18} fill={saved?"currentColor":"none"}/>{saved?"Saved":"Save"}</button>
   <Link href={"/?q="+encodeURIComponent(product.title)}><ArrowUpRight size={18}/> Explore on YNOT</Link></div>
   <div className="ynot-studio-product-footer"><span>Products are discovered from independent stores. Ordering through YNOT remains unavailable until supplier verification and payments are active.</span>{product.sourceUrl&&<a href={product.sourceUrl} target="_blank" rel="noopener noreferrer">Original listing <ExternalLink size={14}/></a>}</div>
   </section>
  </div>:<div className="ynot-studio-product-empty"><h1>{queryTitle||"Product details"}</h1><p>{loading?"Loading product details…":"This item could not be loaded right now. Return to Studio to see it in the catalogue."}</p><Link href="/worlds/studio">Explore Studio</Link></div>}
  <style jsx global>{`
  .ynot-studio-product{min-height:100dvh;background:#f4f2ed;color:#181715;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  .ynot-studio-product *{box-sizing:border-box}.ynot-studio-product header{display:flex;align-items:center;justify-content:space-between;padding:20px clamp(18px,4vw,64px);gap:18px}.ynot-studio-product header a{display:flex;align-items:center;gap:8px;color:#1c1b19;text-decoration:none;font-size:13px;font-weight:600}.ynot-studio-product header a:last-child{letter-spacing:-.07em;font-size:22px;font-weight:800}.ynot-studio-product header a:last-child span{letter-spacing:.06em;font-size:11px;font-weight:400}
  .ynot-studio-product-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(300px,.9fr);gap:clamp(23px,4vw,70px);align-items:center;padding:0 clamp(18px,4vw,64px) 45px;max-width:1600px;margin:auto;min-height:calc(100dvh - 80px)}
  .ynot-studio-product-visual{min-height:clamp(420px,74vh,850px);position:relative;display:grid;place-items:center;overflow:hidden;background:#dedcd7;border-radius:17px}
  .ynot-studio-product-blur{position:absolute;inset:-30px;background-size:cover;background-position:center;filter:blur(38px) brightness(.85);opacity:.62}
  .ynot-studio-product-visual>img{position:relative;z-index:2;max-width:100%;max-height:78vh;width:100%;height:auto;object-fit:contain}
  .ynot-studio-product-info{padding:20px 0}.ynot-studio-product-info>small{font-size:11px;letter-spacing:.18em;color:#777}.ynot-studio-product-info h1{font-size:clamp(36px,4.8vw,72px);line-height:1.04;letter-spacing:-.065em;margin:15px 0}.ynot-studio-product-brand{text-transform:uppercase;letter-spacing:.12em;font-size:12px;color:#6e6b66}.ynot-studio-product-info>strong{display:block;font-size:27px;margin:24px 0 8px}
  .ynot-studio-product-info>p:not(.ynot-studio-product-brand){max-width:550px;line-height:1.65;color:#514f4b}.ynot-studio-product-info .ynot-studio-product-note{font-size:12px;color:#777}
  .ynot-studio-product-actions{display:flex;flex-wrap:wrap;gap:10px;margin:30px 0}.ynot-studio-product-actions button,.ynot-studio-product-actions a{display:flex;gap:10px;align-items:center;border-radius:999px;background:#1b1b1a;color:white;padding:14px 24px;font:inherit;font-size:13px;font-weight:700;border:1px solid #1b1b1a;cursor:pointer;text-decoration:none}.ynot-studio-product-actions button.saved{background:#eae8df;color:#131313}
  .ynot-studio-product-actions a{background:transparent;color:#1b1b1a}.ynot-studio-product-footer{padding-top:20px;border-top:1px solid #0002;font-size:12px;color:#6b6860;max-width:580px;line-height:1.6;display:flex;flex-direction:column;gap:12px}.ynot-studio-product-footer a{display:inline-flex;align-items:center;gap:6px;color:#4b4842;text-decoration:underline}.ynot-studio-product-empty{padding:15vh 5vw;text-align:center}.ynot-studio-product-empty a{color:#151515}
  @media(max-width:750px){.ynot-studio-product-grid{display:flex;flex-direction:column;align-items:stretch;gap:12px;padding:0 12px 40px}.ynot-studio-product header{padding:17px}.ynot-studio-product-visual{min-height:0;height:52dvh;border-radius:13px}.ynot-studio-product-visual>img{height:100%;max-height:52dvh}.ynot-studio-product-info{padding:10px 12px}.ynot-studio-product-info h1{font-size:35px}.ynot-studio-product-actions button,.ynot-studio-product-actions a{padding:13px 18px}}
  `}</style>
 </main>
}
