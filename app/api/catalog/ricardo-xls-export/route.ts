import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=60;
const xml=(v:unknown)=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g," ");
const cell=(v:unknown,style?:string)=>'<Cell'+(style?' ss:StyleID="'+style+'"':'')+'><Data ss:Type="String">'+xml(v)+'</Data></Cell>';
export async function GET(req:NextRequest){
 try{
  const u=new URL("/api/catalog/ricardo-five-photo-export",req.nextUrl.origin);
  u.searchParams.set("format","json");u.searchParams.set("limit","100");
  const response=await fetch(u,{cache:"no-store",signal:AbortSignal.timeout(55000)});
  if(!response.ok)throw Error("Source export "+response.status);
  const data=await response.json();
  const products=Array.isArray(data.products)?data.products:[];
  if(!products.length)throw Error("No image-rich products returned");
  const headers=["Product ID","Title (max 60)","Description (max 5000)","Condition (verify)","Brand","Category search","Price CHF (required)","Stock (required)","Shipping cost CHF (required)","Image count","Image 1","Image 2","Image 3","Image 4","Image 5","Image 6","Image 7","Image 8","Image 9","Image 10","Supplier URL (internal)","Supplier price (internal)","Supplier currency","Photo use rights verified","Swiss delivery verified","Variant verified","Listing status"];
  const list=products.filter((p:any)=>Array.isArray(p.images)&&new Set(p.images).size>=5).map((p:any)=>{
    const desc=String(p.description||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,5000);
    return [p.id,String(p.title||"").slice(0,60),desc,"",p.seller||"",p.category_query||"","","","",new Set(p.images).size,...Array.from({length:10},(_,i)=>p.images[i]||""),p.product_url||"",p.price??"",p.currency||"","NOT VERIFIED","NOT VERIFIED","NOT VERIFIED","DRAFT — NOT APPROVED"];
  }).slice(0,100);
  const headerRow='<Row>'+headers.map(h=>cell(h,"header")).join("")+'</Row>';
  const rows=list.map((r:any[])=>'<Row>'+r.map(v=>cell(v)).join("")+'</Row>').join("");
  const note='<Row>'+[cell("IMPORTANT: Source image URLs are not automatically licensed for reuse on Ricardo."),cell("Prices are supplier figures, NOT CHF selling prices. Confirm Swiss shipping, rights, stock and exact variant. This is NOT an official Ricardo-import schema.")].join("")+'</Row>';
  const body='<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>'+
  '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'+
  '<Styles><Style ss:ID="header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#164E63" ss:Pattern="Solid"/></Style></Styles>'+
  '<Worksheet ss:Name="Ricardo drafts"><Table>'+headerRow+rows+'</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane></WorksheetOptions></Worksheet>'+
  '<Worksheet ss:Name="Instructions"><Table>'+note+'</Table></Worksheet></Workbook>';
  return new NextResponse(body,{headers:{"Content-Type":"application/vnd.ms-excel; charset=utf-8","Content-Disposition":'attachment; filename="YNOT_Ricardo_100_product_drafts.xls"',"Cache-Control":"no-store","X-Qualified-Count":String(list.length)}});
 }catch(e){console.error("Ricardo XLS error",e);return NextResponse.json({error:"XLS export not available"},{status:503})}
}