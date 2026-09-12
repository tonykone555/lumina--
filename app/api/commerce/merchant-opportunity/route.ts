import { NextRequest, NextResponse } from 'next/server';
import { merchantOpportunity, type MerchantStats } from '@/lib/commerce/engine';

export async function POST(req:NextRequest){
  try{
    const stats:MerchantStats=await req.json();
    if(!stats?.merchantId) return NextResponse.json({error:'merchantId is required'},{status:400});
    return NextResponse.json({merchantId:stats.merchantId,...merchantOpportunity(stats),evaluatedAt:new Date().toISOString()});
  }catch{
    return NextResponse.json({error:'Invalid merchant stats payload'},{status:400});
  }
}
