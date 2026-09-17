import type {Metadata} from "next";

export const metadata:Metadata={title:"YNOT Ad Factory",robots:{index:false,follow:false,noarchive:true,nocache:true}};

export default function AdFactoryLayout({children}:{children:React.ReactNode}){
 return <>
  <div style={{position:"sticky",top:0,zIndex:70,display:"flex",gap:8,alignItems:"center",padding:"8px 14px",background:"rgba(7,9,10,.92)",backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(255,255,255,.07)",fontFamily:"Inter,system-ui,sans-serif"}}>
   <a href="/admin/ads" style={{color:"#f1f4f2",textDecoration:"none",fontSize:11,fontWeight:800,padding:"8px 10px",borderRadius:9,background:"rgba(255,255,255,.05)"}}>Ad Factory</a>
   <a href="/admin/ads/intelligence" style={{color:"#9be895",textDecoration:"none",fontSize:11,fontWeight:800,padding:"8px 10px",borderRadius:9,border:"1px solid rgba(148,232,141,.16)",background:"rgba(148,232,141,.05)"}}>Deep Intelligence</a>
   <span style={{marginLeft:"auto",color:"#667075",fontSize:9,letterSpacing:".1em"}}>OWNER ONLY</span>
  </div>
  {children}
 </>
}
