import {runBuyerRadar} from "@/lib/grok/buyer-radar-store";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get("authorization")!=="Bearer "+secret)return Response.json({error:"unauthorized"},{status:401});
 try{return Response.json({ok:true,...await runBuyerRadar()})}
 catch(e){return Response.json({ok:false,error:String(e).slice(0,300)},{status:500})}
}
