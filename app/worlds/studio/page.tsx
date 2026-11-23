import type {Metadata} from "next";
import StudioFeed from "@/components/worlds/StudioFeed";
import catalogue from "@/data/merchant/ynot-live-premium-70-pendant-chairs-review.json";

export const metadata:Metadata={
 title:"YNOT Studio — An immersive interiors catalogue",
 description:"Swipe through curated pendant lights, designer-style chairs, sofas and accent furniture. Save products to a project and browse with the Studio zipper.",
 alternates:{canonical:"https://ynotworld.app/worlds/studio"}
};
export default function StudioPage(){
 const products=catalogue.products.filter(p=>p.image_link&&p.source_product_url&&p.title).map(p=>({
  id:p.id,title:p.title,brand:p.brand,price:p.ynot_discovery_price_eur,image:p.image_link,
  sourceUrl:p.source_product_url,category:p.category,score:Math.max(55,100-p.rank*.6)
 }));
 return <StudioFeed products={products}/>;
}
