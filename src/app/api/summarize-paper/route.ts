import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generatePaperSummary } from "@/lib/llm";

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
        .select("ai_summary")
        .eq("id", paperId)
        .single();

      if (!error && data?.ai_summary) {
        console.log(`Cache hit for paper summary: ${paperId}`);
        return NextResponse.json({ summary: data.ai_summary });
      }
    }

    // 2. Generate the Summary using LLM based strictly on OpenAlex reconstructed abstract
    // By relying on the highly detailed abstracts and the AI's internal scientific knowledge,
    // we bypass slow, expensive, and error-prone PDF downloads entirely.
    console.log(`Synthesizing Milestone Guide from Abstract metadata for: ${title}`);
    const summary = await generatePaperSummary(title, abstract, undefined, nodeTitle, nodeDescription);

    // 3. Cache the summary back in Supabase
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
