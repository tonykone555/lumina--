import type {MetadataRoute} from "next";

export default function manifest():MetadataRoute.Manifest{
 return {
  id:"/",
  name:"YNOT World — Visual Shopping",
  short_name:"YNOT",
  description:"Explore YNOT Worlds and the full-screen Studio interiors catalogue.",
  start_url:"/worlds",
  scope:"/",
  display:"standalone",
  display_override:["standalone","minimal-ui"],
  background_color:"#171514",
  theme_color:"#262321",
  orientation:"any",
  icons:[{src:"/icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any"}]
 };
}
