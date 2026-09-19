import {NextResponse} from "next/server";

type Item={id:string;title?:string;brand?:string;image?:string;price?:number|null;currency?:string;source?:string};
type EmbedInput={content:Array<{type:"text";text:string}|{type:"image_url";image_url:string}>};

function cosine(a:number[],b:number[]){
 let dot=0,aa=0,bb=0;
 const n=Math.min(a.length,b.length);
 for(let i=0;i<n;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i]}
 return aa&&bb?dot/(Math.sqrt(aa)*Math.sqrt(bb)):0;
}
function input(item:Item):EmbedInput{
 const content:EmbedInput["content"]=[{type:"text",text:[item.brand,item.title,item.price!=null?`${item.price} ${item.currency||""}`:"",item.source].filter(Boolean).join(" · ")}];
 if(item.image&&/^https?:\/\//i.test(item.image))content.push({type:"image_url",image_url:item.image});
 return{content};
}
export async function POST(request:Request){
 try{
  const body=await request.json();
  const reference=body?.reference as Item|undefined;
  const candidates=(Array.isArray(body?.candidates)?body.candidates:[]) as Item[];
  if(!reference?.id||!candidates.length)return NextResponse.json({ids:[]});
  const key=process.env.VOYAGE_API_KEY;
  if(!key)return NextResponse.json({ids:[],fallback:true,reason:"VOYAGE_API_KEY_MISSING"});
  const inputs=[input(reference),...candidates.slice(0,24).map(input)];
  const response=await fetch("https://api.voyageai.com/v1/multimodalembeddings",{
   method:"POST",
   headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},
   body:JSON.stringify({model:"voyage-multimodal-3.5",input_type:"document",inputs}),
   cache:"no-store"
  });
  const data=await response.json().catch(()=>({}));
  const rows=Array.isArray(data?.data)?data.data:[];
  const vectors:number[][]=rows.map((entry:any)=>entry?.embedding).filter(Array.isArray);
  if(!response.ok||vectors.length<inputs.length)return NextResponse.json({ids:[],fallback:true,error:data?.detail||data?.message||"VISUAL_EMBEDDING_FAILED"});
  const ref=vectors[0];
  const ranked=candidates.slice(0,24).map((item,index)=>({id:item.id,score:cosine(ref,vectors[index+1]||[])})).sort((a,b)=>b.score-a.score).slice(0,6);
  return NextResponse.json({ids:ranked.map(x=>x.id),scores:ranked});
 }catch{
  return NextResponse.json({ids:[],fallback:true,error:"VISUAL_SIMILARITY_FAILED"});
 }
}
