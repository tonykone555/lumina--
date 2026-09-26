import {NextResponse} from "next/server";
import {getVercelOidcToken} from "@vercel/oidc";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const SUBMIT_ENDPOINT="https://tonykone555--ynot-product-3d-submit-product.modal.run";
const STATUS_ENDPOINT="https://tonykone555--ynot-product-3d-product-status.modal.run";
const VERCEL_PROJECT="prj_xDNNAY7MBUIbDHLaJkOdPsUz2C7X";
const VERCEL_TEAM="team_9yqHjLzE6wUmudwIHFS4EutR";

function modalHeaders():HeadersInit{
  const headers:HeadersInit={};
  const token=String(process.env.MODAL_ROOM_TOKEN||"").trim();
  if(token)headers.Authorization=`Bearer ${token}`;
  return headers;
}

async function submitHeaders():Promise<HeadersInit>{
  const headers:HeadersInit={...modalHeaders()};
  try{
    const oidc=String(await getVercelOidcToken({project:VERCEL_PROJECT,team:VERCEL_TEAM})||"").trim();
    if(oidc)headers["X-Vercel-OIDC-Token"]=oidc;
  }catch(error){
    console.warn("[ynot-room] product-3d OIDC unavailable",error instanceof Error?error.message:"unknown");
  }
  return headers;
}

function safeAsset(data:Record<string,unknown>){
  const productId=String(data.productId||"");
  const ready=String(data.status||"")==="ready";
  return {
    productId,
    key:String(data.key||""),
    status:String(data.status||"unknown"),
    stage:String(data.stage||""),
    generator:String(data.generator||"spar3d"),
    model:String(data.model||""),
    cached:data.cached===true,
    dimensions:Array.isArray(data.dimensions)?data.dimensions:undefined,
    bytes:typeof data.bytes==="number"?data.bytes:undefined,
    error:typeof data.error==="string"?data.error:undefined,
    assetUrl:ready&&productId?`/api/room/product-assets/file?productId=${encodeURIComponent(productId)}`:undefined,
  };
}

export async function GET(request:Request){
  const productId=String(new URL(request.url).searchParams.get("productId")||"").trim();
  if(!productId)return NextResponse.json({error:"productId is required",code:"PRODUCT_ID_REQUIRED"},{status:400});
  const url=new URL(STATUS_ENDPOINT);url.searchParams.set("id",productId);
  try{
    const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(20_000)});
    const data=await response.json().catch(()=>({})) as Record<string,unknown>;
    if(!response.ok)return NextResponse.json({error:String(data.detail||data.error||"Product 3D asset not found"),code:response.status===404?"PRODUCT_3D_NOT_FOUND":"PRODUCT_3D_STATUS_FAILED"},{status:response.status===404?404:502,headers:{"Cache-Control":"no-store"}});
    return NextResponse.json(safeAsset(data),{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("[ynot-room] product 3D status failed",error);
    return NextResponse.json({error:"Product 3D worker could not be reached",code:"PRODUCT_3D_UNREACHABLE"},{status:502});
  }
}

export async function POST(request:Request){
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  if(!body)return NextResponse.json({error:"Invalid request",code:"INVALID_JSON"},{status:400});
  const productId=String(body.productId||"").trim().slice(0,300);
  const imageUrl=String(body.imageUrl||"").trim();
  const title=String(body.title||"").slice(0,240);
  const category=String(body.category||"sofa").slice(0,60);
  if(!productId||!imageUrl)return NextResponse.json({error:"productId and imageUrl are required",code:"PRODUCT_3D_INPUT_REQUIRED"},{status:400});
  if(!productId.startsWith("gid://shopify/"))return NextResponse.json({error:"The first Room replacement version supports Shopify catalogue products only",code:"PRODUCT_3D_SOURCE_UNSUPPORTED"},{status:400});
  try{
    const image=new URL(imageUrl);
    if(image.protocol!=="https:"||image.hostname!=="cdn.shopify.com")throw new Error("unsupported host");
  }catch{return NextResponse.json({error:"A valid Shopify CDN product image is required",code:"PRODUCT_3D_IMAGE_UNSUPPORTED"},{status:400})}

  const headers=await submitHeaders();
  if(!("X-Vercel-OIDC-Token" in headers)&&!("Authorization" in headers))return NextResponse.json({error:"Secure product generation identity is unavailable",code:"PRODUCT_3D_AUTH_NOT_CONFIGURED"},{status:503});
  try{
    const response=await fetch(SUBMIT_ENDPOINT,{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({productId,imageUrl,title,category}),cache:"no-store",signal:AbortSignal.timeout(25_000)});
    const data=await response.json().catch(()=>({})) as Record<string,unknown>;
    if(!response.ok)return NextResponse.json({error:String(data.detail||data.error||"Product 3D generation was rejected"),code:response.status===401?"PRODUCT_3D_AUTH_REJECTED":"PRODUCT_3D_REJECTED"},{status:response.status===401?502:response.status,headers:{"Cache-Control":"no-store"}});
    return NextResponse.json(safeAsset(data),{status:String(data.status||"")==="ready"?200:202,headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("[ynot-room] product 3D submit failed",error);
    return NextResponse.json({error:"Product 3D worker could not be reached",code:"PRODUCT_3D_UNREACHABLE"},{status:502});
  }
}