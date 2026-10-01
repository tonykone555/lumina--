import type {VisualWorld} from './world-taxonomy';
const sub=(id:string,title:string,q:string)=>({id,title,queries:[q]});
export const BRANDS_WORLD:VisualWorld={id:'brands',title:'Brands',categories:[
{id:'fashion',title:'Fashion & Apparel',subcategories:[sub('adidas','Adidas','Adidas products'),sub('prada','Prada','Prada products'),sub('designer','Designer','designer fashion brands'),sub('streetwear','Streetwear','streetwear brands'),sub('activewear','Activewear','activewear brands'),sub('denim','Denim','denim brands')]},
{id:'beauty',title:'Beauty & Personal Care',subcategories:[sub('skincare','Skincare','skincare brands'),sub('makeup','Makeup','makeup brands'),sub('fragrance','Fragrance','fragrance brands'),sub('haircare','Haircare','haircare brands')]},
{id:'electronics',title:'Electronics',subcategories:[sub('apple','Apple','Apple products'),sub('phones','Phones','smartphone brands'),sub('computing','Computing','computer brands'),sub('audio','Audio','audio brands'),sub('cameras','Cameras','camera brands'),sub('gaming','Gaming','gaming brands')]},
{id:'home-garden',title:'Home & Garden',subcategories:[sub('furniture','Furniture','furniture brands'),sub('decor','Decor','home decor brands'),sub('lighting','Lighting','lighting brands'),sub('kitchen','Kitchen','kitchen brands'),sub('outdoor','Outdoor','outdoor home brands')]},
{id:'sporting-goods',title:'Sporting Goods',subcategories:[sub('fitness','Fitness','fitness brands'),sub('running','Running','running brands'),sub('football','Football','football brands'),sub('cycling','Cycling','cycling brands'),sub('outdoor-sport','Outdoor sport','outdoor sporting brands')]},
{id:'jewelry-bags',title:'Jewelry & Bags',subcategories:[sub('jewelry','Jewelry','jewelry brands'),sub('watches','Watches','watch brands'),sub('bags','Bags','bag brands'),sub('luggage','Luggage','luggage brands')]},
{id:'baby-toys',title:'Baby & Toys',subcategories:[sub('baby','Baby','baby brands'),sub('toddler','Toddler','toddler brands'),sub('toys','Toys','toy brands'),sub('games','Games','game brands')]},
{id:'pets',title:'Pet Supplies',subcategories:[sub('dogs','Dogs','dog brands'),sub('cats','Cats','cat brands'),sub('pet-tech','Pet tech','pet technology brands')]},
{id:'office',title:'Office',subcategories:[sub('office-supplies','Office supplies','office supply brands'),sub('stationery','Stationery','stationery brands'),sub('office-tech','Office tech','office technology brands')]}
]};
