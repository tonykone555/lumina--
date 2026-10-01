import {NextRequest,NextResponse} from "next/server";
import {searchChannel3} from "@/lib/catalog/channel3";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 const q=(req.nextUrl.searchParams.get("q")||"").slice(0,300),country=(req.nextUrl.searchParams.get("country")||"FR").toUpperCase().slice(0,2),limit=Math.min(100,Math.max(1,Number(req.nextUrl.searchParams.get("limit")||60))),brandIds=(req.nextUrl.searchParams.get("brand_ids")||"").split(",").map(x=>x.trim()).filter(Boolean),categoryIds=(req.nextUrl.searchParams.get("category_ids")||"").split(",").map(x=>x.trim()).filter(Boolean);
 if(!q)return NextResponse.json({source:"channel3",products:[],error:"Missing search query"},{status:400});
 try{const products=await searchChannel3(q,{country,limit,brandIds,categoryIds});return NextResponse.json({source:"channel3",sources:["channel3"],query:q,products,pagination:{has_next_page:products.length>=limit}},{headers:{"Cache-Control":"s-maxage=45, stale-while-revalidate=180"}})}catch(error){console.error("Channel3 catalogue error",error);return NextResponse.json({source:"channel3",sources:["channel3"],query:q,products:[],pagination:{has_next_page:false},error:"Channel3 products are temporarily unavailable."},{status:200})}
}
