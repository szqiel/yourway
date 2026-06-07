import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateQuiz } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paperId } = body;

    if (!paperId) {
      return NextResponse.json({ error: "paperId is required" }, { status: 400 });
    }

    // 1. Fetch the cached paper title and abstract from the database
    const { data: paper, error: paperError } = await supabase
      .from("cached_papers")
      .select("title, abstract")
      .eq("id", paperId)
      .single();

    if (paperError || !paper) {
      return NextResponse.json(
        { error: "Paper not found in cache. Generate roadmap first." },
        { status: 404 }
      );
    }

    // 2. Dynamically generate 3 MCQ questions from the abstract
    const questions = await generateQuiz(paper.title, paper.abstract || "");

    return NextResponse.json({ questions });
  } catch (error: any) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during quiz generation." },
      { status: 500 }
    );
  }
}
