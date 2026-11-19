import "server-only";
import { createSign, randomUUID } from "node:crypto";

const SCOPE = "https://www.googleapis.com/auth/content";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const MERCHANT_HOST = "https://merchantapi.googleapis.com";
const ACCOUNT_ID = process.env.GOOGLE_MERCHANT_ACCOUNT_ID || "5899503459";

type GoogleCredentials = {
  type: "service_account";
  client_email: string;
  private_key: string;
  token_uri?: string;
  project_id?: string;
};

function credentials(): GoogleCredentials {
  const raw = process.env.GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON is not configured");
  let parsed: Partial<GoogleCredentials>;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Service account JSON is malformed"); }
  if (parsed.type !== "service_account" || !parsed.client_email || !parsed.private_key) {
    throw new Error("Invalid service account JSON: missing identity or private key");
  }
  if (parsed.token_uri && parsed.token_uri !== TOKEN_URL) {
    throw new Error("Unexpected service account token endpoint");
  }
  return parsed as GoogleCredentials;
}

function base64url(v: string | Buffer) {
  return Buffer.from(v).toString("base64url");
}

export async function googleMerchantAccessToken(): Promise<string> {
  const c = credentials();
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({
    iss: c.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
    jti: randomUUID(),
  }));
  const unsigned = header + "." + claims;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = unsigned + "." + base64url(signer.sign(c.private_key.replace(/\\n/g, "\n")));
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("Google OAuth token exchange failed (HTTP " + response.status + ")");
  const json = await response.json() as { access_token?: string };
  if (!json.access_token) throw new Error("Google OAuth did not return an access token");
  return json.access_token;
}

export async function checkGoogleMerchantApi(): Promise<{ accountId: string; httpStatus: number; authenticated: boolean; message: string }> {
  const token = await googleMerchantAccessToken();
  const url = MERCHANT_HOST + "/products/v1/accounts/" + encodeURIComponent(ACCOUNT_ID) + "/products?pageSize=1";
  const response = await fetch(url, {
    headers: { authorization: "Bearer " + token, accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  return {
    accountId: ACCOUNT_ID,
    httpStatus: response.status,
    authenticated: response.ok,
    message: response.ok ? "Service account authenticated with Merchant API" :
      response.status === 403 ? "Account access denied; verify Merchant Center user permissions" :
      response.status === 401 ? "Google rejected the service-account request; verify project registration and permissions" :
      "Merchant API returned HTTP " + response.status,
  };
}
