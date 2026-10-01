const COMMON:Record<string,string[]>={
"dresses":["Mini","Midi","Maxi","Bodycon","Slip","Wrap","Party","Summer","Formal","Long sleeve","Strapless","Black","Floral"],
"tops":["Crop","Tank","Blouse","Long sleeve","Short sleeve","Oversized","Fitted","Going out","Casual","Black","White"],
"sofas":["Sectional","Modular","3-seater","2-seater","Corner","Sleeper","Leather","Bouclé","Velvet","L-shaped","Small space","Reclining"],
"serums":["Vitamin C","Hyaluronic acid","Retinol","Niacinamide","Peptides","Brightening","Hydrating","Anti-aging","Acne","Sensitive skin","Fragrance-free"],
"moisturizers":["Face cream","Gel cream","Night cream","Day cream","Oil-free","Dry skin","Oily skin","Sensitive skin","Ceramides","Hyaluronic acid","Anti-aging","Fragrance-free"],
"cleansers":["Gel","Foam","Cream","Oil","Balm","Micellar","Acne","Sensitive skin","Dry skin","Oily skin","Fragrance-free"],
"spf":["SPF 30","SPF 50","Mineral","Chemical","Tinted","Face","Body","Sensitive skin","Oil-free","Water resistant"],
"headphones":["Wireless","Noise cancelling","Over-ear","On-ear","Gaming","Studio","Bluetooth","USB-C","Travel","Microphone"],
"phones":["Android","iOS","5G","Unlocked","Dual SIM","128GB","256GB","512GB","Camera","Gaming","Foldable"],
"laptops":["Ultrabook","Gaming","Business","2-in-1","OLED","Touchscreen","13-inch","14-inch","15-inch","16-inch","Creator"],
"strollers":["Travel","Compact","Lightweight","Double","Newborn","All-terrain","Cabin size","Reversible","Luxury"],
"necklaces":["Chain","Pendant","Choker","Layered","Gold","Silver","Pearl","Diamond","Minimal","Statement","Personalized"],
"treadmills":["Folding","Walking pad","Running","Incline","Compact","Home gym","Commercial","Under desk"],
"dumbbells":["Adjustable","Hex","Rubber","Neoprene","Set","Heavy","Home gym","Commercial"],
"coffee-machines":["Espresso","Bean-to-cup","Pod","Drip","Manual","Automatic","Milk frother","Compact","Premium"],
"carry-ons":["Cabin size","Hard shell","Soft shell","Expandable","Lightweight","Spinner","Front pocket","Laptop compartment","Underseat"],
"dirt-bikes":["Off-road","Supermoto","Adult","Kids","High power","Long range","Black","Wide tyres","Long seat","Trail"],
"ebikes":["Fat tyre","Folding","Commuter","Mountain","Cargo","Step-through","Long range","750W+","City","Off-road"]
};
const WORDS:Record<string,string[]>={fashion:["New","Casual","Premium","Black","White","Oversized","Slim","Everyday"],beauty:["Hydrating","Sensitive skin","Brightening","Anti-aging","Fragrance-free","Premium"],home:["Modern","Minimal","Small space","Large","Wood","Black","White","Premium"],tech:["Wireless","Portable","Smart","USB-C","Premium","Compact"],fitness:["Home gym","Training","Compact","Pro","Beginner","Premium"],baby:["Newborn","Toddler","Travel","Compact","Premium","Everyday"],jewelry:["Gold","Silver","Minimal","Statement","Luxury","Everyday"],electric:["Long range","High power","Portable","Off-road","Urban","Premium"],outdoor:["Portable","Lightweight","Waterproof","Compact","Adventure","Premium"]};
export function tagsForSubcategory(worldId:string,categoryId:string,subcategoryId:string,title:string){if(COMMON[subcategoryId])return COMMON[subcategoryId];const key=worldId==='home-interiors'?'home':worldId==='baby-kids'?'baby':worldId;const base=WORDS[key]||["Popular","New","Premium","Compact","Everyday","Pro"];return [...base,title].slice(0,12)}
