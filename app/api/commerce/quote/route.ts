import { NextRequest, NextResponse } from 'next/server';
import { buildQuote, installmentPreview, rankSources, type SourceQuote } from '@/lib/commerce/engine';

export async function POST(req:NextRequest){
  try{
    const body=await req.json();
    const sources:SourceQuote[]=Array.isArray(body.sources)?body.sources:body.source?[body.source]:[];
    if(!sources.length) return NextResponse.json({error:'At least one source quote is required'},{status:400});
    const ranked=rankSources(sources);
    const best=ranked[0];
    return NextResponse.json({
      best,
      ranked,
      installments:best?installmentPreview(best.luminaPrice,4):null,
      verifiedAt:new Date().toISOString(),
      quoteTtlSeconds:600,
    });
  }catch{
    return NextResponse.json({error:'Invalid commerce quote request'},{status:400});
  }
}

export async function GET(){
  const demo:SourceQuote={sourceId:'demo-retailer',merchantId:'demo-brand',productId:'demo-1',title:'Demo product',category:'fashion',price:80,currency:'EUR',shipping:6,stockConfidence:.94,deliveryDays:4,returnPolicyScore:.85,regionMatch:.95};
  const quote=buildQuote(demo);
  return NextResponse.json({quote,installments:installmentPreview(quote.luminaPrice,4),mode:'demo'});
}
