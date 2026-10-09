"use client";
import {useEffect,useState} from "react";

export default function MasonryThemeToggle(){
 const [theme,setTheme]=useState<"light"|"dark">("dark");
 useEffect(()=>{
  const saved=localStorage.getItem("ynot-theme");
  const current=(saved==="light"||saved==="dark")?saved:(document.documentElement.dataset.ynotTheme==="light"?"light":"dark");
  document.documentElement.dataset.ynotTheme=current;
  setTheme(current);
 },[]);
 const toggle=()=>{
  const next=theme==="light"?"dark":"light";
  document.documentElement.dataset.ynotTheme=next;
  try{localStorage.setItem("ynot-theme",next)}catch{}
  setTheme(next);
  window.dispatchEvent(new CustomEvent("ynot:theme-changed",{detail:{theme:next}}));
 };
 return <button type="button" className="ynot-masonry-page-theme" onClick={toggle} aria-label={theme==="light"?"Switch masonry to dark mode":"Switch masonry to light mode"} title={theme==="light"?"Dark mode":"Light mode"}>{theme==="light"?"☾":"☀"}</button>
}
