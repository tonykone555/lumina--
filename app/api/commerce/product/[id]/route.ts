import {NextRequest,NextResponse} from "next/server";
import {getCatalogProduct} from "@/lib/commerce/catalog-store";

export const runtime="nodejs";

export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const product=await getCatalogProduct(id).catch(()=>null);
  if(!product||product.active===false||product.ad_eligible===false){
    return NextResponse.json({error:"Product not found"},{status:404});
  }
  const images=Array.isArray(product.image_urls)?product.image_urls.filter(Boolean):product.image_url?[product.image_url]:[];
  return NextResponse.json({
    product:{
      id:product.ynot_id,
      title:product.title,
      brand:product.brand||product.source_brand||"YNOT",
      price:Number(product.ynot_price),
      currency:String(product.currency||"USD"),
      image:product.image_url,
      images,
      url:product.best_source_url||`/p/${encodeURIComponent(product.ynot_id)}`,
      tags:Array.isArray(product.intent_tags)?product.intent_tags:[],
      source:"shopify",
      category:product.category,
      description:`${product.title} available through YNOT.`
    }
  },{
    headers:{"Cache-Control":"public, s-maxage=300, stale-while-revalidate=3600"}
  });
}
