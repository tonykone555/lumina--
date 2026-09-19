import type {Metadata} from "next";
import {notFound} from "next/navigation";
import ProductActions from "./product-actions";
import {getCatalogProduct,persistCatalogProducts} from "@/lib/commerce/catalog-store";
import {buildCatalogFeed,type FeedCategory,type FeedCountry} from "@/lib/commerce/catalog-feed";
import "./product.css";

const COUNTRIES=new Set<FeedCountry>(["FR","DE","ES","IT","NL","BE","GB","US","CA","AU"]);
const CATEGORIES=new Set<Exclude<FeedCategory,"general">>(["home","fashion","beauty","tech","fitness","kitchen","pets","office","travel","outdoors","gifts"]);

type PageProps={
  params:Promise<{id:string}>;
  searchParams:Promise<{country?:string;category?:string;src?:string}>;
};

async function resolveProduct(id:string,countryRaw?:string,categoryRaw?:string){
  const stored=await getCatalogProduct(id).catch(()=>null);
  if(stored)return stored;

  const country=(COUNTRIES.has(String(countryRaw||"FR").toUpperCase() as FeedCountry)?String(countryRaw||"FR").toUpperCase():"FR") as FeedCountry;
  const category=(CATEGORIES.has(String(categoryRaw||"fashion") as any)?String(categoryRaw||"fashion"):"fashion") as Exclude<FeedCategory,"general">;
  const products=await buildCatalogFeed({countries:[country],categories:[category],perCategory:250,adEligibleOnly:true,concurrency:4});
  try{await persistCatalogProducts(products)}catch{}
  const found=products.find(p=>p.ynotId===id);
  if(!found)return null;
  return{
    ynot_id:found.ynotId,
    country:found.country,
    category:found.category,
    title:found.title,
    original_title:found.originalTitle,
    brand:found.brand,
    source_brand:found.sourceBrand,
    image_url:found.image,
    image_urls:found.images,
    ynot_price:found.ynotPrice,
    currency:found.sourceCurrency,
    ad_eligible:found.adEligible,
    intent_tags:found.intentTags,
    price_position:found.pricePosition,
    active:true,
    source_product_id:found.sourceProductId,
    source_variant_id:found.sourceVariantId,
    best_source_url:found.sourceUrl,
    best_supplier_domain:found.merchantDomain,
    source_price:found.sourcePrice,
    shipping_reserve:found.shippingReserve,
    gross_contribution:found.grossContribution,
    margin_pct:found.marginPct,
    reliability_score:found.reliabilityScore,
    routing_score:found.routingScore,
    supplier_offer_count:found.supplierOfferCount,
    fingerprint:found.fingerprint,
    supplier_offers:found.supplierOffers
  };
}

export async function generateMetadata({params,searchParams}:PageProps):Promise<Metadata>{
  const {id}=await params;const query=await searchParams;
  const product=await resolveProduct(id,query.country,query.category);
  if(!product)return{title:"Product | YNOT"};
  const title=`${product.title} — YNOT`;
  const description=`Shop ${product.title} through YNOT. YNOT compares matching supplier offers and routes the strongest available option for your market.`;
  return{
    title,
    description,
    alternates:{canonical:`/p/${encodeURIComponent(id)}?country=${product.country}&category=${product.category}`},
    openGraph:{title,description,images:product.image_url?[{url:product.image_url,alt:product.title}]:[]},
    twitter:{card:"summary_large_image",title,description,images:product.image_url?[product.image_url]:[]}
  };
}

export default async function ProductPage({params,searchParams}:PageProps){
  const {id}=await params;const query=await searchParams;
  const product=await resolveProduct(id,query.country,query.category);
  if(!product||product.active===false||product.ad_eligible===false)notFound();

  const images=Array.isArray(product.image_urls)?product.image_urls.filter(Boolean):product.image_url?[product.image_url]:[];
  const tags=Array.isArray(product.intent_tags)?product.intent_tags:[];
  const price=Number(product.ynot_price);
  const currency=String(product.currency||"EUR");
  const base=process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.NEXT_PUBLIC_APP_URL||"https://ynotworld.app";
  const origin=/^https?:\/\//i.test(base)?base:`https://${base}`;
  const canonical=`${origin.replace(/\/$/,"")}/p/${encodeURIComponent(id)}?country=${encodeURIComponent(product.country)}&category=${encodeURIComponent(product.category)}`;

  const jsonLd={
    "@context":"https://schema.org",
    "@type":"Product",
    name:product.title,
    image:images,
    description:`${product.title} offered through YNOT with supplier routing for ${product.country}.`,
    brand:{"@type":"Brand",name:product.brand||"YNOT"},
    sku:product.ynot_id,
    offers:{
      "@type":"Offer",
      url:canonical,
      priceCurrency:currency,
      price:price.toFixed(2),
      availability:"https://schema.org/InStock",
      itemCondition:"https://schema.org/NewCondition",
      seller:{"@type":"Organization",name:"YNOT"}
    }
  };

  return <main className="ynot-product-shell">
    <a href="/" className="ynot-product-logo" aria-label="YNOT home">YNOT</a>
    <div className="ynot-product-origin">Found through YNOT</div>
    <ProductActions product={{
      ynotId:product.ynot_id,
      title:product.title,
      image:product.image_url,
      images,
      price,
      currency,
      country:product.country,
      category:product.category,
      brand:product.brand||"YNOT",
      supplierCount:Number(product.supplier_offer_count||1),
      tags
    }}/>
    <section className="ynot-pdp-explainer">
      <div><strong>Why YNOT?</strong><span>One clean product reference instead of dozens of duplicate merchant listings.</span></div>
      <div><strong>Price</strong><span>The displayed amount is the YNOT retail price for this market, not a copied merchant sticker price.</span></div>
      <div><strong>Supply</strong><span>Matching supplier listings are compared behind the scenes so YNOT can use the strongest available route.</span></div>
    </section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>
  </main>;
}
