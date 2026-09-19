import {NextRequest,NextResponse} from "next/server";
import {checkoutEnabled,manualProcurementEnabled,manualProcurementProduct,signQuote} from "@/lib/commerce/checkout";
import {getCatalogProduct} from "@/lib/commerce/catalog-store";

export const runtime="nodejs";

export async function POST(req:NextRequest){
  try{
    if(!checkoutEnabled())return NextResponse.json({error:"YNOT checkout is not enabled yet"},{status:503});
    if(!manualProcurementEnabled())throw new Error("MERCHANT_CHECKOUT_ONLY");
    const body=await req.json() as {ynotId?:string;country?:string;quantity?:number};
    const ynotId=String(body.ynotId||"");
    const country=String(body.country||"").toUpperCase();
    if(!ynotId||country.length!==2)throw new Error("INVALID_REQUEST");

    const stored:any=await getCatalogProduct(ynotId);
    if(!stored||stored.active===false||stored.ad_eligible===false)throw new Error("YNOT_PRODUCT_UNAVAILABLE");
    if(String(stored.country||"").toUpperCase()!==country)throw new Error("YNOT_PRODUCT_REGION_MISMATCH");

    const quantity=Math.max(1,Math.min(10,Math.floor(Number(body.quantity)||1)));
    const supplierPrice=Number(stored.source_price);
    const customerPrice=Number(stored.ynot_price);
    const currency=String(stored.currency||"EUR").toUpperCase();
    if(!Number.isFinite(supplierPrice)||supplierPrice<=0||!Number.isFinite(customerPrice)||customerPrice<=0)throw new Error("INVALID_PRODUCT_PRICE");

    const product=manualProcurementProduct({
      id:String(stored.ynot_id),
      variantId:stored.source_variant_id?String(stored.source_variant_id):undefined,
      title:String(stored.title),
      brand:stored.brand?String(stored.brand):undefined,
      price:supplierPrice,
      currency,
      image:stored.image_url?String(stored.image_url):undefined,
      url:String(stored.best_source_url),
      source:"shopify-global-catalog",
      category:String(stored.category||"other")
    });

    const shipping={amount:0,currency,country,source:"operator" as const};
    const expiresAt=Date.now()+5*60_000;
    const total=Math.round(customerPrice*quantity*100)/100;
    const marginPct=Number(stored.margin_pct||0);
    const token=signQuote({
      product,
      region:{country},
      shipping,
      quantity,
      supplierPrice,
      price:customerPrice,
      sourcePrice:customerPrice,
      sourceCurrency:currency,
      checkoutCurrency:currency,
      cost:Number(stored.source_price||0)+Number(stored.shipping_reserve||0),
      marginPct,
      fulfillment:"operator_approval",
      ynotId,
      expiresAt
    });

    return NextResponse.json({
      mode:"ynot",
      fulfillment:"operator_approval",
      ynotId,
      product:{...product,price:customerPrice,supplierPrice,retailPrice:customerPrice},
      price:customerPrice,
      currency,
      shipping,
      shippingIncluded:true,
      total,
      quantity,
      marginPct,
      expiresAt,
      token
    });
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Checkout validation failed"},{status:400});
  }
}
