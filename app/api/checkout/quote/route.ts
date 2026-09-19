import {NextRequest,NextResponse} from "next/server";
import {checkoutEnabled,checkoutMode,manualProcurementEnabled,manualProcurementProduct,manualShippingFor,pricedCheckout,revalidateProduct,resolveShipping,signQuote,type CheckoutProduct,type Region} from "@/lib/commerce/checkout";
import {getCatalogProduct} from "@/lib/commerce/catalog-store";
import {etsyProductPrice,klarnaPreview} from "@/lib/commerce/etsy-pricing";
import {convertMoney,countryCurrency} from "@/lib/commerce/currency";

export const runtime="nodejs";

export async function POST(req:NextRequest){
 try{
  if(!checkoutEnabled())return NextResponse.json({error:"YNOT checkout is not enabled yet"},{status:503});
  const body=await req.json() as CheckoutProduct&{region?:Region;quantity?:number;ynotId?:string},region=body.region;
  if(!region?.country)throw new Error("REGION_REQUIRED");
  const quantity=Math.max(1,Math.min(10,Math.floor(Number(body.quantity)||1));

  if(body.ynotId){
    if(!manualProcurementEnabled())throw new Error("MERCHANT_CHECKOUT_ONLY");
    const stored=await getCatalogProduct(String(body.ynotId));
    if(!stored||stored.active===false||stored.ad_eligible===false)throw new Error("YNOT_PRODUCT_UNAVAILABLE");
    if(String(stored.country||"").toUpperCase()!==String(region.country).toUpperCase())throw new Error("YNOT_PRODUCT_REGION_MISMATCH");

    const supplierPrice=Number(stored.source_price),customerPrice=Number(stored.ynot_price);
    if(!Number.isFinite(supplierPrice)||supplierPrice<=0||!Number.isFinite(customerPrice)||customerPrice<=0)throw new Error("INVALID_PRODUCT_PRICE");

    const checkoutCurrency=String(stored.currency||countryCurrency(region.country)||"EUR").toUpperCase();
    const product=manualProcurementProduct({
      id:String(stored.ynot_id),
      variantId:stored.source_variant_id?String(stored.source_variant_id):undefined,
      title:String(stored.title),
      brand:String(stored.brand||"YNOT"),
      price:supplierPrice,
      currency:checkoutCurrency,
      image:stored.image_url?String(stored.image_url):undefined,
      url:String(stored.best_source_url),
      source:"shopify-global-catalog",
      category:String(stored.category||"other")
    });
    const shipping={amount:0,currency:checkoutCurrency,country:String(region.country).toUpperCase(),source:"operator" as const};
    const expiresAt=Date.now()+5*60_000,total=Math.round(customerPrice*quantity*100)/100;
    const marginPct=Number(stored.margin_pct||0);
    const token=signQuote({
      product,
      region,
      shipping,
      quantity,
      supplierPrice,
      price:customerPrice,
      sourcePrice:customerPrice,
      sourceCurrency:checkoutCurrency,
      checkoutCurrency,
      cost:Number(stored.source_price||0)+Number(stored.shipping_reserve||0),
      marginPct,
      fulfillment:"operator_approval",
      ynotId:String(stored.ynot_id),
      expiresAt
    });
    return NextResponse.json({
      mode:"ynot",
      fulfillment:"operator_approval",
      ynotId:String(stored.ynot_id),
      product:{...product,price:customerPrice,supplierPrice,retailPrice:customerPrice,currency:checkoutCurrency},
      price:customerPrice,
      currency:checkoutCurrency,
      sourceCurrency:checkoutCurrency,
      shipping,
      shippingIncluded:true,
      total,
      quantity,
      marginPct,
      klarna:klarnaPreview(total,region.country,checkoutCurrency),
      expiresAt,
      token
    });
  }

  const operatorFlow=checkoutMode(body).mode==="merchant";
  if(operatorFlow&&!manualProcurementEnabled())throw new Error("MERCHANT_CHECKOUT_ONLY");
  const product=operatorFlow?manualProcurementProduct(body):await revalidateProduct(body),baseQuote=pricedCheckout(product),isEtsy=String(product.source||"").toLowerCase()==="etsy";
  const etsyPrice=isEtsy?etsyProductPrice(product.price):null;
  const sourceCustomerPrice=etsyPrice?.ynotProductPrice??baseQuote.luminaPrice;
  if(!isEtsy&&baseQuote.state!=="buy-with-lumina")return NextResponse.json({mode:"merchant",reason:baseQuote.reasons,product},{status:409});
  const rawShipping=operatorFlow?manualShippingFor(product,region):await resolveShipping(product,region),checkoutCurrency=countryCurrency(region.country),sourceCurrency=String(product.currency||"EUR").toUpperCase(),shippingCurrency=String(rawShipping.currency||sourceCurrency).toUpperCase();
  const [customerPrice,shippingAmount]=await Promise.all([convertMoney(sourceCustomerPrice,sourceCurrency,checkoutCurrency),convertMoney(Number(rawShipping.amount||0),shippingCurrency,checkoutCurrency)]);
  const shipping={...rawShipping,amount:shippingAmount,currency:checkoutCurrency},expiresAt=Date.now()+5*60_000,total=Math.round((customerPrice*quantity+shipping.amount)*100)/100;
  const marginPct=etsyPrice?Math.round((etsyPrice.productMargin/sourceCustomerPrice)*10000)/100:baseQuote.marginPct;
  const token=signQuote({product,region,shipping,quantity,supplierPrice:product.price,price:customerPrice,sourcePrice:sourceCustomerPrice,sourceCurrency,checkoutCurrency,cost:isEtsy?product.price:baseQuote.riskAdjustedCost,marginPct,fulfillment:"operator_approval",expiresAt});
  return NextResponse.json({mode:"ynot",fulfillment:"operator_approval",product:{...product,price:customerPrice,supplierPrice:product.price,retailPrice:customerPrice,currency:checkoutCurrency},price:customerPrice,currency:checkoutCurrency,sourceCurrency,shipping,total,quantity,marginPct,pricing:etsyPrice?{model:"etsy-adaptive-v1",...etsyPrice}:undefined,klarna:klarnaPreview(total,region.country,checkoutCurrency),expiresAt,token});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Checkout validation failed"},{status:400})}
}
