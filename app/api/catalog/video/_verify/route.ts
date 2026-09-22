import {NextResponse} from "next/server";

export const runtime="nodejs";

export async function GET(){
 return NextResponse.json({
  ok:true,
  huggingface_token_present:Boolean(String(process.env.HUGGINGFACE_TOKEN||"").trim()),
  space_url:String(process.env.HUGGINGFACE_SPACE_URL||"https://lightricks-ltx-video-distilled.hf.space"),
  api_name:String(process.env.HUGGINGFACE_SPACE_API_NAME||"image_to_video")
 });
}
