import {NextRequest,NextResponse} from "next/server";
import {discoverInstagramGraph} from "@/lib/instagram/engine";
import {instagramStoreEnabled} from "@/lib/instagram/store";
import type {DiscoveryRequest} from "@/lib/instagram/types";

export const runtime="nodejs";
export const maxDuration=300;

export async function GET(){
 return NextResponse.json({
  ok:true,
  provider:"apify",
  apifyConfigured:Boolean(process.env.APIFY_API_TOKEN),
  persistenceConfigured:instagramStoreEnabled(),
  keywordActor:process.env.APIFY_KEYWORD_ACTOR||"publicsignallabs~instagram-account-search",
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
