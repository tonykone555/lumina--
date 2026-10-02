import {redirect} from "next/navigation";

type PageProps={
  params:Promise<{id:string}>;
  searchParams:Promise<Record<string,string|string[]|undefined>>;
};

export default async function ProductDeepLink({params,searchParams}:PageProps){
  const {id}=await params;
  const query=await searchParams;
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
