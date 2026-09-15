import type {MetadataRoute} from "next";
import {SEO_CATEGORIES} from "@/lib/seo-categories";

const BASE="https://ynotworld.app";

export default function sitemap():MetadataRoute.Sitemap{
  const now=new Date();
  return [
    {url:BASE,lastModified:now,changeFrequency:"daily",priority:1},
    ...SEO_CATEGORIES.map(category=>({
      url:`${BASE}/shop/${category.slug}`,
      lastModified:now,
      changeFrequency:"weekly" as const,
      priority:category.slug==="discover"?.9:.8
    }))
  ];
}
