import Link from "next/link";
import LuminaWorld from "@/components/lumina/LuminaWorld";

export default function Home() {
  return <>
    <LuminaWorld />
    <Link
      href="/view"
      aria-label="Open Lumina View"
      style={{position:"fixed",right:18,top:18,zIndex:120,padding:"10px 14px",borderRadius:999,background:"rgba(255,255,255,.58)",backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)",border:"1px solid rgba(255,255,255,.58)",boxShadow:"0 12px 30px rgba(25,20,16,.08)",color:"#27231f",textDecoration:"none",fontSize:11,fontWeight:800,letterSpacing:".02em"}}
    >
      Lumina View
    </Link>
  </>;
}
