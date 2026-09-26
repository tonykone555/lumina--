import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const ASSET_ENDPOINT="https://tonykone555--ynot-product-3d-product-asset.modal.run";

export async function GET(request:Request){
  const productId=String(new URL(request.url).searchParams.get("productId")||"").trim();
  if(!productId)return NextResponse.json({error:"productId is required",code:"PRODUCT_ID_REQUIRED"},{status:400});
  const url=new URL(ASSET_ENDPOINT);url.searchParams.set("id",productId);
  try{
    const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(30_000)});
    if(!response.ok){
      const detail=await response.text().catch(()=>"");
      return NextResponse.json({error:detail||"Product 3D asset is not ready",code:response.status===404?"PRODUCT_3D_NOT_READY":"PRODUCT_3D_ASSET_FAILED"},{status:response.status===404?404:502});
    }
    const bytes=await response.arrayBuffer();
    return new NextResponse(bytes,{status:200,headers:{"Content-Type":"model/gltf-binary","Content-Length":String(bytes.byteLength),"Cache-Control":"public, max-age=31536000, immutable"}});
  }catch(error){
    console.error("[ynot-room] product 3D asset proxy failed",error);
    return NextResponse.json({error:"Product 3D asset could not be reached",code:"PRODUCT_3D_ASSET_UNREACHABLE"},{status:502});
  }
}