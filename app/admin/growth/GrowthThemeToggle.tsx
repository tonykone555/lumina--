"use client";

import {useEffect,useState} from "react";

const KEY="ynot-growth-theme";

export default function GrowthThemeToggle(){
 const[light,setLight]=useState(false);
 useEffect(()=>{
  const saved=window.localStorage.getItem(KEY)==="light";
  setLight(saved);
  document.querySelector("main.growth")?.classList.toggle("growthLight",saved);
 },[]);
 function toggle(){
  const next=!light;
  setLight(next);
  window.localStorage.setItem(KEY,next?"light":"dark");
  document.querySelector("main.growth")?.classList.toggle("growthLight",next);
 }
 return <button type="button" className="growthThemeToggle" onClick={toggle} aria-pressed={light} aria-label={light?"Switch Growth Intelligence to dark mode":"Switch Growth Intelligence to light mode"}>
  <span className="growthThemeDot"/>
  <b>{light?"Dark":"Light"}</b>
 </button>;
}
