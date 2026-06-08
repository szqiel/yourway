// Polyfill canvas-related browser globals for pdfjs-dist / pdf-parse in Node.js server environment
if (typeof global !== "undefined") {
  if (!(global as any).DOMMatrix) {
    (global as any).DOMMatrix = class DOMMatrix {};
  }
  if (!(global as any).ImageData) {
    (global as any).ImageData = class ImageData {};
  }
  if (!(global as any).Path2D) {
    (global as any).Path2D = class Path2D {};
  }
}

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { downloadPdfFromSciHubOrUrl } from "@/lib/scihub";
import { generatePaperSummary } from "@/lib/llm";
const pdf = require("pdf-parse");



function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return (
    url.length > 0 &&
    !url.includes("your-project-id") &&
    key.length > 0 &&
    !key.includes("your-supabase-anon-key")
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paperId, doi, title, abstract, nodeTitle, nodeDescription } = body;

    if (!paperId || !title || !abstract) {
      return NextResponse.json(
        { error: "paperId, title, and abstract are required fields." },
        { status: 400 }
      );
    }

    const hasSupabase = isSupabaseConfigured();

    // 1. Check Supabase cache first if available
    if (hasSupabase) {
      const { data, error } = await supabase
        .from("cached_papers")
        .select("ai_summary, external_pdf_url")
        .eq("id", paperId)
        .single();

      if (!error && data?.ai_summary) {
        console.log(`Cache hit for paper summary: ${paperId}`);
        return NextResponse.json({ summary: data.ai_summary });
      }
    }

    // 2. Fetch the cached paper details (to get the latest external pdf url if cache lookup failed earlier)
    let externalPdfUrl = "";
    if (hasSupabase) {
      const { data } = await supabase
        .from("cached_papers")
        .select("external_pdf_url")
        .eq("id", paperId)
        .single();
      if (data?.external_pdf_url) {
        externalPdfUrl = data.external_pdf_url;
      }
    }

    // 3. Attempt to download the PDF
    let pdfText = "";
    let downloadSuccess = false;

    try {
      console.log(`Attempting PDF download for DOI: ${doi}, externalUrl: ${externalPdfUrl}`);
      const pdfBuffer = await downloadPdfFromSciHubOrUrl(doi, externalPdfUrl);
      console.log(`Download successful. Size: ${pdfBuffer.length} bytes. Parsing PDF...`);
      
      const parsedPdf = await pdf(pdfBuffer);
      pdfText = parsedPdf.text || "";
      console.log(`PDF successfully parsed. Character count: ${pdfText.length}`);
      
      if (pdfText.trim().length > 100) {
        downloadSuccess = true;
      } else {
        console.warn("Parsed PDF text was empty or too short.");
      }
    } catch (downloadErr: any) {
      console.warn("PDF download/parsing failed. Proceeding with parametric fallback.", downloadErr.message || downloadErr);
    }

    // 4. Generate the Summary using LLM
    let summary = "";
    if (downloadSuccess) {
      // Limit to first 30,000 characters to keep within context limits and low-latency response times
      const truncatedText = pdfText.substring(0, 30000);
      console.log("Synthesizing Milestone Guide from full-text paper...");
      summary = await generatePaperSummary(title, abstract, truncatedText, nodeTitle, nodeDescription);
    } else {
      console.log("Synthesizing Milestone Guide from Abstract metadata & Parametric knowledge...");
      summary = await generatePaperSummary(title, abstract, undefined, nodeTitle, nodeDescription);
    }

    // 5. Cache the summary back in Supabase
    if (hasSupabase) {
      const { error: updateError } = await supabase
        .from("cached_papers")
        .update({ ai_summary: summary })
        .eq("id", paperId);

      if (updateError) {
        console.error("Failed to cache generated summary in Supabase:", updateError);
      } else {
        console.log(`Cached summary in database for paper: ${paperId}`);
      }
    }

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error("Summarization API endpoint error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred during paper summarization." },
      { status: 500 }
    );
  }
}
