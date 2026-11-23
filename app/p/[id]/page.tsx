import {redirect} from "next/navigation";
import catalogue from "@/data/merchant/ynot-live-premium-70-pendant-chairs-review.json";

type PageProps={
  params:Promise<{id:string}>;
  searchParams:Promise<Record<string,string|string[]|undefined>>;
};

export default async function ProductDeepLink({params,searchParams}:PageProps){
  const {id}=await params;
  const query=await searchParams;
  if(query.from==="studio"){
    const row=catalogue.products.find(product=>product.id===id);
    // Old Studio deep links should never show a random fallback product.
    // When no exact record exists, return visitors to the curated Studio feed.
    if(!row)redirect("/worlds/studio?product="+encodeURIComponent(id));
    const category=row.category==="lighting"?"lighting/chandeliers":row.category==="chairs"?"living/armchairs":/sofa|couch|loveseat/i.test(row.title)?"living/sofas":/console/i.test(row.title)?"living/console-tables":"living/coffee-tables";
    const params=new URLSearchParams({studio:"1",origin:"studio",product:row.id,title:row.title,brand:row.brand||"",image:row.image_link,price:String(row.ynot_discovery_price_eur),url:row.source_product_url});
    redirect("/worlds/home-interiors/"+category+"?"+params.toString());
  }
  const next=new URLSearchParams();
  next.set("product",id);
  // Deep links should reopen the exact product in the visual world, not a standalone page.
  if(!query.from)next.set("from","worlds");
  for(const [key,value] of Object.entries(query)){
    if(key==="product"||value==null)continue;
    if(Array.isArray(value))value.forEach(item=>next.append(key,item));
    else next.set(key,value);
  }
  redirect(`/room?${next.toString()}#product-${encodeURIComponent(id)}`);
}
