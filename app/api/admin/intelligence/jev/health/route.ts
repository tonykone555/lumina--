import { NextResponse } from "next/server";
import { getJevModels, jevConfigured } from "@/lib/intelligence/jev";

export const dynamic = "force-dynamic";

/**
 * Server-side Jev connectivity check.
 * Never returns the API key or request headers.
 */
export async function GET() {
  if (!jevConfigured()) {
    return NextResponse.json(
      { ok: false, configured: false, error: "TYPESAFE_API_KEY_MISSING" },
      { status: 503 },
    );
  }

  try {
    const response = await getJevModels();
    const models = Array.isArray(response)
      ? response
      : Array.isArray((response as any)?.data)
        ? (response as any).data
        : Array.isArray((response as any)?.models)
          ? (response as any).models
          : [];

    const safeModels = models.map((model: any) => {
      if (typeof model === "string") return { id: model };
      return {
        id: model?.id ?? model?.name ?? model?.model ?? null,
        name: model?.name ?? null,
      };
    }).filter((model: any) => model.id || model.name);

    return NextResponse.json({
      ok: true,
      configured: true,
      models: safeModels,
      modelCount: safeModels.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TYPESAFE_UNKNOWN_ERROR";
    // Keep provider diagnostics useful while never returning credentials.
    return NextResponse.json(
      { ok: false, configured: true, error: message },
      { status: 502 },
    );
  }
}
