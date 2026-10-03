"use client";

import Script from "next/script";
import {usePathname} from "next/navigation";

const SHOPPING_PREFIXES = [
  "/shop",
  "/worlds",
  "/p",
  "/room",
  "/spot",
  "/electric",
  "/ai-shopping",
  "/commerce",
  "/checkout",
  "/feed",
  "/r",
  "/c",
];

const SHOPPING_SCRIPTS = [
  "/ynot-deal-popup.js",
  "/ynot-deal-enhancer.js",
  "/popup-image-tap-cycle.js",
  "/ynot-deal-swipe.js",
  "/ynot-bag-icon-sync.js",
  "/ynot-saves-edge.js",
  "/ynot-deal-final-media.js",
  "/mobile-popup-close-stability.js",
  "/product-card-tap-stability.js",
  "/profile-avatar-open.js",
  "/ynot-deal-tap-heart.js",
  "/final-mobile-control-lock.js",
  "/ynot-world-drag-stability.js",
  "/price-source-normalizer.js?v=1",
  "/country-currency-bag.js?v=2",
  "/ynot-button-reliability.js?v=1",
  "/etsy-card-enhancer.js",
  "/ynot-deals-stability.js",
  "/ebay-load-guard.js",
  "/category-world-remap.js",
  "/mobile-gallery-ynot-fix.js",
  "/product-detail-placement-fix.js",
  "/product-gallery-chrome-kill.js",
  "/product-options-glass.js?v=2",
];

function isShoppingPath(pathname:string){
  if(pathname === "/") return true;
  return SHOPPING_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function LegacyShoppingScripts(){
  const pathname = usePathname();
  if(!isShoppingPath(pathname)) return null;

  return <>
    {SHOPPING_SCRIPTS.map(src => <Script key={src} src={src} strategy="afterInteractive" />)}
    {pathname === "/" ? <Script src="/ynot-desktop-home-video.js?v=11" strategy="afterInteractive" /> : null}
  </>;
}
