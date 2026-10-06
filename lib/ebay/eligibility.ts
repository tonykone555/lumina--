export type EbayEligibilityInput={
 shipsTo:boolean;
 sellerReady:boolean;
 categoryDomainOk:boolean;
 missingRequiredAspects:string[];
 originVerified:boolean;
 deliveryDaysMax?:number|null;
 shippingCost?:number|null;
 supplierPrice?:number|null;
 retailPrice?:number|null;
 available?:boolean|null;
};

export function evaluateEbayEligibility(input:EbayEligibilityInput){
 const blockers:string[]=[];
 const warnings:string[]=[];
 const maxDelivery=Number(input.deliveryDaysMax);
 const shipping=Number(input.shippingCost);
 const supplier=Number(input.supplierPrice);
 const retail=Number(input.retailPrice);
 const marginPct=Number.isFinite(supplier)&&supplier>0&&Number.isFinite(retail)&&retail>0?(retail-supplier-Math.max(0,Number.isFinite(shipping)?shipping:0))/retail:null;

 if(!input.shipsTo)blockers.push("DOES_NOT_SHIP_TO_MARKET");
 if(input.available===false)blockers.push("OUT_OF_STOCK");
 if(!input.sellerReady)blockers.push("MARKETPLACE_POLICIES_NOT_READY");
 if(input.categoryDomainOk!==true)blockers.push("CATEGORY_DOMAIN_MISMATCH");
 if(input.missingRequiredAspects?.length)blockers.push("MISSING_REQUIRED_ASPECTS");
 if(!input.originVerified)blockers.push("UNVERIFIED_SHIP_FROM_ORIGIN");
 if(Number.isFinite(maxDelivery)&&maxDelivery>30)blockers.push("DELIVERY_TOO_SLOW");
 else if(!Number.isFinite(maxDelivery))warnings.push("DELIVERY_ESTIMATE_UNKNOWN");
 if(marginPct!=null&&marginPct<0.12)blockers.push("LOW_MARGIN");
 else if(marginPct==null)warnings.push("MARGIN_NOT_VERIFIED");

 return{
  publishable:blockers.length===0,
  blockers,
  warnings,
  marginPct:marginPct==null?null:Math.round(marginPct*10000)/100,
  deliveryDaysMax:Number.isFinite(maxDelivery)?maxDelivery:null,
  shippingCost:Number.isFinite(shipping)?shipping:null
 };
}
