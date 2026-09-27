import {etsyApiKey} from "@/lib/etsy/auth";

const OPENAPI="https://openapi.etsy.com/v3/application";

type EtsyCallResult<T>={ok:boolean;status:number;data?:T;error?:string};

async function call<T>(path:string,accessToken:string):Promise<EtsyCallResult<T>>{
 const response=await fetch(`${OPENAPI}${path}`,{headers:{"x-api-key":etsyApiKey(),Authorization:`Bearer ${accessToken}`,Accept:"application/json"},cache:"no-store"});
 const text=await response.text().catch(()=>"");
 let data:any={};
 try{data=text?JSON.parse(text):{}}catch{data={message:text.slice(0,300)}}
 if(!response.ok){
  const error=String(data?.error_description||data?.error||data?.message||`ETSY_${response.status}`).slice(0,300);
  console.error("Etsy API verification call failed",JSON.stringify({path:path.replace(/\/\d+/g,"/:id"),status:response.status,error}));
  return{ok:false,status:response.status,error};
 }
 return{ok:true,status:response.status,data:data as T};
}

type EtsyMe={user_id?:number;shop_id?:number|null};
type EtsyShop={shop_id?:number;shop_name?:string;title?:string|null;url?:string;user_id?:number;currency_code?:string;listing_active_count?:number;is_vacation?:boolean};

// Performs real, authenticated Etsy Open API v3 calls with the connected
// account's OAuth token and returns only non-secret account/shop identifiers.
export async function verifyEtsyAccount(accessToken:string){
 const checkedAt=new Date().toISOString();
 if(!etsyApiKey())return{verified:false,checkedAt,error:"ETSY_API_KEY_MISSING"};
 if(!accessToken)return{verified:false,checkedAt,error:"ETSY_OAUTH_REQUIRED"};
 const tokenUserId=accessToken.split(".")[0]||null;
 const me=await call<EtsyMe>("/users/me",accessToken);
 if(!me.ok)return{verified:false,checkedAt,tokenUserId,step:"GET /v3/application/users/me",status:me.status,error:me.error};
 const meData:EtsyMe=me.data||{};
 const userId=meData.user_id??null;
 let shop:EtsyShop|null=null;
 let shopError:string|null=null;
 const shopResult=meData.shop_id
  ?await call<EtsyShop>(`/shops/${meData.shop_id}`,accessToken)
  :await call<EtsyShop>(`/users/${userId}/shops`,accessToken);
 if(shopResult.ok)shop=shopResult.data||null;
 else shopError=`${shopResult.status} ${shopResult.error}`;
 return{
  verified:true,
  checkedAt,
  tokenUserId,
  user:{user_id:userId,shop_id:meData.shop_id??null},
  shop:shop?{shop_id:shop.shop_id??null,shop_name:shop.shop_name??null,title:shop.title??null,url:shop.url??null,currency_code:shop.currency_code??null,listing_active_count:shop.listing_active_count??null}:null,
  shopError
 };
}
