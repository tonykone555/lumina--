import {NextResponse} from "next/server";

const FOLDER_URL="https://drive.google.com/drive/folders/1aSv3Nhvo6UgtWl5Rog-CtG6lj1FxdmUP";

export async function GET(){
 try{
  const r=await fetch(FOLDER_URL,{headers:{"User-Agent":"Mozilla/5.0"},next:{revalidate:3600}});
  if(!r.ok)throw new Error("drive");
  const html=await r.text();
  const found=new Map<string,string>();
  const re=/\[\"([A-Za-z0-9_-]{20,})\"[^\]]{0,500}?\"(Quit9To5Interior[^\"]+?\.jpe?g)\"/gi;
  let m:RegExpExecArray|null;
  while((m=re.exec(html))!==null){if(!found.has(m[1]))found.set(m[1],m[2])}
  if(!found.size){
   const ids=[...html.matchAll(/\/file\/d\/([A-Za-z0-9_-]{20,})/g)].map(x=>x[1]);
   ids.forEach((id,i)=>found.set(id,`Interior ${i+1}`));
  }
  const items=[...found.entries()].map(([id,title],i)=>({id:`drive-${id}`,type:"photo",src:`https://drive.google.com/thumbnail?id=${id}&sz=w1600`,thumb:`https://drive.google.com/thumbnail?id=${id}&sz=w800`,alt:title||`Interior inspiration ${i+1}`,source:"drive"}));
  return NextResponse.json({items,count:items.length},{headers:{"Cache-Control":"public, s-maxage=3600, stale-while-revalidate=86400"}})
 }catch{return NextResponse.json({items:[],count:0},{status:200})}
}
