import {NextRequest,NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/creators/earn";
import {findAliExpressSources} from "@/lib/commerce/sourcing";

export const runtime="nodejs";

export async function POST(req:NextRequest){
 try{
  await authenticatedUser(req);
  const b=await req.json();
  const title=String(b.title||"").trim().slice(0,240);
  const brand=String(b.brand||"").trim().slice(0,160);
  const retailPrice=Number(b.retail_price??b.price);
  const currency=String(b.currency||"EUR").toUpperCase().slice(0,5);
  const shipTo=String(b.ship_to||"FR").toUpperCase().slice(0,2);
  const language=(String(b.language||"en_US")==="de_DE"?"de_DE":String(b.language||"en_US")==="pt_BR"?"pt_BR":"en_US") as "en_US"|"de_DE"|"pt_BR";
  if(!title)return NextResponse.json({error:"TITLE_REQUIRED"},{status:400});
  if(!Number.isFinite(retailPrice)||retailPrice<=0)return NextResponse.json({error:"RETAIL_PRICE_REQUIRED"},{status:400});
  const result=await findAliExpressSources({title,brand,retailPrice,currency,shipTo,language});
  return NextResponse.json(result);
 }catch(e){
  const m=e instanceof Error?e.message:"SOURCING_FAILED";
  const status=/SIGN_IN|SESSION/.test(m)?401:/FETCHLAYER_NOT_CONFIGURED/.test(m)?503:400;
  return NextResponse.json({error:m},{status});
 }
}
