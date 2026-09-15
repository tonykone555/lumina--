export type SeoCategory={
  slug:string;
  name:string;
  title:string;
  description:string;
  eyebrow:string;
  intro:string;
  searches:string[];
};

export const SEO_CATEGORIES:SeoCategory[]=[
  {
    slug:"fashion",
    name:"Fashion",
    title:"Fashion Shopping & Independent Clothing Brands | YNOT",
    description:"Explore fashion, dresses, shoes, bags, accessories and independent clothing brands through YNOT's visual shopping world.",
    eyebrow:"Fashion discovery",
    intro:"Explore clothing, dresses, shoes, bags and accessories from independent stores and broader shopping sources in a visual product-discovery experience.",
    searches:["Dresses","Shoes","Bags & accessories","Activewear","Independent fashion brands","New fashion finds"]
  },
  {
    slug:"home",
    name:"Home & Furniture",
    title:"Furniture, Lighting & Home Decor Shopping | YNOT",
    description:"Discover furniture, lighting, storage, decor and home products with YNOT's visual shopping and product discovery experience.",
    eyebrow:"Home shopping",
    intro:"Browse furniture, lighting, decor, storage, bedding and home products in a visual shopping world designed for discovery rather than endless product lists.",
    searches:["Furniture","Lighting","Home decor","Storage","Bedding","Modern interiors"]
  },
  {
    slug:"beauty",
    name:"Beauty",
    title:"Beauty, Skincare & Self-Care Shopping | YNOT",
    description:"Discover skincare, beauty, hair and self-care products across stores using YNOT's visual shopping experience.",
    eyebrow:"Beauty discovery",
    intro:"Explore skincare, beauty tools, hair care and self-care products across stores while moving visually between related products and styles.",
    searches:["Skincare","Beauty tools","Hair care","Self care","Sensitive skin","Beauty discoveries"]
  },
  {
    slug:"fitness",
    name:"Fitness",
    title:"Fitness Gear, Activewear & Training Shopping | YNOT",
    description:"Explore activewear, fitness gear, training accessories, recovery products and sports shopping through YNOT.",
    eyebrow:"Fitness shopping",
    intro:"Discover activewear, training accessories, recovery products and fitness gear using a visual shopping experience built around related products.",
    searches:["Activewear","Training gear","Recovery","Running","Gym accessories","Fitness finds"]
  },
  {
    slug:"tech",
    name:"Tech",
    title:"Tech, Gadgets & Accessories Shopping | YNOT",
    description:"Discover useful tech, gadgets, audio, mobile accessories and smart products with YNOT visual shopping.",
    eyebrow:"Tech discovery",
    intro:"Explore gadgets, audio, mobile accessories and useful technology through a spatial shopping experience that helps surface related products quickly.",
    searches:["Gadgets","Audio","Phone accessories","Smart devices","Desk tech","Useful technology"]
  },
  {
    slug:"discover",
    name:"Shopping Discovery",
    title:"Visual Shopping & Product Discovery Across Stores | YNOT",
    description:"Discover products across independent stores and marketplaces with YNOT, a visual spatial shopping experience for fashion, home, beauty, fitness and tech.",
    eyebrow:"Visual shopping",
    intro:"YNOT is a visual shopping and product-discovery experience for exploring products across independent stores and broader commerce sources without relying on a conventional product grid.",
    searches:["Independent stores","Trending products","Best value","New arrivals","Hidden gems","Products like this"]
  }
];

export function getSeoCategory(slug:string){return SEO_CATEGORIES.find(category=>category.slug===slug)}
