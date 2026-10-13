import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=60;
function esc(x:unknown){return String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g," ")}
const frTerms:[RegExp,string][]=[
[/robot vacuum cleaner/gi,"aspirateur robot"],[/robot vacuum/gi,"aspirateur robot"],[/cordless leaf blower/gi,"souffleur de feuilles sans fil"],[/leaf blower/gi,"souffleur de feuilles"],[/pressure washer/gi,"nettoyeur haute pression"],[/espresso machine/gi,"machine à expresso"],[/coffee grinder/gi,"moulin à café"],[/coffee machine/gi,"machine à café"],[/air fryer/gi,"friteuse sans huile"],[/food processor/gi,"robot multifonction"],[/blender/gi,"mixeur"],[/electric kettle/gi,"bouilloire électrique"],[/automatic pet feeder/gi,"distributeur automatique pour animaux"],[/cat tree/gi,"arbre à chat"],[/cat furniture/gi,"mobilier pour chat"],[/ceiling pendant light/gi,"suspension luminaire"],[/pendant light/gi,"luminaire suspendu"],[/solar lights/gi,"éclairage solaire"],[/steam cleaner/gi,"nettoyeur vapeur"],[/stand mixer/gi,"robot pâtissier"],[/kitchen mixer/gi,"robot de cuisine"],[/cordless/gi,"sans fil"],[/electric/gi,"électrique"],[/stainless steel/gi,"acier inoxydable"],[/black/gi,"noir"],[/white/gi,"blanc"],[/silver/gi,"argenté"]];
function frenchTitle(s:unknown){let x=String(s||"");for(const [a,b] of frTerms)x=x.replace(a,b);return x.replace(/\s+/g," ").trim().slice(0,120)}
function xmlCell(v:unknown,style="Default"){return '<Cell ss:StyleID="'+style+'"><Data ss:Type="String">'+esc(v)+'</Data></Cell>'}
function xmlRow(vals:unknown[],style="Default"){return "<Row>"+vals.map(v=>xmlCell(v,style)).join("")+"</Row>"}
export async function GET(req:NextRequest){
 const requested=Math.max(1,Math.min(100,Number(req.nextUrl.searchParams.get("limit")||100)));
 try{
  const target=new URL("/api/catalog/ricardo-five-photo-export",req.nextUrl.origin);
  target.searchParams.set("limit",String(requested));target.searchParams.set("format","json");
  const r=await fetch(target,{cache:"no-store",signal:AbortSignal.timeout(52000)});
  if(!r.ok)throw Error("Source "+r.status);
  const data=await r.json();const products=Array.isArray(data.products)?data.products:[];
  if(!products.length)throw Error("No qualifying products");
  const headers=["N°","Titre français (brouillon)","Titre fournisseur","Catégorie recherchée","Description en français (à compléter)","Marque / vendeur","Prix fournisseur (indicatif)","Devise source","Prix de vente CHF (à saisir)","État (à confirmer)","Livraison Suisse (à vérifier)","Frais d'envoi CHF (à saisir)","Référence Shopify","URL produit fournisseur","Nombre de photos","Photo 1","Photo 2","Photo 3","Photo 4","Photo 5","Photo 6","Photo 7","Photo 8","Photo 9","Photo 10","Droits images","Concordance variante","Statut Ricardo"];
  const rows=products.filter((p:any)=>Array.isArray(p.images)&&new Set(p.images).size>=5).map((p:any,i:number)=>{
   const title=frenchTitle(p.title);const description="Article : "+title+". Détails techniques et contenu de la livraison : à confirmer selon la fiche fournisseur. Vente et expédition en Suisse sous réserve de vérification.";
   return [i+1,title,p.title,p.category_query,description,p.seller,p.price,p.currency,"À définir","À confirmer","À vérifier","À définir",p.id,p.product_url,p.image_count,...Array.from({length:10},(_,n)=>p.images[n]||""),"Non vérifiés","À vérifier","Brouillon – ne pas publier"];
  });
  const sheetXml='<?xml version="1.0" encoding="UTF-8"?>'+
   '<?mso-application progid="Excel.Sheet"?>'+
   '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">'+
   '<Styles><Style ss:ID="Default"><Alignment ss:Vertical="Center"/></Style><Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#155E75" ss:Pattern="Solid"/><Alignment ss:WrapText="1"/></Style></Styles>'+
   '<Worksheet ss:Name="100 annonces FR"><Table>'+xmlRow(headers,"Header")+rows.map((row:any[])=>xmlRow(row)).join("")+'</Table></Worksheet>'+
   '<Worksheet ss:Name="Instructions"><Table>'+[
    ["YNOT → Ricardo | Export en français"],["Produits retenus",rows.length],["Photos","Chaque ligne possède au moins cinq URL d'images distinctes issues de la fiche complète Shopify."],["Attention","Le fichier est un classeur Excel compatible .xls, mais n'est PAS le modèle d'import officiel Ricardo."],["Titre","Traduction automatique partielle : vérifier la formulation et les spécifications."],["Prix","Le prix source ne correspond pas à un prix de vente CHF."],["Livraison","Vérifier la livraison réelle et les délais pour la Suisse."],["Images","Vérifier les droits de réutilisation et la bonne variante avant publication."],["Conformité","Vérifier le droit de vente sur Ricardo pour les produits neufs et dropshippés."]
   ].map(row=>xmlRow(row)).join("")+'</Table></Worksheet></Workbook>';
  return new NextResponse(sheetXml,{headers:{"Content-Type":"application/vnd.ms-excel; charset=utf-8","Content-Disposition":'attachment; filename="YNOT_Ricardo_100_annonces_FR_5_photos.xls"',"Cache-Control":"no-store","X-Qualified-Count":String(rows.length)}});
 }catch(e){return NextResponse.json({error:"Export impossible",detail:String(e)},{status:503})}
}