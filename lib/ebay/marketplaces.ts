export const EBAY_MARKETPLACES={
 EBAY_FR:{country:"FR",locale:"fr-FR",currency:"EUR",label:"France"},
 EBAY_DE:{country:"DE",locale:"de-DE",currency:"EUR",label:"Germany"},
 EBAY_ES:{country:"ES",locale:"es-ES",currency:"EUR",label:"Spain"},
 EBAY_IT:{country:"IT",locale:"it-IT",currency:"EUR",label:"Italy"},
 EBAY_GB:{country:"GB",locale:"en-GB",currency:"GBP",label:"United Kingdom"},
 EBAY_US:{country:"US",locale:"en-US",currency:"USD",label:"United States"},
 EBAY_CA:{country:"CA",locale:"en-CA",currency:"CAD",label:"Canada"},
 EBAY_AU:{country:"AU",locale:"en-AU",currency:"AUD",label:"Australia"},
 EBAY_BE:{country:"BE",locale:"fr-BE",currency:"EUR",label:"Belgium"},
 EBAY_NL:{country:"NL",locale:"nl-NL",currency:"EUR",label:"Netherlands"}
} as const;

export type EbayMarketplaceId=keyof typeof EBAY_MARKETPLACES;

export const DEFAULT_GLOBAL_EBAY_MARKETS:EbayMarketplaceId[]=[
 "EBAY_FR","EBAY_DE","EBAY_ES","EBAY_IT","EBAY_BE","EBAY_NL","EBAY_GB","EBAY_US","EBAY_CA","EBAY_AU"
];

export function ebayMarketplaceConfig(value?:string){
 const id=(String(value||"EBAY_FR").toUpperCase()) as EbayMarketplaceId;
 const config=EBAY_MARKETPLACES[id];
 if(!config)throw new Error("UNSUPPORTED_EBAY_MARKETPLACE");
 return{id,...config};
}

export function parseEbayMarketplaces(raw?:string){
 if(!raw||raw.toLowerCase()==="auto"||raw.toLowerCase()==="global")return DEFAULT_GLOBAL_EBAY_MARKETS;
 const ids=raw.split(",").map(x=>x.trim().toUpperCase()).filter(Boolean);
 return [...new Set(ids.map(id=>ebayMarketplaceConfig(id).id))];
}
