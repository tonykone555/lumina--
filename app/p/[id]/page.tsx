import {redirect} from "next/navigation";
import StudioProductPage from "@/components/worlds/StudioProductPage";
import catalogue from "@/data/merchant/ynot-live-premium-70-pendant-chairs-review.json";

type PageProps={
  params:Promise<{id:string}>;
  searchParams:Promise<Record<string,string|string[]|undefined>>;
};

export default async function ProductDeepLink({params,searchParams}:PageProps){
  const {id}=await params;
  const query=await searchParams;
  if(query.from==="studio"){
    const title=typeof query.q==="string"?query.q.slice(0,180):"";
    const row=catalogue.products.find(product=>product.id===id);
    const initial=row?{id:row.id,title:row.title,brand:row.brand||"",price:row.ynot_discovery_price_eur,image:row.image_link,sourceUrl:row.source_product_url,category:row.category,description:""}:null;
    return <StudioProductPage productId={id} queryTitle={title} initial={initial}/>;
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
