import { NextRequest, NextResponse } from 'next/server';
import { optimizeBasket, type BasketLine } from '@/lib/commerce/engine';

export async function POST(req:NextRequest){
  try{
    const body=await req.json();
    const lines:BasketLine[]=Array.isArray(body.lines)?body.lines:[];
    if(!lines.length) return NextResponse.json({error:'Basket lines are required'},{status:400});
    return NextResponse.json({...optimizeBasket(lines),optimizedAt:new Date().toISOString()});
  }catch{
    return NextResponse.json({error:'Invalid basket request'},{status:400});
  }
}
