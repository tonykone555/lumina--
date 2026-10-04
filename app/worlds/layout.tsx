"use client";

import {useEffect} from "react";
import UnifiedBag from "@/components/lumina/UnifiedBag";
import ProductDetailHydrator from "@/components/lumina/ProductDetailHydrator";
import ProductAttributeSatellites from "@/components/lumina/ProductAttributeSatellites";
import "@/app/styles/ynot-attribute-satellites.css";

const THEME_KEY="ynot-world-theme";

export default function WorldsLayout({children}:{children:React.ReactNode}){
  useEffect(()=>{
    const saved=localStorage.getItem(THEME_KEY);
    const theme=saved==="dark"?"dark":"light";
    const root=document.documentElement;
    root.dataset.ynotWorldTheme=theme;
    root.style.colorScheme=theme;
    root.classList.toggle("ynot-world-dark",theme==="dark");
    root.classList.toggle("ynot-world-light",theme!=="dark");

    const onTheme=(event:Event)=>{
      const next=(event as CustomEvent)?.detail?.theme==="dark"?"dark":"light";
      localStorage.setItem(THEME_KEY,next);
      root.dataset.ynotWorldTheme=next;
      root.style.colorScheme=next;
      root.classList.toggle("ynot-world-dark",next==="dark");
      root.classList.toggle("ynot-world-light",next!=="dark");
    };
    window.addEventListener("ynot:world-theme",onTheme);
    return()=>{
      window.removeEventListener("ynot:world-theme",onTheme);
      root.classList.remove("ynot-world-dark","ynot-world-light");
      delete root.dataset.ynotWorldTheme;
      root.style.colorScheme="";
    };
  },[]);

  return <>{children}<ProductDetailHydrator/><ProductAttributeSatellites/><UnifiedBag/></>;
}
