"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowUpRight,MoveUp} from "lucide-react";
import catalogue from "@/data/merchant/ynot-live-premium-70-pendant-chairs-review.json";

const featured=[catalogue.products[12],catalogue.products[51],catalogue.products[61]].filter(Boolean);
export default function StudioHomeEntry(){
 const [index,setIndex]=useState(0);
 useEffect(()=>{const t=setInterval(()=>setIndex(i=>(i+1)%featured.length),4600);return()=>clearInterval(t)},[]);
 const image=featured[index]?.image_link||featured[0]?.image_link;
 return <Link href="/worlds/studio" className="ynot-studio-home-entry" aria-label="Open YNOT Studio, immersive interior design product feed">
  <img key={image} src={image} alt="Featured YNOT Studio interior design selection" loading="eager"/>
  <span className="ynot-studio-home-tint"/>
  <span className="ynot-studio-home-top">NEW WORLD <MoveUp size={12}/></span>
  <span className="ynot-studio-home-copy"><small>THE INTERIORS EDIT</small><strong>YNOT <em>Studio</em></strong><span>Swipe through designer lighting and furniture</span><b>EXPLORE <ArrowUpRight size={14}/></b></span>
  <style jsx global>{`
  .ynot-studio-home-entry{position:fixed;z-index:2147481000;left:clamp(12px,3vw,34px);bottom:calc(94px + env(safe-area-inset-bottom));width:clamp(176px,20vw,245px);height:clamp(187px,25vw,300px);border-radius:21px;overflow:hidden;background:#24211f;color:#fff;text-decoration:none;border:1px solid #fff5;box-shadow:0 12px 54px #0008;isolation:isolate;display:block;transition:transform .3s ease,border-color .3s ease}
  .ynot-studio-home-entry:hover{transform:translateY(-6px);border-color:#fffa}.ynot-studio-home-entry>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;animation:studio-home-enter .7s ease both}
  @keyframes studio-home-enter{from{opacity:.4;transform:scale(1.06)}to{opacity:1;transform:scale(1)}}
  .ynot-studio-home-tint{position:absolute;inset:0;background:linear-gradient(180deg,#0008 0%,transparent 36%,#000c 100%)}
  .ynot-studio-home-top{position:absolute;left:12px;top:12px;right:12px;display:flex;justify-content:space-between;align-items:center;font-size:9px;letter-spacing:.19em;font-weight:700}
  .ynot-studio-home-copy{position:absolute;left:14px;right:12px;bottom:14px;display:flex;flex-direction:column;align-items:flex-start;gap:5px;text-shadow:0 2px 8px #000a}.ynot-studio-home-copy small{font-size:8px;letter-spacing:.13em;font-weight:700;color:#fffd}.ynot-studio-home-copy strong{font-size:clamp(24px,3vw,32px);letter-spacing:-.065em;line-height:1.04}.ynot-studio-home-copy em{font-style:normal;font-weight:400}.ynot-studio-home-copy>span{font-size:10px;line-height:1.4;max-width:185px;color:#fffe}.ynot-studio-home-copy b{font-size:10px;margin-top:6px;display:flex;align-items:center;gap:8px;border:1px solid #fffb;border-radius:99px;padding:7px 11px;background:#2224;backdrop-filter:blur(9px)}
  @media(max-width:650px){.ynot-studio-home-entry{left:10px;bottom:calc(105px + env(safe-area-inset-bottom));width:140px;height:176px;border-radius:16px}.ynot-studio-home-top{font-size:7px;left:10px;top:9px;right:10px}.ynot-studio-home-copy{bottom:10px;left:10px;right:7px;gap:4px}.ynot-studio-home-copy small{font-size:7px}.ynot-studio-home-copy strong{font-size:23px}.ynot-studio-home-copy>span{font-size:9px}.ynot-studio-home-copy b{margin-top:3px;font-size:8px;padding:6px 8px}}
  @media(max-height:620px){.ynot-studio-home-entry{bottom:calc(77px + env(safe-area-inset-bottom));width:120px;height:145px}.ynot-studio-home-copy>span{display:none}}
  @media(prefers-reduced-motion:reduce){.ynot-studio-home-entry>img{animation:none}}
  `}</style>
 </Link>
}
