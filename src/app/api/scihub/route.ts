import { NextRequest, NextResponse } from "next/server";
import { resolveSciHubUrl } from "@/lib/scihub";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const doi = searchParams.get("doi");

    if (!doi) {
      return NextResponse.json(
        { error: "DOI query parameter is required." },
        { status: 400 }
      );
    }

    const resolvedUrl = await resolveSciHubUrl(doi.trim());

    return NextResponse.json({ url: resolvedUrl });
  } catch (error: any) {
    console.error("SciHub API Route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to resolve SciHub mirror." },
      { status: 500 }
    );
  }
}
