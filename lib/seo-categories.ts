export type SeoCategory={
  slug:string;
  name:string;
  title:string;
  description:string;
  eyebrow:string;
  intro:string;
  guide:string;
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
    guide:"Use YNOT to move naturally between related looks, materials, silhouettes and price points instead of opening endless tabs. The fashion world is designed to make discovery feel visual: start with a style you like, compare nearby alternatives and branch into independent brands or similar products as you explore.",
    searches:["Dresses","Shoes","Bags & accessories","Activewear","Independent fashion brands","New fashion finds"]
  },
  {
    slug:"home",
    name:"Home & Furniture",
    title:"Furniture, Lighting & Home Decor Shopping | YNOT",
    description:"Discover furniture, lighting, storage, decor and home products with YNOT's visual shopping and product discovery experience.",
    eyebrow:"Home shopping",
    intro:"Browse furniture, lighting, decor, storage, bedding and home products in a visual shopping world designed for discovery rather than endless product lists.",
    guide:"Explore rooms and product ideas by relationship rather than by rigid catalog pages. YNOT helps you move from a chair to matching lighting, from storage to complementary decor, or from one interior style to another while comparing products from multiple shopping sources in a single visual flow.",
    searches:["Furniture","Lighting","Home decor","Storage","Bedding","Modern interiors"]
  },
  {
    slug:"beauty",
    name:"Beauty",
    title:"Beauty, Skincare & Self-Care Shopping | YNOT",
    description:"Discover skincare, beauty, hair and self-care products across stores using YNOT's visual shopping experience.",
    eyebrow:"Beauty discovery",
    intro:"Explore skincare, beauty tools, hair care and self-care products across stores while moving visually between related products and styles.",
    guide:"YNOT groups beauty discovery around related needs, formats and product types so it is easier to compare alternatives without losing context. Move between skincare, hair care, tools and self-care products, then follow the visual relationships to discover brands and options that may not appear together in a conventional store grid.",
    searches:["Skincare","Beauty tools","Hair care","Self care","Sensitive skin","Beauty discoveries"]
  },
  {
    slug:"fitness",
    name:"Fitness",
    title:"Fitness Gear, Activewear & Training Shopping | YNOT",
    description:"Explore activewear, fitness gear, training accessories, recovery products and sports shopping through YNOT.",
    eyebrow:"Fitness shopping",
    intro:"Discover activewear, training accessories, recovery products and fitness gear using a visual shopping experience built around related products.",
    guide:"Browse training products by use, style and connection instead of treating every item as an isolated listing. YNOT lets you explore activewear, gym accessories, running gear and recovery products side by side, then continue into related products when something catches your attention.",
    searches:["Activewear","Training gear","Recovery","Running","Gym accessories","Fitness finds"]
  },
  {
    slug:"tech",
    name:"Tech",
    title:"Tech, Gadgets & Accessories Shopping | YNOT",
    description:"Discover useful tech, gadgets, audio, mobile accessories and smart products with YNOT visual shopping.",
    eyebrow:"Tech discovery",
    intro:"Explore gadgets, audio, mobile accessories and useful technology through a spatial shopping experience that helps surface related products quickly.",
    guide:"YNOT makes it easier to jump between connected technology categories without starting a new search each time. Compare accessories, audio, desk tech, smart devices and useful gadgets visually, then follow nearby alternatives to understand what else is available across stores and shopping sources.",
    searches:["Gadgets","Audio","Phone accessories","Smart devices","Desk tech","Useful technology"]
  },
  {
    slug:"discover",
    name:"Shopping Discovery",
    title:"Visual Shopping & Product Discovery Across Stores | YNOT",
    description:"Discover products across independent stores and marketplaces with YNOT, a visual spatial shopping experience for fashion, home, beauty, fitness and tech.",
    eyebrow:"Visual shopping",
    intro:"YNOT is a visual shopping and product-discovery experience for exploring products across independent stores and broader commerce sources without relying on a conventional product grid.",
    guide:"Start anywhere and move through products by similarity, style, category or curiosity. The discovery world connects fashion, home, beauty, fitness, technology and other shopping areas so a search can evolve naturally instead of ending with a static list of results. It is built for finding products you did not know to search for yet.",
    searches:["Independent stores","Trending products","Best value","New arrivals","Hidden gems","Products like this"]
  }
];

export function getSeoCategory(slug:string){return SEO_CATEGORIES.find(category=>category.slug===slug)}
