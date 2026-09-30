export type ElectricVisualCategory = {
  world: string;
  category: string;
  subcategory: string;
  queries: string[];
};

export const ELECTRIC_VISUAL_TAXONOMY: ElectricVisualCategory[] = [
  {world:"electric",category:"ride",subcategory:"dirt-bikes",queries:["electric dirt bike supermoto","custom electric dirt bike","electric motocross bike","electric trail bike"]},
  {world:"electric",category:"ride",subcategory:"ebikes",queries:["premium electric mountain bike","electric cargo bike","electric fat tire bike","electric city bike"]},
  {world:"electric",category:"ride",subcategory:"scooters",queries:["performance electric scooter","off road electric scooter","premium electric scooter","seated electric scooter"]},
  {world:"electric",category:"ride",subcategory:"motorcycles",queries:["electric street motorcycle","electric cafe racer motorcycle","electric supermoto","premium electric motorcycle"]},
  {world:"electric",category:"ride",subcategory:"boards",queries:["electric skateboard","electric longboard","electric one wheel","electric unicycle"]},
  {world:"electric",category:"play",subcategory:"go-karts",queries:["electric go kart","electric drift kart","adult electric go kart","electric racing kart"]},
  {world:"electric",category:"play",subcategory:"atv-buggies",queries:["electric ATV","electric quad bike","electric buggy","electric UTV"]},
  {world:"electric",category:"play",subcategory:"rc",queries:["premium electric RC car","electric RC boat","electric RC aircraft","electric RC off road"]},
  {world:"electric",category:"water",subcategory:"efoils",queries:["electric hydrofoil efoil","premium efoil board","electric foil surfboard"]},
  {world:"electric",category:"water",subcategory:"jetboards",queries:["electric jetboard","electric surfboard","motorized surfboard"]},
  {world:"electric",category:"water",subcategory:"underwater",queries:["underwater electric scooter","sea scooter","electric diving scooter"]},
  {world:"electric",category:"family",subcategory:"ride-ons",queries:["kids electric ride on car","kids electric motorcycle","kids electric quad","kids electric go kart"]},
  {world:"electric",category:"home",subcategory:"garden",queries:["robot lawn mower","electric garden cart","electric riding mower","electric snow blower"]},
  {world:"electric",category:"home",subcategory:"robots",queries:["premium home robot","robot pool cleaner","robot window cleaner","robot vacuum premium"]},
  {world:"electric",category:"mods",subcategory:"customization",queries:["electric dirt bike customization","electric bike custom parts","supermoto customization","electric scooter custom build"]},
  {world:"electric",category:"mods",subcategory:"batteries",queries:["electric bike battery pack","electric motorcycle battery","ebike battery premium"]},
  {world:"electric",category:"pro",subcategory:"utility",queries:["electric utility vehicle","electric cargo vehicle","electric warehouse vehicle","electric mini loader"]},
];
