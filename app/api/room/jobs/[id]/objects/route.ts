import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const DEFAULT_OBJECTS_ENDPOINT="https://tonykone555--ynot-room-objects-room-objects.modal.run";
const MIN_CONFIDENCE:Record<string,number>={lamp:.36,chandelier:.36,television:.40,mirror:.34,rug:.34};
const LIGHTING=new Set(["lamp","chandelier"]);

type DetectedObject=Record<string,unknown>&{id?:string;category?:string;confidence?:number;evidence?:Array<Record<string,unknown>>};

function modalHeaders():HeadersInit{
  const headers:HeadersInit={};
  const token=String(process.env.MODAL_ROOM_TOKEN||"").trim();
  if(token)headers.Authorization=`Bearer ${token}`;
  return headers;
}

function boxFrom(object:DetectedObject){
  const box=object.evidence?.[0]?.box;
  if(!Array.isArray(box)||box.length!==4)return null;
  const values=box.map(Number);
  return values.every(Number.isFinite)?values:null;
}
function iou(a:number[],b:number[]){
  const [ax1,ay1,ax2,ay2]=a,[bx1,by1,bx2,by2]=b;
  const intersection=Math.max(0,Math.min(ax2,bx2)-Math.max(ax1,bx1))*Math.max(0,Math.min(ay2,by2)-Math.max(ay1,by1));
  const areaA=Math.max(0,ax2-ax1)*Math.max(0,ay2-ay1),areaB=Math.max(0,bx2-bx1)*Math.max(0,by2-by1);
  return intersection/Math.max(1,areaA+areaB-intersection);
}
function cleanObjects(value:unknown){
  if(!Array.isArray(value))return [];
  const ranked=(value as DetectedObject[])
    .filter(object=>Number(object.confidence||0)>=(MIN_CONFIDENCE[String(object.category||"")]??.30))
    .sort((a,b)=>Number(b.confidence||0)-Number(a.confidence||0));
  const kept:DetectedObject[]=[];
  for(const candidate of ranked){
    const candidateCategory=String(candidate.category||"");
    const candidateBox=boxFrom(candidate);
    const duplicate=kept.some(existing=>{
      const existingCategory=String(existing.category||"");
      const related=candidateCategory===existingCategory||(LIGHTING.has(candidateCategory)&&LIGHTING.has(existingCategory));
      const existingBox=boxFrom(existing);
      return Boolean(related&&candidateBox&&existingBox&&iou(candidateBox,existingBox)>.50);
    });
    if(!duplicate)kept.push(candidate);
  }
  return kept;
}

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id:rawId}=await params;
  const id=String(rawId||"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,80);
  if(!id)return NextResponse.json({error:"Missing room id",code:"ROOM_ID_REQUIRED"},{status:400});

  const url=new URL(String(process.env.MODAL_ROOM_OBJECTS_ENDPOINT||DEFAULT_OBJECTS_ENDPOINT).trim());
  url.searchParams.set("id",id);
  if(new URL(request.url).searchParams.get("refresh")==="true")url.searchParams.set("refresh","true");

  try{
    const response=await fetch(url,{headers:modalHeaders(),cache:"no-store",signal:AbortSignal.timeout(120_000)});
    const data=await response.json().catch(()=>({})) as Record<string,unknown>;
    if(!response.ok){
      return NextResponse.json({
        error:String(data?.detail||data?.error||"Furniture detection is not ready."),
        code:response.status===404?"ROOM_OBJECTS_NOT_READY":"ROOM_OBJECTS_FAILED",
        id,
      },{status:response.status===404?404:502,headers:{"Cache-Control":"no-store"}});
    }
    const objects=cleanObjects(data.objects);
    return NextResponse.json({
      id,
      status:String(data.status||"complete"),
      sourceView:data.sourceView,
      detector:data.detector,
      rawObjectCount:Array.isArray(data.objects)?data.objects.length:0,
      objectCount:objects.length,
      objects,
      measurementDisclaimer:data.measurementDisclaimer,
      catalogueMatching:"client-live-catalogue",
    },{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("[ynot-room] furniture detection unavailable",{id,error:error instanceof Error?error.message:"unknown"});
    return NextResponse.json({error:"Furniture detection could not be reached.",code:"ROOM_OBJECTS_UNREACHABLE",id},{status:502,headers:{"Cache-Control":"no-store"}});
  }
}
