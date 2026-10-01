import {YNOT_VISUAL_WORLDS as BASE,type VisualSubcategory,type VisualWorld} from './world-taxonomy';

type Additions=Record<string,Record<string,Array<[string,string,string]>>>;
const ADD:Additions={
  tech:{
    personal:[['phones','Smartphones','smartphone'],['feature-phones','Feature phones','feature phone'],['refurbished-phones','Refurbished phones','refurbished smartphone'],['phone-accessories','Phone accessories','smartphone accessories'],['cables','Cables','USB C phone cable'],['webcams','Webcams','webcam'],['cameras','Cameras','digital camera'],['action-cameras','Action cameras','action camera'],['instant-cameras','Instant cameras','instant camera'],['security-cameras','Security cameras','security camera'],['lenses','Camera lenses','camera lens'],['tripods','Tripods','camera tripod'],['gimbals','Gimbals','camera gimbal'],['printers','Printers','printer'],['projectors','Projectors','projector'],['e-readers','E-readers','e reader'],['consoles','Game consoles','gaming console'],['controllers','Controllers','game controller']],
    'smart-home':[['smart-cameras','Smart cameras','smart home camera'],['video-doorbells','Video doorbells','smart video doorbell'],['smart-locks','Smart locks','smart door lock'],['smart-thermostats','Thermostats','smart thermostat'],['smart-plugs','Smart plugs','smart plug'],['smart-switches','Smart switches','smart switch'],['smart-bulbs','Smart bulbs','smart bulb'],['sensors','Sensors','smart home sensor'],['motion-sensors','Motion sensors','smart motion sensor'],['smoke-detectors','Smoke detectors','smart smoke detector'],['robot-vacuums','Robot vacuums','robot vacuum'],['smart-vacuums','Smart vacuums','smart vacuum'],['smart-blinds','Smart blinds','smart blinds'],['smart-hubs','Smart hubs','smart home hub'],['mesh-wifi','Mesh Wi-Fi','mesh wifi system'],['smart-appliances','Smart appliances','smart home appliance']]
  },
  'home-interiors':{
    living:[['ottomans','Ottomans','ottoman'],['recliners','Recliners','recliner chair'],['console-tables','Console tables','console table'],['media-consoles','Media consoles','media console']],
    bedroom:[['bed-frames','Bed frames','bed frame'],['headboards','Headboards','headboard'],['bedding','Bedding','bedding set'],['duvets','Duvets','duvet'],['pillows','Pillows','bed pillow']],
    office:[['standing-desks','Standing desks','standing desk'],['desk-storage','Desk storage','desk organizer']],
    decor:[['clocks','Clocks','wall clock'],['frames','Picture frames','picture frame'],['sculptures','Sculptures','home sculpture'],['baskets','Baskets','storage basket'],['room-dividers','Room dividers','room divider']]
  },
  beauty:{
    skincare:[['sunscreen','Sunscreen','face sunscreen'],['spot-treatments','Spot treatments','acne spot treatment'],['facial-mists','Facial mists','face mist']],
    hair:[['leave-in','Leave-in treatments','leave in conditioner'],['hair-serums','Hair serums','hair serum'],['scalp-care','Scalp care','scalp treatment'],['dry-shampoo','Dry shampoo','dry shampoo']],
    tools:[['hair-dryers','Hair dryers','hair dryer'],['straighteners','Straighteners','hair straightener'],['curlers','Curling tools','curling iron'],['electric-shavers','Electric shavers','electric shaver']]
  },
  fashion:{
    women:[['cardigans','Cardigans','womens cardigan'],['sweaters','Sweaters','womens sweater'],['vests','Vests','womens vest'],['bodysuits','Bodysuits','womens bodysuit'],['suits','Suits','womens suit'],['shoes','Shoes','womens shoes'],['sneakers','Sneakers','womens sneakers'],['boots','Boots','womens boots'],['sandals','Sandals','womens sandals']],
    men:[['mens-sweaters','Sweaters','mens sweater'],['mens-cardigans','Cardigans','mens cardigan'],['mens-suits','Suits','mens suit'],['mens-underwear','Underwear','mens underwear'],['mens-shoes','Shoes','mens shoes'],['mens-sneakers','Sneakers','mens sneakers'],['mens-boots','Boots','mens boots']],
    accessories:[['totes','Tote bags','tote bag'],['crossbody','Crossbody bags','crossbody bag'],['handbags','Handbags','handbag'],['caps','Caps','baseball cap'],['ties','Ties','fashion tie']]
  },
  fitness:{
    training:[['pullup-bars','Pull-up bars','pull up bar'],['medicine-balls','Medicine balls','medicine ball'],['jump-ropes','Jump ropes','jump rope'],['steppers','Steppers','fitness stepper'],['home-gyms','Home gyms','home gym machine']],
    wellness:[['yoga-mats','Yoga mats','yoga mat'],['pilates-reformers','Pilates reformers','pilates reformer'],['saunas','Saunas','home sauna'],['cold-plunge','Cold plunge','cold plunge tub'],['compression','Compression recovery','compression recovery boots']]
  },
  'baby-kids':{
    baby:[['baby-monitors','Baby monitors','baby monitor camera'],['baby-cameras','Baby cameras','baby camera'],['playpens','Playpens','baby playpen'],['bouncers','Bouncers','baby bouncer'],['swings','Baby swings','baby swing'],['nursery','Nursery','nursery furniture'],['feeding','Feeding','baby feeding products'],['pacifiers','Pacifiers','baby pacifier']],
    kids:[['dolls','Dolls','kids doll'],['puzzles','Puzzles','kids puzzle'],['arts-crafts','Arts & crafts','kids arts crafts'],['scooters','Kids scooters','kids scooter'],['bikes','Kids bikes','kids bicycle']]
  },
  jewelry:{jewelry:[['fine-jewelry','Fine jewelry','fine jewelry'],['charms','Charms','jewelry charm'],['cufflinks','Cufflinks','cufflinks'],['wedding-bands','Wedding bands','wedding band'],['lab-grown','Lab-grown diamonds','lab grown diamond jewelry'],['piercings','Piercing jewelry','piercing jewelry']]},
  automotive:{
    cars:[['sedans','Sedans','sedan car'],['hatchbacks','Hatchbacks','hatchback car'],['trucks','Trucks','pickup truck'],['vans','Vans','van vehicle'],['hybrids','Hybrids','hybrid car']],
    garage:[['car-cameras','Car cameras','car camera'],['parking-cameras','Parking cameras','backup camera'],['phone-mounts','Phone mounts','car phone mount'],['jump-starters','Jump starters','car jump starter'],['battery-chargers','Battery chargers','car battery charger'],['roof-racks','Roof racks','car roof rack']]
  },
  outdoor:{
    adventure:[['water-bottles','Water bottles','outdoor water bottle'],['coolers','Coolers','camping cooler'],['lanterns','Lanterns','camping lantern'],['camp-stoves','Camp stoves','camping stove'],['binoculars','Binoculars','outdoor binoculars'],['action-cameras','Action cameras','outdoor action camera']],
    garden:[['lawn-mowers','Lawn mowers','lawn mower'],['pressure-washers','Pressure washers','pressure washer'],['garden-tools','Garden tools','garden tools'],['hoses','Garden hoses','garden hose'],['parasols','Parasols','garden parasol']]
  },
  pets:{
    dogs:[['dog-crates','Crates','dog crate'],['dog-clothing','Clothing','dog clothing'],['dog-tech','Dog tech','smart dog products']],
    cats:[['cat-carriers','Carriers','cat carrier'],['cat-bowls','Bowls','cat bowl'],['cat-grooming','Grooming','cat grooming']],
    'pet-tech':[['automatic-litter','Automatic litter boxes','automatic litter box'],['pet-doors','Smart pet doors','smart pet door'],['pet-monitors','Pet monitors','pet monitor camera']]
  },
  kitchen:{
    appliances:[['air-fryers','Air fryers','air fryer'],['microwaves','Microwaves','microwave'],['food-processors','Food processors','food processor'],['rice-cookers','Rice cookers','rice cooker'],['slow-cookers','Slow cookers','slow cooker'],['ice-makers','Ice makers','ice maker'],['vacuum-sealers','Vacuum sealers','vacuum sealer']],
    cookware:[['frying-pans','Frying pans','frying pan'],['saucepans','Saucepans','saucepan'],['dutch-ovens','Dutch ovens','dutch oven'],['woks','Woks','wok']],
    tabletop:[['mugs','Mugs','coffee mug'],['bowls','Bowls','dinner bowl'],['serving','Serving ware','serving ware']]
  },
  travel:{
    luggage:[['checked-luggage','Checked luggage','checked suitcase'],['underseat','Underseat bags','underseat luggage'],['garment-bags','Garment bags','travel garment bag'],['luggage-sets','Luggage sets','luggage set']],
    essentials:[['travel-tech','Travel tech','travel tech accessories'],['travel-chargers','Travel chargers','travel charger'],['trackers','Luggage trackers','luggage tracker'],['travel-bottles','Travel bottles','travel toiletry bottles'],['locks','Luggage locks','luggage lock']]
  },
  electric:{
    ride:[['electric-mopeds','Electric mopeds','electric moped'],['electric-trikes','Electric trikes','electric tricycle'],['mobility-scooters','Mobility scooters','electric mobility scooter']],
    home:[['robot-vacuums','Robot vacuums','robot vacuum'],['window-robots','Window robots','robot window cleaner'],['snow-blowers','Electric snow blowers','electric snow blower']],
    mods:[['displays','Displays','ebike display'],['brakes','Brakes','ebike brakes'],['suspension','Suspension','ebike suspension'],['conversion-kits','Conversion kits','ebike conversion kit']]
  }
};
const make=([id,title,q]:[string,string,string]):VisualSubcategory=>({id,title,queries:[q]});
export const YNOT_VISUAL_WORLDS:VisualWorld[]=BASE.map(world=>({...world,categories:world.categories.map(cat=>{const additions=ADD[world.id]?.[cat.id]||[];const ids=new Set(cat.subcategories.map(s=>s.id));return {...cat,subcategories:[...cat.subcategories,...additions.filter(a=>!ids.has(a[0])).map(make)]}})}));
export * from './world-taxonomy';
