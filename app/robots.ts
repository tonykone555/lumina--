import type {MetadataRoute} from "next";

export default function robots():MetadataRoute.Robots{
  return {
    rules:{
      userAgent:"*",
      allow:"/",
      disallow:["/api/","/commerce","/checkout-status"]
    },
    sitemap:"https://ynotworld.app/sitemap.xml",
    host:"https://ynotworld.app"
  };
}
