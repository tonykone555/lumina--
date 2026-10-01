export type ProductFingerprint={
  productId:string;world:string;category:string;subcategory:string;
  canonicalTitle:string;objectTypes:string[];globalTags:string[];
  attributes:Record<string,string[]>;components:string[];searchPhrases:string[];
  confidence:number;scannedAt:string;
};
const aliases:Record<string,string>={"fat tire":"wide tyres","fat tires":"wide tyres","fat tyre":"wide tyres","fat tyres":"wide tyres","wide tire":"wide tyres","wide tires":"wide tyres","matte black":"black","offroad":"off-road","e bike":"e-bike","ebike":"e-bike"};
export const normalizeTag=(value:string)=>{const v=value.toLowerCase().trim().replace(/[_-]+/g," ").replace(/\s+/g," ");return aliases[v]||v};
export const normalizeFingerprint=(f:ProductFingerprint):ProductFingerprint=>({...f,objectTypes:[...new Set(f.objectTypes.map(normalizeTag))],globalTags:[...new Set(f.globalTags.map(normalizeTag))],components:[...new Set(f.components.map(normalizeTag))],searchPhrases:[...new Set(f.searchPhrases.map(x=>x.trim()).filter(Boolean))],attributes:Object.fromEntries(Object.entries(f.attributes).map(([k,v])=>[normalizeTag(k),[...new Set(v.map(normalizeTag))]]))});
export const fingerprintTags=(f:ProductFingerprint)=>[...new Set([...f.globalTags,...f.objectTypes,...f.components,...Object.values(f.attributes).flat()])];
