"use client";

import {useMemo,useState} from "react";
import {ArrowRight,BookOpen,Check,CircleUserRound,Clapperboard,Image as ImageIcon,Play,Upload,UserRound,Video,WandSparkles} from "lucide-react";

type CreatorProduct={id:string;product_id:string;title:string;brand?:string;image_url?:string;price?:number|null;currency:string;commission_rate:number;commission_cents?:number|null};
type Mode="video-self"|"video-avatar"|"image-self"|"ai-avatar"|"product-only";
type Step="product"|"source"|"avatar"|"creative"|"review";

const creativeAngles=[
 {id:"testimonial",title:"UGC testimonial",desc:"Natural creator-led review with a strong first-person hook."},
 {id:"problem",title:"Problem → solution",desc:"Open with a relatable problem, then reveal the product."},
 {id:"routine",title:"Routine / lifestyle",desc:"Blend the product into a daily routine so it feels native."},
 {id:"demo",title:"Product demo",desc:"Show the product being used with clear visual proof."},
];

export default function CreatorStudio({products}:{products:CreatorProduct[]}){
 const[step,setStep]=useState<Step>("product"),[productId,setProductId]=useState(products[0]?.product_id||""),[mode,setMode]=useState<Mode>("video-avatar"),[angle,setAngle]=useState("testimonial"),[avatar,setAvatar]=useState("new-avatar"),[sourceName,setSourceName]=useState(""),[notice,setNotice]=useState("");
 const product=useMemo(()=>products.find(p=>p.product_id===productId)||products[0],[products,productId]);
 const steps:Step[]=["product","source","avatar","creative","review"],current=steps.indexOf(step);
 function next(){setStep(steps[Math.min(current+1,steps.length-1)])}
 function back(){setStep(steps[Math.max(current-1,0)])}
 function fakeUpload(file?:File){if(file){setSourceName(file.name);setNotice("Reference video selected. It will be used as the motion/performance source once Higgsfield is connected.")}}
 if(!products.length)return <section className="creatorPanel studioEmpty"><Clapperboard/><h2>Pick a product before opening Studio</h2><p>Add a product to your creator catalogue first. Studio uses your selected product, creator reference and chosen workflow to build the content job.</p></section>;
 return <section className="studioShell">
  <div className="studioIntro"><div><span>YNOT CREATOR STUDIO</span><h2>Turn yourself — or an avatar — into the product creative.</h2><p>Use your own performance as the source motion, keep yourself in the final video, or replace yourself with another avatar while preserving the movement and delivery. Then swap in the product and finish the ad around it.</p></div><div className="studioFlow"><span>PRODUCT</span><i>→</i><span>SOURCE VIDEO</span><i>→</i><span>AVATAR</span><i>→</i><span>V2V</span><i>→</i><span>POST</span></div></div>
  <div className="studioProgress">{steps.map((s,i)=><button key={s} className={i===current?"active":i<current?"done":""} onClick={()=>i<=current&&setStep(s)}><b>{i<current?<Check/>:i+1}</b><span>{s==="product"?"Product":s==="source"?"Source":s==="avatar"?"Avatar":s==="creative"?"Creative":"Review"}</span></button>)}</div>
  {notice&&<div className="creatorNotice">{notice}</div>}

  {step==="product"&&<div className="studioStage"><div className="studioStageHead"><span>STEP 1</span><h3>Choose what you are promoting.</h3><p>Studio only uses products already in your YNOT creator catalogue.</p></div><div className="studioProductChoice">{products.map(p=><button key={p.product_id} className={productId===p.product_id?"active":""} onClick={()=>setProductId(p.product_id)}>{p.image_url?<img src={p.image_url} alt=""/>:<span>Y</span>}<div><strong>{p.title}</strong><small>{p.brand||"YNOT"} · {Math.round(Number(p.commission_rate||.05)*100)}% commission</small></div>{productId===p.product_id?<Check/>:null}</button>)}</div><div className="studioFooter"><span/><button className="creatorAction" onClick={next}>Choose source <ArrowRight/></button></div></div>}

  {step==="source"&&<div className="studioStage"><div className="studioStageHead"><span>STEP 2 · VIDEO-TO-VIDEO FIRST</span><h3>Give YNOT the performance.</h3><p>This is the motion source. You can record yourself talking, demonstrating, walking, holding a placeholder object, or performing the exact actions you want in the finished ad.</p></div><div className="studioModeGrid">
    <button className={mode==="video-self"?"active":""} onClick={()=>setMode("video-self")}><Video/><strong>Keep me in the video</strong><p>Your motion and identity stay. YNOT/Higgsfield changes the product, styling or environment around you.</p></button>
    <button className={mode==="video-avatar"?"active":""} onClick={()=>setMode("video-avatar")}><CircleUserRound/><strong>Replace me with an avatar</strong><p><b>Your original performance stays.</b> The final person can be a different avatar/persona while preserving the motion, framing and delivery of your source clip.</p></button>
    <button className={mode==="image-self"?"active":""} onClick={()=>setMode("image-self")}><ImageIcon/><strong>Start from my image</strong><p>Use your portrait/full-body reference when you do not have a source clip.</p></button>
    <button className={mode==="ai-avatar"?"active":""} onClick={()=>setMode("ai-avatar")}><UserRound/><strong>AI creator</strong><p>Create the entire presenter without showing yourself.</p></button>
    <button className={mode==="product-only"?"active":""} onClick={()=>setMode("product-only")}><Clapperboard/><strong>Product only</strong><p>No presenter. Build a cinematic or demo-led product ad.</p></button>
   </div>
   {(mode==="video-self"||mode==="video-avatar")&&<label className="studioUpload"><Upload/><strong>{sourceName||"Upload your source performance video"}</strong><span>Vertical 9:16 is ideal. Your movement becomes the motion blueprint for the final video.</span><input type="file" accept="video/*" onChange={e=>fakeUpload(e.target.files?.[0])}/></label>}
   <div className="studioFooter"><button className="studioBack" onClick={back}>Back</button><button className="creatorAction" onClick={next}>Choose avatar <ArrowRight/></button></div></div>}

  {step==="avatar"&&<div className="studioStage"><div className="studioStageHead"><span>STEP 3</span><h3>{mode==="video-avatar"?"Who should replace you?":"Choose the presenter identity."}</h3><p>{mode==="video-avatar"?"The source clip still supplies the performance. This step only changes who appears in that performance.":"Save reusable creator identities so the same face/look can be used across products."}</p></div>
   <div className="studioAvatarGrid"><button className={avatar==="me"?"active":""} onClick={()=>setAvatar("me")}><UserRound/><strong>Me</strong><span>Keep my identity</span></button><button className={avatar==="new-avatar"?"active":""} onClick={()=>setAvatar("new-avatar")}><CircleUserRound/><strong>Different avatar</strong><span>Replace the person while keeping source motion</span></button><button className={avatar==="saved"?"active":""} onClick={()=>setAvatar("saved")}><WandSparkles/><strong>Saved persona</strong><span>Reuse one of my Studio identities</span></button></div>
   {mode==="video-avatar"&&<div className="studioExplain"><Play/><div><b>Video-to-video avatar replacement</b><span>Example: you record the motions and dialogue timing yourself → YNOT sends that source performance into the video-to-video workflow → the final video can show a different model/avatar performing those same actions with the selected product.</span></div></div>}
   <div className="studioFooter"><button className="studioBack" onClick={back}>Back</button><button className="creatorAction" onClick={next}>Choose creative <ArrowRight/></button></div></div>}

  {step==="creative"&&<div className="studioStage"><div className="studioStageHead"><span>STEP 4</span><h3>Choose the selling angle.</h3><p>YNOT builds the hook, scene instructions, product fidelity notes, caption and CTA around this choice.</p></div><div className="studioAngleGrid">{creativeAngles.map(x=><button key={x.id} className={angle===x.id?"active":""} onClick={()=>setAngle(x.id)}><strong>{x.title}</strong><span>{x.desc}</span></button>)}</div><div className="studioFooter"><button className="studioBack" onClick={back}>Back</button><button className="creatorAction" onClick={next}>Review workflow <ArrowRight/></button></div></div>}

  {step==="review"&&<div className="studioStage"><div className="studioStageHead"><span>READY TO BUILD</span><h3>Your Studio job</h3><p>This review page is intentionally explicit so the creator always knows what will be changed before generation.</p></div>
   <div className="studioReview">
    <div><small>PRODUCT</small><strong>{product?.title}</strong><span>{product?.brand||"YNOT"}</span></div>
    <div><small>METHOD</small><strong>{mode==="video-avatar"?"Video-to-video + avatar replacement":mode==="video-self"?"Video-to-video · keep creator":mode==="image-self"?"Creator image → video":mode==="ai-avatar"?"AI avatar generation":"Product-only generation"}</strong><span>{mode==="video-avatar"?"Preserve motion/performance; replace the visible person.":"Creator-selected workflow."}</span></div>
    <div><small>CREATIVE ANGLE</small><strong>{creativeAngles.find(x=>x.id===angle)?.title}</strong><span>YNOT will generate hook, script, CTA and platform variants.</span></div>
    <div><small>ATTRIBUTION</small><strong>Your YNOT creator link</strong><span>Finished content stays tied to your promoted product.</span></div>
   </div>
   <div className="studioPipeline"><span><b>1</b> Analyse source</span><i>→</i><span><b>2</b> Replace/avatar</span><i>→</i><span><b>3</b> Product swap</span><i>→</i><span><b>4</b> Final video</span><i>→</i><span><b>5</b> Caption + link</span></div>
   <div className="studioProviderNote"><WandSparkles/><div><b>Rendering connection still required</b><span>The YNOT workflow and UI are now defined. The final Generate action should call Higgsfield's current video-to-video API once its API credentials/billing are connected to YNOT.</span></div></div>
   <div className="studioFooter"><button className="studioBack" onClick={back}>Back</button><button className="creatorAction" onClick={()=>setNotice("Workflow saved conceptually. Connect Higgsfield API billing/credentials to enable real video generation.")}><Clapperboard/> Generate video</button></div>
  </div>}
 </section>;
}
