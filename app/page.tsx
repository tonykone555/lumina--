import AppShell from "@/components/lumina/AppShell";
import {SEO_CATEGORIES} from "@/lib/seo-categories";

const BASE="https://ynotworld.app";

export default function Home(){
  const jsonLd={
    "@context":"https://schema.org",
    "@graph":[
      {
        "@type":"WebSite",
        "@id":`${BASE}/#website`,
        url:BASE,
        name:"YNOT",
        alternateName:["YNOT World","ynotworld.app"],
        description:"A visual spatial shopping and product-discovery experience across independent stores and shopping sources.",
        inLanguage:"en"
      },
      {
        "@type":"Organization",
        "@id":`${BASE}/#organization`,
        name:"YNOT",
        url:BASE,
        logo:`${BASE}/ynot-microphone.jpg`,
        description:"YNOT helps shoppers visually discover products across fashion, home, beauty, fitness, technology and other shopping categories."
      },
      {
        "@type":"ItemList",
        name:"Explore shopping categories on YNOT",
        itemListElement:SEO_CATEGORIES.map((category,index)=>({
          "@type":"ListItem",
          position:index+1,
          name:category.name,
          url:`${BASE}/shop/${category.slug}`
        }))
      }
    ]
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>
    <AppShell/>
  </>;
}
