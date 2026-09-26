import {redirect} from "next/navigation";

type PageProps={
  params:Promise<{id:string[]}>;
  searchParams:Promise<Record<string,string|string[]|undefined>>;
};

export default async function ProductDeepLink({params,searchParams}:PageProps){
  const {id}=await params;
  const query=await searchParams;
  const productId=(Array.isArray(id)?id:[]).map(segment=>decodeURIComponent(segment)).join("/").trim();
  if(!productId)redirect("/");

  const destination=new URLSearchParams();
  destination.set("product",productId);
  const ref=Array.isArray(query.ref)?query.ref[0]:query.ref;
  if(ref)destination.set("ref",String(ref).slice(0,120));
  redirect(`/?${destination.toString()}`);
}
