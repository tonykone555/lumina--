import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=60;
const searches:[RegExp,string,string][]=[
[/robot.*vacuum|vacuum.*robot|roborock|roomba|dreame|ecovacs/i,"Aspirateur robot","Aspirateurs et nettoyage"],
[/pressure washer|high pressure washer|power washer/i,"Nettoyeur haute pression","Jardin et bricolage"],
[/leaf blower|cordless blower/i,"Souffleur de feuilles sans fil","Jardin et bricolage"],
[/lawn mower|lawnmower/i,"Tondeuse à gazon","Jardin et bricolage"],
[/espresso|coffee machine|coffee maker/i,"Machine à café espresso","Cuisine et électroménager"],
[/coffee grinder/i,"Moulin à café électrique","Cuisine et électroménager"],
[/food processor/i,"Robot multifonction de cuisine","Cuisine et électroménager"],
[/air fryer/i,"Friteuse sans huile Air Fryer","Cuisine et électroménager"],
[/blender|smoothie/i,"Mixeur blender","Cuisine et électroménager"],
[/electric kettle|kettle/i,"Bouilloire électrique","Cuisine et électroménager"],
[/automatic.*pet feeder|pet feeder/i,"Distributeur automatique de nourriture pour animaux","Animaux"],
[/cat tree|cat furniture|scratching post/i,"Arbre à chat et mobilier pour chat","Animaux"],
[/pendant light|chandelier|ceiling light/i,"Suspension luminaire de plafond","Maison et éclairage"],
[/solar.*light|outdoor.*light/i,"Éclairage solaire extérieur","Maison et éclairage"],
[/steam cleaner/i,"Nettoyeur vapeur","Aspirateurs et nettoyage"],
[/stand mixer|kitchen mixer/i,"Robot pâtissier","Cuisine et électroménager"]
];
const esc=(v:unknown)=>{const s=String(v??"").replace(/^[=+@-]/,"'$&");return '"'+s.replace(/"/g,'""')+'"'};
function productTitle(p:any){const original=String(p.title||"").replace(/\s+/g," ").trim();const hit=searches.find(([rx])=>rx.test(original))||[null,"Article maison et équipement","Maison et équipement"];const lead=hit[1] as string;let remainder=original.replace(/^(robot vacuum cleaner|robot vacuum|vacuum cleaner|electric pressure washer|pressure washer|cordless leaf blower|leaf blower|espresso coffee machine|espresso machine|coffee machine|coffee maker|electric kettle|kettle|automatic pet feeder|air fryer|blender|cat tree|chandelier|ceiling pendant light|stand mixer)\s*[-–:]?\s*/i,"").trim();if(!remainder||remainder===original)remainder=original;return {title:(lead+" – "+remainder).slice(0,95),category:hit[2] as string};}
function description(p:any,frenchTitle:string){const original=String(p.description||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();const supplier=String(p.seller||"Vendeur source");return [
 frenchTitle,
 "",
 "DESCRIPTION",
 "Produit : "+String(p.title||""),
 "Marque / vendeur indiqué : "+supplier+".",
 "Référence et modèle : voir le titre original et la page du produit ci-dessous.",
 "",
 "CARACTÉRISTIQUES DU FOURNISSEUR (texte source, non traduit pour éviter les erreurs techniques)",
 original?original.slice(0,2100):"Aucune fiche technique détaillée fournie par le catalogue.",
 "",
 "PHOTOS",
 String(p.image_count||0)+" liens photographiques indiqués dans le catalogue Shopify. Vérifiez la variante et les droits de réutilisation avant publication.",
 "",
 "LIVRAISON ET CONDITIONS",
 "Expédition vers la Suisse, disponibilité, compatibilité électrique et délai à confirmer avant la mise en vente.",
 "Lien produit d'origine : "+String(p.product_url||"")
].join("\n");}
export async function GET(req:NextRequest){
 const limit=Math.max(1,Math.min(100,Number(req.nextUrl.searchParams.get("limit")||100)));
 const u=new URL("/api/catalog/ricardo-five-photo-export",req.nextUrl.origin);u.searchParams.set("limit",String(limit));u.searchParams.set("format","json");
 try{
 const response=await fetch(u.toString(),{cache:"no-store",signal:AbortSignal.timeout(56000)});
 if(!response.ok)throw Error("Source export status "+response.status);
 const j=await response.json();
 const products=(Array.isArray(j.products)?j.products:[]).filter((p:any)=>Array.isArray(p.images)&&new Set(p.images).size>=5).slice(0,limit);
 const cols=["product_id","titre_ricardo_fr","categorie_suggeree","description_ricardo_fr","titre_source","vendeur_fournisseur","prix_fournisseur","devise_fournisseur","prix_vente_chf_a_completer","stock_a_verifier","etat_a_verifier","delai_livraison_suisse_a_verifier","url_fournisseur","nombre_photos",...Array.from({length:10},(_,i)=>"photo_"+(i+1)),"variantes_a_verifier","droits_photos_a_verifier","autorisation_ricardo_a_verifier","statut"];
 const rows=products.map((p:any)=>{const t=productTitle(p);return [p.id,t.title,t.category,description(p,t.title),p.title,p.seller,p.price,p.currency,"","","","",p.product_url,new Set(p.images).size,...Array.from({length:10},(_,i)=>p.images[i]||""),"OUI","OUI","OUI","BROUILLON - PAS PRÊT À PUBLIER"]});
 if(req.nextUrl.searchParams.get("format")==="json")return NextResponse.json({count:rows.length,minimum_photos:5,products:products.map((p:any,i:number)=>Object.fromEntries(cols.map((k,j)=>[k,rows[i][j]])))},{headers:{"Cache-Control":"no-store"}});
 return new NextResponse("\uFEFF"+[cols,...rows].map(r=>r.map(esc).join(",")).join("\r\n"),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="YNOT_Ricardo_100_French_Drafts_5plus_Photos.csv"',"Cache-Control":"no-store","X-Product-Count":String(rows.length)}});
 }catch(e){console.error(e);return NextResponse.json({error:"Ricardo French draft export failed"},{status:503})}
}