export type VisualSourcePolicy={host:string;mode:"auto-public"|"reference-only";note:string};

// Source-level approval keeps the collector fast: public-feed eligibility is
// decided by source policy rather than manual image-by-image review.
export const VISUAL_SOURCE_POLICY:VisualSourcePolicy[]=[
 {host:"images.pexels.com",mode:"auto-public",note:"Pexels API/source asset"},
 {host:"pexels.com",mode:"auto-public",note:"Pexels source"},
 {host:"images.unsplash.com",mode:"auto-public",note:"Unsplash API/source asset"},
 {host:"unsplash.com",mode:"auto-public",note:"Unsplash source"},
 {host:"cdn.pixabay.com",mode:"auto-public",note:"Pixabay source asset"},
 {host:"pixabay.com",mode:"auto-public",note:"Pixabay source"},
 {host:"pinterest.com",mode:"reference-only",note:"Pinterest discovery/reference"},
 {host:"pinimg.com",mode:"reference-only",note:"Pinterest-hosted candidate"},
];

export function classifyVisualSource(raw?:string){
 if(!raw)return {mode:"reference-only" as const,host:"",note:"Unknown source"};
 try{const host=new URL(raw).hostname.toLowerCase().replace(/^www\./,"");const hit=VISUAL_SOURCE_POLICY.find(x=>host===x.host||host.endsWith(`.${x.host}`));return hit?{...hit}:{mode:"reference-only" as const,host,note:"Unapproved source"}}catch{return {mode:"reference-only" as const,host:"",note:"Invalid source"}}
}
