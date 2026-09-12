import { NextRequest, NextResponse } from "next/server";

const FASHION = [
  {id:"demo-1",title:"Satin Slip Dress",brand:"Atelier Noire",price:129,currency:"EUR",image:"https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Satin","Elegant","Black"]},
  {id:"demo-2",title:"Draped Midi Dress",brand:"Maison Vale",price:118,currency:"EUR",image:"https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Draped","Midi","Minimal"]},
  {id:"demo-3",title:"Bias Cut Maxi",brand:"Noma Studio",price:142,currency:"EUR",image:"https://images.unsplash.com/photo-1572804013309-59a8-5ddf8a6e9d64?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Maxi","Evening","Black"]},
  {id:"demo-4",title:"Minimal Column Dress",brand:"Eloise",price:99,currency:"EUR",image:"https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Minimal","Column","Elegant"]}
];

const NICHE_FALLBACK: Record<string, typeof FASHION> = {
  fitness: [
    {id:"fit-1",title:'Vital 5” Training Shorts',brand:"Form Athletics",price:49,currency:"EUR",image:"https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Breathable","Strength","Under €80"]},
    {id:"fit-2",title:"Flex Knit Trainer",brand:"Apex",price:59,currency:"EUR",image:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Stable","Lightweight","Training"]},
    {id:"fit-3",title:"Recovery Roller",brand:"Grounded",price:35,currency:"EUR",image:"https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Recovery","Mobility","Top rated"]},
    {id:"fit-4",title:"Performance Training Tee",brand:"Form Athletics",price:45,currency:"EUR",image:"https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Quick dry","Relaxed fit","Workout gear"]},
  ],
  hair: [
    {id:"hair-1",title:"Multi-Peptide Density Serum",brand:"Nourish Lab",price:19.9,currency:"EUR",image:"https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Hair density","Daily use","Lightweight"]},
    {id:"hair-2",title:"Botanical Scalp Oil",brand:"Aera",price:34,currency:"EUR",image:"https://images.unsplash.com/photo-1601049676869-702ea24cfd58?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Scalp care","Natural","Pre-wash"]},
    {id:"hair-3",title:"Repair Ritual Mask",brand:"Mizu",price:38,currency:"EUR",image:"https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Repair","Weekly treatment","Women"]},
    {id:"hair-4",title:"Root Volume Mist",brand:"Onda",price:29,currency:"EUR",image:"https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Fuller-looking","Non-greasy","Under €30"]},
  ],
  skin: [
    {id:"skin-1",title:"Mela B3 Even Tone Serum",brand:"Common Ground",price:39.9,currency:"EUR",image:"https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Uneven tone","Sensitive skin","Niacinamide"]},
    {id:"skin-2",title:"Barrier Cloud Cream",brand:"Oath",price:36,currency:"EUR",image:"https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Barrier repair","Ceramides","Gentle"]},
    {id:"skin-3",title:"Calm Milk Cleanser",brand:"Mizu",price:24,currency:"EUR",image:"https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Cleanser","Fragrance-free","Daily"]},
    {id:"skin-4",title:"Mineral SPF 40",brand:"Aera",price:34,currency:"EUR",image:"https://images.unsplash.com/photo-1575410229391-19b4da01cc94?auto=format&fit=crop&w=800&q=80",url:"#",tags:["SPF","Sensitive skin","Visible results"]},
  ],
  smile: [
    {id:"smile-1",title:"Professional Whitening Strips",brand:"Pearl",price:44.9,currency:"EUR",image:"https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Whitening","14 treatments","Enamel care"]},
    {id:"smile-2",title:"Precision Whitening Pen",brand:"Onda",price:29,currency:"EUR",image:"https://images.unsplash.com/photo-1559591937-e0c4e4ea8f28?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Pen","At home","Daily care"]},
    {id:"smile-3",title:"Gentle Bright Paste",brand:"Calm",price:16,currency:"EUR",image:"https://images.unsplash.com/photo-1628359355624-855775b5c9c4?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Sensitive teeth","Everyday care","Under €30"]},
    {id:"smile-4",title:"Sonic Care Brush",brand:"Forma",price:59,currency:"EUR",image:"https://images.unsplash.com/photo-1559591935-c6c92c6f3f4a?auto=format&fit=crop&w=800&q=80",url:"#",tags:["Electric brush","Top rated","Smile care"]},
  ]
};

function fallbackFor(query:string){
  const q=query.toLowerCase();
  if(/gym|fitness|shorts|running|training|recovery/.test(q)) return NICHE_FALLBACK.fitness;
  if(/hair|scalp|density|shampoo/.test(q)) return NICHE_FALLBACK.hair;
  if(/skin|acne|blemish|tone|serum/.test(q)) return NICHE_FALLBACK.skin;
  if(/smile|teeth|tooth|whiten|oral/.test(q)) return NICHE_FALLBACK.smile;
  return FASHION;
}

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams;
  const base = (search.get("q") || "black dress for a wedding under 150").slice(0,300);
  const direction = (search.get("direction") || "").slice(0,100);
  const cursor = search.get("cursor") || undefined;
  const country = (search.get("country") || "FR").toUpperCase().slice(0,2);
  const query = direction ? `${base}, ${direction}` : base;
  const payload = {jsonrpc:"2.0",method:"tools/call",id:1,params:{name:"search_catalog",arguments:{meta:{"ucp-agent":{profile:"https://shopify.dev/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json"}},catalog:{query,filters:{available:true,ships_to:{country}},context:{address_country:country,intent:query},pagination:{limit:14,...(cursor?{cursor}:{})}}}}};
  try {
    const response = await fetch("https://catalog.shopify.com/api/ucp/mcp", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const raw:any = await response.json(); const content = raw?.result?.structuredContent;
    if (!response.ok || !content?.products) throw new Error("Catalog unavailable");
    const products = content.products.map((p:any)=>{const price=p?.price_range?.min||p?.variants?.[0]?.price;return{id:p.id,title:p.title,brand:p?.variants?.[0]?.seller?.name||p?.seller?.name||"Shopify merchant",price:price?Number(price.amount)/100:null,currency:price?.currency||"USD",image:p?.media?.find((m:any)=>m.type==="image")?.url||p?.media?.[0]?.url||"",url:p.url||p?.variants?.[0]?.seller?.url||"#",tags:[...new Set((p?.variants||[]).flatMap((v:any)=>v?.tags||[]))].slice(0,6)}}).filter((p:any)=>p.image);
    return NextResponse.json({source:"shopify-global-catalog",query,products,pagination:content.pagination||{}},{headers:{"Cache-Control":"s-maxage=45, stale-while-revalidate=300"}});
  } catch (error) { return NextResponse.json({source:"fallback",query,products:fallbackFor(query),pagination:{has_next_page:false}}); }
}
