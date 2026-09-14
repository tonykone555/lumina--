"use client";

import {useEffect,useState} from "react";
import LuminaWorld from "./LuminaWorld";
import YnotDrawer from "./YnotDrawer";
import YnotIntentBridge from "./YnotIntentBridge";
import SubcategoryNavigator from "./SubcategoryNavigator";
import SavedNotebook from "./SavedNotebook";
import DiscoveryUniverse from "./DiscoveryUniverse";

type Mode="shop"|"discover"|"ynot";

export default function AppShell(){
 const [mode,setMode]=useState<Mode>("shop");
 useEffect(()=>{if(mode==="ynot"){window.dispatchEvent(new Event("ynot:open"));setMode("shop")}},[mode]);
 return <>
  <nav className="ynot-top-mode" aria-label="Main experience">
   <button className={mode==="shop"?"active":""} onClick={()=>setMode("shop")}>SHOP</button>
   <button className={mode==="discover"?"active":""} onClick={()=>setMode("discover")}>DISCOVER</button>
   <button onClick={()=>setMode("ynot")}>YNOT</button>
  </nav>
  {mode==="discover"?<DiscoveryUniverse/>:<><LuminaWorld/><SubcategoryNavigator/></>}
  <YnotDrawer/>
  <YnotIntentBridge/>
  <SavedNotebook/>
 </>;
}
