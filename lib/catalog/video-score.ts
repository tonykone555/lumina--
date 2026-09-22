import type {VideoProduct} from "./hf-video";

export type VideoGenerationSource="search"|"showcase"|"admin";

export type ScoredVideoCandidate={
 product:VideoProduct;
 score:number;
 reasons:string[];
};

function textOf(p:VideoProduct){return `${p.category||""} ${p.title||""}`.toLowerCase()}

function categoryScore(p:VideoProduct){
 const t=textOf(p);
 if(/shoe|shoes|sneaker|sneakers|trainer|trainers|boot|boots|heel|heels|sandal|sandals|footwear/.test(t))return{score:-100,reason:"footwear_skip"};
 if(/coat|parka|puffer|overcoat|winter jacket|down jacket/.test(t))return{score:27,reason:"winter_outerwear"};
 if(/\bwomen'?s\b|\bwomens\b|\bfemale\b/.test(t)&&/dress|shirt|jacket|hoodie|pants|trouser|jeans|activewear|clothing|apparel|sweater|knitwear|skirt|shorts/.test(t))return{score:26,reason:"womens_fashion"};
 if(/\bmen'?s\b|\bmens\b|\bmale\b/.test(t)&&/shirt|jacket|hoodie|pants|trouser|jeans|activewear|clothing|apparel|sweater|polo|shorts/.test(t))return{score:24,reason:"mens_fashion"};
 if(/dress|shirt|jacket|hoodie|pants|trouser|jeans|activewear|clothing|apparel|sweater|knitwear|skirt|shorts/.test(t))return{score:22,reason:"fashion"};
 if(/bag|handbag|tote|wallet|backpack/.test(t))return{score:22,reason:"bags"};
 if(/hair|shampoo|conditioner|hair oil|hair serum|hair mask|scalp|styling/.test(t))return{score:21,reason:"hair"};
 if(/beauty|skincare|serum|cream|perfume|fragrance|cosmetic/.test(t))return{score:20,reason:"beauty"};
 if(/furniture|sofa|chair|table|desk|lamp|decor|rug|storage/.test(t))return{score:19,reason:"furniture"};
 if(/appliance|coffee|vacuum|air fryer|blender|purifier|humidifier|kettle|toaster/.test(t))return{score:18,reason:"appliance"};
 if(/fitness|gym|training|recovery|dumbbell|resistance|yoga/.test(t))return{score:15,reason:"fitness"};
 if(/protein|whey|creatine|supplement|nutrition/.test(t))return{score:12,reason:"protein"};
 return{score:8,reason:"general"};
}

function penaltyScore(p:VideoProduct){
 const t=textOf(p);let score=0;const reasons:string[]=[];
 if(/replacement|spare|repair|compatible with|module|part\b/.test(t)){score+=28;reasons.push("utility_part")}
 if(/cable|adapter|extension|connector|charger lead/.test(t)){score+=22;reasons.push("utility_accessory")}
 if(/wholesale|bulk|10-pack|12-pack|multi[- ]?pack|bundle/.test(t)){score+=16;reasons.push("bulk_listing")}
 if(/case only|strap only|cover only|refill/.test(t)){score+=18;reasons.push("component_only")}
 return{score,reasons};
}

export function scoreVideoCandidate(product:VideoProduct,source:VideoGenerationSource="search"){
 const reasons:string[]=[];
 const category=categoryScore(product);let score=category.score;reasons.push(category.reason);

 if(source==="search"){score+=32;reasons.push("search_intent")}
 else if(source==="showcase"){score+=12;reasons.push("showcase")}
 else {score+=42;reasons.push("admin")}

 if(product.image){score+=8;reasons.push("has_image")}
 if((product.title||"").length>=12){score+=4;reasons.push("descriptive_listing")}
 if(/^https:\/\//i.test(product.image||"")){score+=4;reasons.push("https_image")}

 const penalty=penaltyScore(product);score-=penalty.score;reasons.push(...penalty.reasons);

 return{product,score,reasons} satisfies ScoredVideoCandidate;
}

export function selectVideoCandidates(products:VideoProduct[],source:VideoGenerationSource="search"){
 const threshold=source==="search"?60:source==="showcase"?75:40;
 const max=source==="search"?4:source==="showcase"?2:6;
 return products
  .map(product=>scoreVideoCandidate(product,source))
  .filter(candidate=>candidate.score>=threshold)
  .sort((a,b)=>b.score-a.score)
  .slice(0,max);
}
