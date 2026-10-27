"use client";
import {useState,type FormEvent} from "react";
import {ArrowLeft,Heart,Search} from "lucide-react";
import MasonryVisualSearch from "@/components/lumina/MasonryVisualSearch";

export default function YnotWorldOrb({canBack,onBack,onSearch}:{canBack:boolean;onBack:()=>void;onSearch:(q:string)=>void}){
 const [open,setOpen]=useState(false);
 const [query,setQuery]=useState("");
 const submit=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const term=query.trim();if(!term)return;setOpen(false);onSearch(term)};
 return <div className={`ynOrbWrap ${open?"open":""}`}>
  <div className="ynBubble" aria-hidden={!open}>
   <span className="bubbleGlare"/>
   <div className="ynPanelTop">YNOT</div>
   <form className="ynSearchBar" onSubmit={submit}>
    <span className="ynSearchGlyph"><Search size={21} aria-hidden="true"/></span>
    <input className="ynSearchInput" type="search" enterKeyHint="search" autoComplete="off" aria-label="Search this world" placeholder="Search this world" value={query} onChange={e=>setQuery(e.target.value)} tabIndex={open?0:-1}/>
    <button className="ynSearchSubmit" type="submit">Find</button>
   </form>
   <div className="ynActions">
    {canBack&&<button type="button" tabIndex={open?0:-1} onClick={()=>{setOpen(false);onBack()}}><ArrowLeft size={23}/><span>Back</span></button>}
    <div className="ynOrbScan"><MasonryVisualSearch onSearch={q=>{setOpen(false);onSearch(q)}}/></div>
    <button type="button" tabIndex={open?0:-1} onClick={()=>location.href="/?tab=saves"}><Heart size={23}/><span>Saves</span></button>
    <button type="button" tabIndex={open?0:-1} onClick={()=>location.href="/worlds"}><Search size={23}/><span>All YNOT</span></button>
   </div>
  </div>
  <button type="button" className="ynOrb" aria-label={open?"Close YNOTWORLD menu":"Open YNOTWORLD menu"} aria-expanded={open} onClick={()=>setOpen(v=>!v)}><span className="ynGlint a"/><span className="ynGlint b"/><span className="ynOrbText">YNOTWORLD</span></button>
  <style jsx>{`
  .ynOrbWrap{position:fixed;left:50%;bottom:calc(15px + env(safe-area-inset-bottom));transform:translate3d(-50%,0,0);z-index:2147483000;width:94px;height:94px;max-width:100vw;transition:width .45s,height .45s;pointer-events:none}
  .ynOrb,.ynBubble{pointer-events:auto}
  .ynOrb{position:absolute;z-index:3;left:50%;bottom:0;transform:translateX(-50%);width:84px;height:84px;border-radius:50%;border:1px solid #ffffff75;background:radial-gradient(circle at 30% 20%,#ffffff44,transparent 27%),radial-gradient(circle at 50% 56%,#11131cbd 0 46%,#56607180 76%,#ffffff55 100%);box-shadow:inset 9px 12px 20px #ffffff24,inset -12px -15px 24px #0008,0 12px 34px #0008;backdrop-filter:blur(14px) saturate(150%);-webkit-backdrop-filter:blur(14px) saturate(150%);color:#fff;overflow:hidden;transition:width .4s,height .4s}
  .ynOrb:before{content:"";position:absolute;inset:5px;border-radius:50%;border-top:2px solid #ffffffa3;border-left:1px solid #dbe8ff45}
  .ynOrbText{position:relative;z-index:2;font-size:10px;font-weight:900;text-shadow:0 2px 9px #000;white-space:nowrap}
  .ynGlint{position:absolute;border-radius:50%;background:#fff;filter:blur(1px);opacity:.75}.ynGlint.a{width:7px;height:4px;left:20px;top:20px;transform:rotate(-25deg)}.ynGlint.b{width:4px;height:7px;right:16px;bottom:21px;opacity:.35}
  .ynBubble{position:absolute;left:50%;bottom:25px;transform:translateX(-50%) scale(.22);transform-origin:50% 100%;width:min(96vw,710px);height:266px;box-sizing:border-box;padding:20px 26px 67px;border-radius:50% / 50%;opacity:0;visibility:hidden;background:radial-gradient(ellipse at 50% 5%,#ffffff25,transparent 55%),radial-gradient(ellipse at 50% 60%,#17171fc9 0%,#303039ba 65%,#b9b9c04a 100%);border:1px solid #ffffff53;box-shadow:inset 0 4px 22px #ffffff1e,inset 0 -20px 32px #0006,0 24px 70px #0009;backdrop-filter:blur(22px) saturate(135%);-webkit-backdrop-filter:blur(22px) saturate(135%);transition:opacity .2s,transform .5s cubic-bezier(.16,.9,.2,1),visibility .2s}
  .bubbleGlare{position:absolute;left:18%;top:4%;width:56%;height:20%;border-radius:50%;border-top:2px solid #ffffff59;pointer-events:none}
  .open{width:min(96vw,710px);height:294px}.open .ynBubble{opacity:1;visibility:visible;transform:translateX(-50%) scale(1)}.open .ynOrb{width:76px;height:76px}
  .ynPanelTop{position:relative;text-align:center;color:#fff;font-size:22px;line-height:27px;font-weight:900;letter-spacing:.15em;text-shadow:0 2px 10px #000a;margin:0 0 12px}
  .ynSearchBar{box-sizing:border-box!important;position:relative!important;display:grid!important;grid-template-columns:26px minmax(0,1fr) auto!important;align-items:center!important;column-gap:10px!important;width:min(560px,calc(100% - 12px))!important;max-width:100%!important;height:60px!important;min-height:60px!important;margin:0 auto 16px!important;padding:5px 6px 5px 17px!important;border:1px solid rgba(255,255,255,.28)!important;border-radius:999px!important;background:rgba(235,235,245,.13)!important;color:#fff!important;box-shadow:inset 0 2px 8px #ffffff10!important;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);overflow:hidden!important;float:none!important;transform:none!important}
  .ynSearchGlyph{width:26px;height:26px;display:flex;align-items:center;justify-content:center;color:#fff;opacity:.95;flex:none}
  .ynSearchBar .ynSearchInput{box-sizing:border-box!important;display:block!important;position:static!important;float:none!important;width:100%!important;min-width:0!important;max-width:100%!important;height:46px!important;min-height:0!important;max-height:46px!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;outline:0!important;box-shadow:none!important;background:transparent!important;background-image:none!important;color:#fff!important;font-family:inherit!important;font-size:clamp(14px,3.6vw,20px)!important;font-weight:400!important;line-height:46px!important;letter-spacing:0!important;appearance:none!important;-webkit-appearance:none!important;text-align:left!important;transform:none!important;opacity:1!important}
  .ynSearchBar .ynSearchInput::placeholder{color:rgba(255,255,255,.72)!important;opacity:1!important}
  .ynSearchBar .ynSearchInput::-webkit-search-decoration,.ynSearchBar .ynSearchInput::-webkit-search-cancel-button,.ynSearchBar .ynSearchInput::-webkit-search-results-button{display:none!important}
  .ynSearchBar .ynSearchSubmit{box-sizing:border-box!important;position:static!important;display:flex!important;align-items:center!important;justify-content:center!important;float:none!important;flex:none!important;width:104px!important;min-width:104px!important;max-width:104px!important;height:48px!important;min-height:48px!important;margin:0!important;padding:0 14px!important;border:0!important;border-radius:999px!important;background:#f6f6f7!important;background-image:none!important;box-shadow:none!important;color:#131313!important;font-family:inherit!important;font-size:20px!important;font-weight:800!important;line-height:1!important;letter-spacing:-.02em!important;text-transform:none!important;opacity:1!important;visibility:visible!important;transform:none!important;cursor:pointer!important}
  .ynActions{position:relative;display:flex;align-items:flex-start;justify-content:center;gap:clamp(14px,4vw,40px)}
  .ynActions>button{width:66px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:5px;border:0;background:transparent;color:#fff;text-shadow:0 2px 9px #000;cursor:pointer}
  .ynActions>button span{font-size:12px;white-space:nowrap}
  .ynOrbScan{position:relative;width:70px;height:53px;display:flex;align-items:flex-start;justify-content:center}
  @media(max-width:640px){.ynOrbWrap{bottom:calc(13px + env(safe-area-inset-bottom))}.open{height:282px}.ynBubble{width:calc(100vw - 14px);height:256px;padding:18px 18px 65px}.ynPanelTop{font-size:19px;margin-bottom:12px}.ynSearchBar{height:55px!important;min-height:55px!important;margin-bottom:15px!important;padding-left:13px!important;column-gap:8px!important}.ynSearchBar .ynSearchInput{font-size:clamp(14px,3.8vw,17px)!important}.ynSearchBar .ynSearchSubmit{width:91px!important;min-width:91px!important;max-width:91px!important;height:43px!important;min-height:43px!important;font-size:18px!important}.ynActions{gap:clamp(8px,3vw,20px)}.ynActions>button{width:62px}.ynActions>button span{font-size:11px}.ynOrbScan{width:62px}}
  `}</style>
  <style jsx global>{`
   .ynOrbScan .masonryVisualSearch{position:relative!important;inset:auto!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;transform:none!important;width:68px!important;max-width:68px!important;margin:0!important;z-index:auto!important}
   .ynOrbScan .mvsBar{position:relative!important;width:68px!important;height:50px!important;min-width:0!important;display:flex!important;justify-content:center!important;align-items:flex-start!important;border:0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;padding:0!important}
   .ynOrbScan .mvsBar>span,.ynOrbScan .mvsCamera,.ynOrbScan .mvsClear{display:none!important}
   .ynOrbScan .mvsScan{display:flex!important;flex-direction:column!important;align-items:center!important;gap:5px!important;min-width:60px!important;height:auto!important;padding:0!important;background:transparent!important;border:0!important;color:#fff!important;font-size:11px!important;font-weight:400!important;text-shadow:0 2px 9px #000}
   .ynOrbScan .mvsScan svg{width:23px!important;height:23px!important}
   .ynOrbScan .mvsPreview,.ynOrbScan .mvsDetected,.ynOrbScan .mvsMessage{position:absolute!important;left:50%!important;bottom:70px!important;transform:translateX(-50%)!important;width:min(90vw,370px)!important;z-index:2147483647!important;background:#17171be8;border-radius:14px}
   .ynOrbScan .mvsDetected{bottom:28px!important;display:flex!important}.ynOrbScan .mvsMessage{bottom:0!important}
  `}</style>
 </div>
}