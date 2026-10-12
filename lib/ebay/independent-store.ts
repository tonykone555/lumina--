import {Pool} from "pg";
import {createCipheriv,createDecipheriv,createHash,randomBytes} from "node:crypto";
import type {EbayTokenPayload} from "@/lib/ebay/auth";

let pool:Pool|undefined;
function db(){
 const url=process.env.POSTGRES_URL;
 if(!url)throw new Error("EBAY_INDEPENDENT_DATABASE_MISSING");
 if(!pool)pool=new Pool({connectionString:url,max:2,connectionTimeoutMillis:8000,ssl:url.includes("sslmode=")?undefined:{rejectUnauthorized:true}});
 return pool;
}
function secret(){
 const v=process.env.EBAY_CLIENT_SECRET;
 if(!v)throw new Error("EBAY_CLIENT_SECRET_MISSING");
 return createHash("sha256").update("ynot-ebay-v1:"+v).digest();
}
function encrypt(s:string){
 const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",secret(),iv);
 const encrypted=Buffer.concat([cipher.update(s,"utf8"),cipher.final()]);
 return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString("base64");
}
function decrypt(s:string){
 const bytes=Buffer.from(s,"base64"),iv=bytes.subarray(0,12),tag=bytes.subarray(12,28),data=bytes.subarray(28);
 const decipher=createDecipheriv("aes-256-gcm",secret(),iv);decipher.setAuthTag(tag);
 return Buffer.concat([decipher.update(data),decipher.final()]).toString("utf8");
}
async function ensure(){
 await db().query(`CREATE TABLE IF NOT EXISTS ynot_ebay_auth_v1 (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT now())`);
}
export async function readIndependentEbayToken():Promise<(EbayTokenPayload&{expires_at?:string})|null>{
 await ensure();
 const r=await db().query("SELECT payload FROM ynot_ebay_auth_v1 WHERE id=$1",["primary"]);
 return r.rows[0]?JSON.parse(decrypt(r.rows[0].payload)):null;
}
export async function saveIndependentEbayToken(t:EbayTokenPayload){
 if(!t.refresh_token)throw new Error("EBAY_REFRESH_TOKEN_MISSING");
 await ensure();
 const payload={...t,expires_at:new Date(Date.now()+Math.max(60,Number(t.expires_in||7200))*1000).toISOString()};
 await db().query("INSERT INTO ynot_ebay_auth_v1(id,payload,updated_at) VALUES($1,$2,now()) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()",["primary",encrypt(JSON.stringify(payload))]);
}
export async function consumeEbayOwnerLink(key:string){
 const expected=process.env.EBAY_OWNER_CONNECT_KEY||"";
 if(!expected||!key||createHash("sha256").update(key).digest("hex")!==createHash("sha256").update(expected).digest("hex"))return false;
 await db().query("CREATE TABLE IF NOT EXISTS ynot_ebay_owner_link_uses (id TEXT PRIMARY KEY, consumed_at TIMESTAMPTZ DEFAULT now())");
 const r=await db().query("INSERT INTO ynot_ebay_owner_link_uses(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id",["owner-link-v1"]);
 return r.rowCount===1;
}
