import { NextRequest, NextResponse } from 'next/server';
import { creditWallet, priceProtectionCredit, replacementScore, type SourceQuote, type Wallet } from '@/lib/commerce/engine';

export async function POST(req:NextRequest){
  try{
    const body=await req.json();
    if(body.action==='price-protection'){
      const credit=priceProtectionCredit(Number(body.originalPrice),Number(body.currentPrice),Number(body.thresholdPct??.05));
      const wallet:Wallet=body.wallet||{balance:0,credits:[]};
      return NextResponse.json({credit,wallet:creditWallet(wallet,credit,'YNOT price protection')});
    }
    if(body.action==='wallet-credit'){
      const wallet:Wallet=body.wallet||{balance:0,credits:[]};
      return NextResponse.json({wallet:creditWallet(wallet,Number(body.amount||0),String(body.reason||'YNOT credit'))});
    }
    if(body.action==='replacement-score'){
      const original:SourceQuote=body.original;
      const candidates:SourceQuote[]=Array.isArray(body.candidates)?body.candidates:[];
      return NextResponse.json({candidates:candidates.map(candidate=>({candidate,score:replacementScore(original,candidate)})).sort((a,b)=>b.score-a.score)});
    }
    return NextResponse.json({error:'Unknown commerce operation'},{status:400});
  }catch{
    return NextResponse.json({error:'Invalid commerce operation request'},{status:400});
  }
}
