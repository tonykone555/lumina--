import { gunzipSync } from "zlib";

type UniverseRow={
  taxonomy_id:string;
  root_key:string;
  name:string;
  full_name:string;
  level:number;
  parent_id:string|null;
  is_leaf:boolean;
  active:boolean;
  source:string;
  eligible_for_sourcing:boolean;
  blocked_reason:string|null;
  taxonomy_release:string|null;
  source_updated_at:string;
  updated_at:string;
};

const TAXONOMY_URL="https://github.com/Shopify/product-taxonomy/releases/latest/download/categories.en.json.gz";

const BLOCKED_PATTERNS:[RegExp,string][]=[
  [/\btobacco\b|\bnicotine\b|\bvap(e|ing)\b/i,"regulated-tobacco-nicotine"],
  [/\bcannabis\b|\bmarijuana\b|\bthc\b|\bcbd\b/i,"regulated-recreational-drug"],
  [/\balcoholic beverages\b|\bliquor\b|\bspirits\b|\bwine\b|\bbeer\b/i,"regulated-alcohol"],
  [/\bfirearms?\b|\bammunition\b|\bgun parts?\b|\bsilencers?\b/i,"regulated-weapons"],
  [/\bexplosives?\b|\bfireworks?\b/i,"regulated-explosives"],
  [/\bsteroids?\b|\bhormones?\b/i,"restricted-health-product"]
];

function supabase(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("SUPABASE_NOT_CONFIGURED");
  return{url:url.replace(/\/$/,""),key};
}

async function upsertRows(rows:UniverseRow[]){
  const {url,key}=supabase();
  for(let i=0;i<rows.length;i+=500){
    const batch=rows.slice(i,i+500);
    const res=await fetch(url+"/rest/v1/ynot_product_universe_categories?on_conflict=taxonomy_id",{
      method:"POST",
      headers:{
        apikey:key,
        Authorization:"Bearer "+key,
        "Content-Type":"application/json",
        Prefer:"resolution=merge-duplicates,return=minimal"
      },
      body:JSON.stringify(batch),
      cache:"no-store"
    });
    if(!res.ok)throw new Error("UNIVERSE_UPSERT_"+res.status+":"+await res.text());
  }
}

function text(v:any){return typeof v==="string"?v.trim():""}
function categoryId(v:any){
  const id=text(v?.id||v?.gid||v?.category_id||v?.categoryId);
  return id.includes("TaxonomyCategory/")?id:"";
}
function nameOf(v:any){return text(v?.name||v?.label||v?.title)}
function fullNameOf(v:any){return text(v?.full_name||v?.fullName||v?.breadcrumb||v?.path)}
function parentIdOf(v:any){return text(v?.parent_id||v?.parentId)||null}
function childrenOf(v:any){
  const candidates=[v?.children,v?.categories,v?.subcategories,v?.nodes];
  return candidates.find(Array.isArray)||[];
}
function rootKey(id:string,fullName:string){
  const slug=id.split("TaxonomyCategory/")[1]||"";
  return slug.split("-")[0]||fullName.split(">")[0].trim().toLowerCase().replace(/[^a-z0-9]+/g,"-")||"general";
}
function blocked(fullName:string){
  for(const [pattern,reason] of BLOCKED_PATTERNS)if(pattern.test(fullName))return reason;
  return null;
}

function flatten(raw:any,release:string|null){
  const out=new Map<string,UniverseRow>();
  const visit=(node:any,parentId:string|null,parentPath:string[],depth:number)=>{
    if(!node||typeof node!=="object")return;
    if(Array.isArray(node)){for(const child of node)visit(child,parentId,parentPath,depth);return}
    const id=categoryId(node);
    const name=nameOf(node);
    const kids=childrenOf(node);
    let nextParent=parentId,nextPath=parentPath,nextDepth=depth;
    if(id&&name){
      const full=fullNameOf(node)||[...parentPath,name].filter(Boolean).join(" > ");
      const reason=blocked(full);
      const declaredLeaf=typeof node.is_leaf==="boolean"?node.is_leaf:typeof node.isLeaf==="boolean"?node.isLeaf:null;
      out.set(id,{
        taxonomy_id:id,
        root_key:rootKey(id,full),
        name,
        full_name:full,
        level:Number(node.level)||depth||Math.max(1,full.split(">").length),
        parent_id:parentIdOf(node)||parentId,
        is_leaf:declaredLeaf??kids.length===0,
        active:true,
        source:"shopify-taxonomy",
        eligible_for_sourcing:!reason,
        blocked_reason:reason,
        taxonomy_release:release,
        source_updated_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
      });
      nextParent=id; nextPath=full.split(">").map((x:string)=>x.trim()); nextDepth=(Number(node.level)||depth||nextPath.length)+1;
    }
    for(const [key,value] of Object.entries(node)){
      if(["id","gid","category_id","categoryId","name","label","title","full_name","fullName","breadcrumb","path","parent_id","parentId","is_leaf","isLeaf","level"].includes(key))continue;
      if(key==="children"||key==="categories"||key==="subcategories"||key==="nodes")continue;
      if(Array.isArray(value)||value&&typeof value==="object")visit(value,nextParent,nextPath,nextDepth);
    }
    for(const child of kids)visit(child,nextParent,nextPath,nextDepth);
  };
  visit(raw,null,[],1);
  return [...out.values()];
}

export async function syncShopifyTaxonomy(){
  const response=await fetch(TAXONOMY_URL,{cache:"no-store",signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw new Error("TAXONOMY_DOWNLOAD_"+response.status);
  const gz=Buffer.from(await response.arrayBuffer());
  const raw=JSON.parse(gunzipSync(gz).toString("utf8"));
  const release=text(raw?.version||raw?.release||raw?.taxonomy_version)||null;
  const rows=flatten(raw,release);
  if(rows.length<1000)throw new Error("TAXONOMY_PARSE_TOO_SMALL:"+rows.length);
  await upsertRows(rows);
  return{
    source:TAXONOMY_URL,
    release,
    categories:rows.length,
    leafCategories:rows.filter(r=>r.is_leaf).length,
    sourceable:rows.filter(r=>r.eligible_for_sourcing).length,
    blocked:rows.filter(r=>!r.eligible_for_sourcing).length
  };
}
