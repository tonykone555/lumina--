"use client";

import {useEffect,useState} from "react";

type Media={product_id:string;media_type:string;video_url?:string|null;poster_url?:string|null;preset?:string|null;status:string};
type Props={product:{id:string;title?:string;image:string;category?:string};className?:string;createMotion?:boolean;alt?:string;popupCompatible?:boolean;onMediaClick?:()=>void};

export default function ProductMediaSurface({product,className="",createMotion=false,alt="",popupCompatible=false,onMediaClick}:Props){
 const[media,setMedia]=useState<Media|null>(null);
 useEffect(()=>{
  let alive=true;
  fetch("/api/catalog/media",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({products:[product],createMotion})})
   .then(r=>r.json()).then(d=>{if(alive)setMedia(d?.media?.[product.id]||null)}).catch(()=>{});
  return()=>{alive=false};
 },[product.id,product.image,product.category,createMotion]);
 const common={className:`ynot-shared-media ${className} ${media?.video_url?"has-video":media?"has-motion":""}`.trim(),"data-motion-preset":media?.preset||undefined};
 if(media?.video_url&&popupCompatible)return <><img {...common} src={media.poster_url||product.image} alt={alt} onClick={onMediaClick}/><video onClick={onMediaClick} className="ynot-popup-video ynot-shared-media-video" src={media.video_url} poster={media.poster_url||product.image} autoPlay muted loop playsInline preload="metadata" aria-label={alt||product.title||"Product video"}/></>;
 if(media?.video_url)return <video {...common} onClick={onMediaClick} src={media.video_url} poster={media.poster_url||product.image} autoPlay muted loop playsInline preload="metadata" aria-label={alt||product.title||"Product video"}/>;
 return <img {...common} src={media?.poster_url||product.image} alt={alt} onClick={onMediaClick}/>;
}
