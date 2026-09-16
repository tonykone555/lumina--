import {NextRequest,NextResponse} from "next/server";
import {countryCurrency,fxRate} from "@/lib/commerce/currency";

export const runtime="nodejs";

export async function POST(req:NextRequest){
 try{
  const body=await req.json() as {country?:string;currencies?:string[]};
  const target=countryCurrency(body.country),currencies=[...new Set((body.currencies||[]).map(c=>String(c||"EUR").toUpperCase()).filter(Boolean))].slice(0,12);
  const entries=await Promise.all(currencies.map(async currency=>[currency,await fxRate(currency,target)] as const));
  return NextResponse.json({currency:target,rates:Object.fromEntries(entries)});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"FX_RATE_UNAVAILABLE"},{status:400})}
}
