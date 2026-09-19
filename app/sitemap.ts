import type {MetadataRoute} from "next";
import {listCatalogProducts} from "@/lib/commerce/catalog-store";

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const base="https://ynotworld.app";
  const staticPages=[
    {url:base,lastModified:new Date(),changeFrequency:"daily" as const,priority:1},
    {url:`${base}/about`,lastModified:new Date(),changeFrequency:"monthly" as const,priority:.5},
    {url:`${base}/ai-shopping`,lastModified:new Date(),changeFrequency:"weekly" as const,priority:.8}
  ];

  try{
    const products=await listCatalogProducts(5000);
    const dynamic=products.map((p:any)=>({
      url:`${base}/p/${encodeURIComponent(String(p.ynot_id))}?country=${encodeURIComponent(String(p.country))}&category=${encodeURIComponent(String(p.category))}`,
      lastModified:new Date(p.updated_at||p.last_seen_at||Date.now()),
      changeFrequency:"daily" as const,
      priority:.7
    }));
    return[...staticPages,...dynamic];
  }catch{
    return staticPages;
  }
}
