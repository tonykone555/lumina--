import { NextRequest } from "next/server";
import { GET as openAiFeedGET } from "@/app/api/commerce/openai-feed/route";

export const runtime = "nodejs";
export const maxDuration = 60;

const COUNTRIES = "FR,BE,DE,ES,IT,NL,GB,US,CA,AU";

export async function GET(req: NextRequest) {
  const url = new URL("/api/commerce/openai-feed", req.nextUrl.origin);
  url.searchParams.set("countries", COUNTRIES);
  url.searchParams.set("per_category", "100");
  url.searchParams.set("persist", "1");

  const forwarded = new NextRequest(url, {
    headers: req.headers,
  });

  return openAiFeedGET(forwarded);
}
