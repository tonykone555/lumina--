import type {Metadata} from "next";
import "./globals.css";
import "./frameless.css";
import "./spatial-ui.css";
import "./world-map.css";
import "./ynot.css";
import "./ynot-polish.css";
import "./premium-world.css";
import "./product-popup.css";
import "./stage3-market.css";
import "./deep-explore.css";
import "./commerce-polish.css";
import "./subcategory-nav.css";
import "./ynot-story-saves.css";
import "./discovery.css";
import "./navigation-refresh.css";
import "./commerce-verification.css";
import "./tag-combo-minimal.css";
import "./product-card-sync.css";
import "./world-visual-polish.css";
import "./ynot-left-rail.css";
import "./world-compass.css";
import "./ynot-side-tab.css";
import "./ynot-circle.css";
import "./ynot-profile.css";
import "./voice-search.css";
import "./checkout-status.css";
import "./operator-orders.css";
import "./desktop-reference-world.css";
import "./desktop-reference-fix.css";
import "./product-reference-card.css";
import "./header-lattice-final.css";
import "./desktop-stability-fade.css";
import "./lattice-universal.css";
import "./reference-responsive-final.css";
import "./final-ui-refinement.css";
import "./final-detail-safety.css";
import "./final-interaction-polish.css";
import "./final-request-polish.css";
import "./mobile-header-card-fix.css";
import "./mobile-product-gallery-slider.css";
import "./final-world-product-pass.css";

const SITE_URL="https://ynotworld.app";
const SITE_DESCRIPTION="Discover fashion, furniture, home decor, beauty, fitness, tech and more across independent stores and shopping sources with YNOT's visual spatial shopping experience.";

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),
  title:{default:"YNOT — Visual Shopping & Product Discovery",template:"%s | YNOT"},
  description:SITE_DESCRIPTION,
  applicationName:"YNOT",
  category:"shopping",
  keywords:["YNOT","YNOT World","visual shopping","online shopping","product discovery","independent stores","Shopify products","fashion shopping","furniture shopping","home decor shopping","beauty products","fitness gear","tech products"],
  alternates:{canonical:"/"},
  robots:{index:true,follow:true,googleBot:{index:true,follow:true,"max-image-preview":"large","max-snippet":-1,"max-video-preview":-1}},
  openGraph:{
    type:"website",
    url:SITE_URL,
    siteName:"YNOT",
    title:"YNOT — Visual Shopping & Product Discovery",
    description:SITE_DESCRIPTION,
    images:[{url:"/ynot-microphone.jpg",alt:"YNOT visual shopping"}]
  },
  twitter:{card:"summary_large_image",title:"YNOT — Visual Shopping & Product Discovery",description:SITE_DESCRIPTION,images:["/ynot-microphone.jpg"]},
  verification:{google:"-GQTuojAnMn-0J1mgsbr0j_zasvkZYoFrakODO8skNA"},
  other:{"theme-color":"#080909"}
};

// Production deploy checkpoint after Git integration reconnect.
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>{children}</body></html>;
}
