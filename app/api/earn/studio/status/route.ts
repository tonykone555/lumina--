import {NextRequest,NextResponse} from "next/server";
import {authenticatedUser} from "@/lib/creators/earn";

export const runtime="nodejs";

export async function GET(req:NextRequest){
  try{
    await authenticatedUser(req);
    const higgsfield=Boolean(String(process.env.HF_CREDENTIALS||"").trim()||(String(process.env.HF_API_KEY||"").trim()&&String(process.env.HF_API_SECRET||"").trim()));
    const trypost=Boolean(String(process.env.TRYPOST_API_TOKEN||"").trim());
    const viggle=Boolean(String(process.env.VIGGLE_API_KEY||"").trim());
    const muapi=Boolean(String(process.env.MUAPI_API_KEY||"").trim());
    const geminiImage=Boolean(String(process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||"").trim());
    return NextResponse.json({
      higgsfield:{configured:higgsfield},
      viggle:{configured:viggle},
      muapi:{configured:muapi},
      trypost:{configured:trypost},
      gemini_image:{configured:geminiImage,standard_model:"gemini-3.1-flash-image",premium_model:"gemini-3-pro-image"},
      generation_ready:(higgsfield||muapi||viggle)&&geminiImage,
      standard_motion_ready:muapi||viggle,
      standard_video_ready:muapi,
      premium_motion_ready:higgsfield,
      publishing_ready:trypost
    });
  }catch(e){
    const m=e instanceof Error?e.message:"STUDIO_STATUS_FAILED";
    return NextResponse.json({error:m},{status:/SIGN_IN|SESSION/.test(m)?401:400});
  }
}
