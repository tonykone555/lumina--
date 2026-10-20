"use client";

export default function MasonryScanner(){
  // The visual-search camera was added beside the normal YNOT search bar.
  // Keep only the layout rules for the existing search bar; remove the camera
  // trigger and its scanner modal without changing search behaviour.
  return <style jsx global>{`
    .ynot-search-with-scanner{display:flex;align-items:center;gap:9px;width:min(560px,calc(100vw - 24px));margin-inline:auto;position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 18px);transform:translateX(-50%);z-index:110}
    .ynot-search-with-scanner>.ynot-bottom-search{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;transform:none!important;flex:1;min-width:0;width:auto!important;margin:0!important}
    @media(max-width:520px){.ynot-search-with-scanner{width:calc(100vw - 20px);gap:7px;bottom:calc(env(safe-area-inset-bottom,0px) + 12px)}}
  `}</style>;
}
