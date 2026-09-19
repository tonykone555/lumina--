export type IdentityCandidate={
  title:string;
  brand?:string;
  category?:string;
  sourcePrice?:number;
  sourceCurrency?:string;
  merchantDomain?:string;
  image?:string;
};

const STOP=new Set([
  "the","and","with","for","from","new","sale","official","premium","portable","wireless",
  "smart","pro","mini","plus","original","2025","2026","women","womens","men","mens","unisex"
]);

const COLORS=[
  "black","white","grey","gray","beige","cream","brown","blue","navy","green","red","pink",
  "purple","orange","yellow","gold","silver","khaki","tan","burgundy"
];

const MATERIALS=[
  "leather","suede","cotton","linen","wool","silk","denim","nylon","polyester","steel","aluminum",
  "aluminium","glass","ceramic","wood","oak","walnut","marble","boucle","velvet","silicone"
];

function clean(value:string){
  return value.toLowerCase()
    .replace(/\b(pack|set)\s+of\s+\d+\b/g," ")
    .replace(/\b\d+(?:\.\d+)?\s*(?:ml|cl|l|cm|mm|m|inch|inches|oz|kg|g|w|mah)\b/g," ")
    .replace(/[^a-z0-9]+/g," ")
    .replace(/\s+/g," ")
    .trim();
}

export function titleTokens(title:string){
  return clean(title).split(" ").filter(w=>w.length>2&&!STOP.has(w));
}

export function productFingerprint(candidate:IdentityCandidate){
  const tokens=titleTokens(candidate.title);
  const material=MATERIALS.find(x=>tokens.includes(x));
  const color=COLORS.find(x=>tokens.includes(x));
  const core=tokens.filter(x=>!COLORS.includes(x)&&!MATERIALS.includes(x)).slice(0,7);
  return [candidate.category||"default",...core,material||"",color||""].filter(Boolean).join(":");
}

function jaccard(a:string[],b:string[]){
  const aa=new Set(a),bb=new Set(b);
  const intersection=[...aa].filter(x=>bb.has(x)).length;
  const union=new Set([...aa,...bb]).size;
  return union?intersection/union:0;
}

function priceSimilarity(a?:number,b?:number){
  if(!a||!b)return .5;
  const ratio=Math.min(a,b)/Math.max(a,b);
  return Math.max(0,Math.min(1,ratio));
}

export function identitySimilarity(a:IdentityCandidate,b:IdentityCandidate){
  if(a.category&&b.category&&a.category!==b.category)return 0;
  const titleScore=jaccard(titleTokens(a.title),titleTokens(b.title));
  const priceScore=priceSimilarity(a.sourcePrice,b.sourcePrice);
  const materialA=MATERIALS.find(x=>titleTokens(a.title).includes(x));
  const materialB=MATERIALS.find(x=>titleTokens(b.title).includes(x));
  const materialScore=materialA&&materialB?(materialA===materialB?1:0):.5;
  return titleScore*.72+priceScore*.18+materialScore*.10;
}

export function sameProduct(a:IdentityCandidate,b:IdentityCandidate){
  const exact=productFingerprint(a)===productFingerprint(b);
  if(exact)return true;
  return identitySimilarity(a,b)>=.64;
}

function titleCase(value:string){
  return value.replace(/\b\w/g,m=>m.toUpperCase());
}

export function shopperTitle(title:string){
  const tokens=titleTokens(title);
  const useful=tokens.slice(0,7);
  if(!useful.length)return title.trim();
  return titleCase(useful.join(" "));
}

export function clusterByIdentity<T extends IdentityCandidate>(items:T[]){
  const clusters:T[][]=[];
  for(const item of items){
    let bestIndex=-1,bestScore=0;
    for(let i=0;i<clusters.length;i++){
      const score=identitySimilarity(item,clusters[i][0]);
      if(score>bestScore){bestScore=score;bestIndex=i}
    }
    if(bestIndex>=0&&bestScore>=.64)clusters[bestIndex].push(item);
    else clusters.push([item]);
  }
  return clusters;
}
