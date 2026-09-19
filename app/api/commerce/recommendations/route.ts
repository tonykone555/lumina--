import { NextRequest, NextResponse } from "next/server";
import { searchCatalogIntent, type FeedCountry } from "@/lib/commerce/catalog-feed";

export const runtime="nodejs";
export const maxDuration=45;

const COUNTRIES=new Set<FeedCountry>(["FR","DE","ES","IT","NL","BE","GB","US","CA","AU"]);

export async function GET(req:NextRequest){
  const q=(req.nextUrl.searchParams.get("q")||"").trim().slice(0,240);
  if(!q)return NextResponse.json({error:"Missing q"},{status:400});

  const requested=(req.nextUrl.searchParams.get("country")||"FR").toUpperCase() as FeedCountry;
  const country=COUNTRIES.has(requested)?requested:"FR";
  const limit=Math.max(3,Math.min(30,Number(req.nextUrl.searchParams.get("limit")||12)));

  try{
    const result=await searchCatalogIntent(q,country,limit);
    return NextResponse.json({
      brand:"YNOT",
      generatedAt:new Date().toISOString(),
      ...result
    },{
      headers:{"Cache-Control":"s-maxage=60, stale-while-revalidate=300"}
    });
  }catch(error){
    console.error("YNOT recommendations error",error);
    return NextResponse.json({
      brand:"YNOT",
      query:q,
      country,
      products:[],
      error:"Products are temporarily unavailable."
    },{status:200});
  }
}
