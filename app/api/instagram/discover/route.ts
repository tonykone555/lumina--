import {NextRequest,NextResponse} from "next/server";
import {discoverInstagramGraph} from "@/lib/instagram/engine";
import {instagramStoreEnabled} from "@/lib/instagram/store";
import type {DiscoveryRequest} from "@/lib/instagram/types";

export const runtime="nodejs";
export const maxDuration=300;

const ONE_TIME_DIAGNOSTIC="9e7c6f4d3a2b41f0b8890c7edb6215ac";

export async function GET(req:NextRequest){
 if(req.nextUrl.searchParams.get("diagnostic")===ONE_TIME_DIAGNOSTIC){
  try{
   const query=(req.nextUrl.searchParams.get("q")||"independent beachwear labels september 2026").slice(0,100);
   const result=await discoverInstagramGraph({query,target:20,keywordPages:1,relatedPerSeed:5,seedExpansionLimit:1});
   return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
  }catch(error){
   const message=error instanceof Error?error.message:"Instagram discovery failed";
   return NextResponse.json({error:message},{status:500,headers:{"Cache-Control":"no-store"}});
  }
 }
 return NextResponse.json({
  ok:true,
  provider:"apify",
  apifyConfigured:Boolean(process.env.APIFY_API_TOKEN),
  persistenceConfigured:instagramStoreEnabled(),
  keywordActor:process.env.APIFY_KEYWORD_ACTOR||"publicsignallabs~instagram-account-search",
  fallbackKeywordActor:process.env.APIFY_FALLBACK_KEYWORD_ACTOR||"maximedupre~instagram-user-search-scraper",
  relatedActor:process.env.APIFY_RELATED_ACTOR||"publicsignallabs~instagram-related-profiles"
 },{headers:{"Cache-Control":"no-store"}});
}

export async function POST(req:NextRequest){
 try{
  const body=await req.json() as DiscoveryRequest;
  const result=await discoverInstagramGraph(body);
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:"Instagram discovery failed";
  const status=message.includes("APIFY_API_TOKEN")?503:400;
  return NextResponse.json({error:message},{status});
 }
}
