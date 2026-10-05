"use client";

import Script from "next/script";
import {usePathname} from "next/navigation";

const CORE_COMMERCE_SCRIPTS = [
  "/price-source-normalizer.js?v=1",
  "/country-currency-bag.js?v=2",
  "/ynot-button-reliability.js?v=1",
];

const PRODUCT_UI_SCRIPTS = [
  "/ynot-deal-popup.js",
  "/ynot-deal-enhancer.js",
  "/popup-image-tap-cycle.js",
  "/ynot-deal-swipe.js",
  "/ynot-bag-icon-sync.js",
  "/ynot-saves-edge.js",
  "/ynot-deal-final-media.js",
  "/mobile-popup-close-stability.js",
  "/product-card-tap-stability.js",
  "/ynot-deal-tap-heart.js",
  "/mobile-gallery-ynot-fix.js",
  "/product-detail-placement-fix.js",
  "/product-gallery-chrome-kill.js",
  "/product-options-glass.js?v=2",
  "/force-about-section.js?v=1",
];

const WORLD_UI_SCRIPTS = [
  "/profile-avatar-open.js",
  "/final-mobile-control-lock.js",
  "/ynot-world-drag-stability.js",
  "/etsy-card-enhancer.js",
  "/ynot-deals-stability.js",
  "/ebay-load-guard.js",
  "/category-world-remap.js",
];

const FULL_WORLD_PREFIXES = ["/shop", "/worlds", "/electric"];
const PRODUCT_PREFIXES = ["/p", "/spot", "/ai-shopping", "/feed", "/r", "/c"];
const COMMERCE_PREFIXES = ["/commerce", "/checkout"];

function matches(pathname:string,prefixes:string[]){
  return prefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function scriptsForPath(pathname:string){
  if(pathname === "/" || matches(pathname,FULL_WORLD_PREFIXES)){
    return [...CORE_COMMERCE_SCRIPTS,...PRODUCT_UI_SCRIPTS,...WORLD_UI_SCRIPTS];
  }
  if(matches(pathname,PRODUCT_PREFIXES)){
    return [...CORE_COMMERCE_SCRIPTS,...PRODUCT_UI_SCRIPTS];
  }
  if(matches(pathname,COMMERCE_PREFIXES) || pathname === "/room" || pathname.startsWith("/room/")){
    return CORE_COMMERCE_SCRIPTS;
  }
  return [];
}

export default function LegacyShoppingScripts(){
  const pathname = usePathname();
  const scripts = scriptsForPath(pathname);
  if(!scripts.length && pathname !== "/") return null;

  return <>
    {scripts.map(src => <Script key={src} src={src} strategy="afterInteractive" />)}
    {pathname === "/" ? <Script src="/ynot-desktop-home-video.js?v=11" strategy="afterInteractive" /> : null}
  </>;
}
