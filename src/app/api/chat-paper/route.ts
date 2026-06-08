import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { callLlm } from "@/lib/llm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paperId, messages, paperTitle, abstract, authors, year } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    let title = paperTitle;
    let paperAbstract = abstract;
    let paperAuthors = authors;
    let paperYear = year;

    if (!title || !paperAbstract) {
      if (!paperId) {
        return NextResponse.json(
          { error: "paperId or paperTitle/abstract are required" },
          { status: 400 }
        );
      }

      // 1. Fetch paper details from cached database
      const { data: paper, error: paperError } = await supabase
        .from("cached_papers")
        .select("title, abstract, authors, year, ai_summary")
        .eq("id", paperId)
        .single();

      if (paperError || !paper) {
        return NextResponse.json(
          { error: "Paper not found in database cache." },
          { status: 404 }
        );
      }

      title = paper.title;
      paperAbstract = paper.abstract;
      paperAuthors = paper.authors;
      paperYear = paper.year;
      // Store ai_summary if available
      (body as any).aiSummary = paper.ai_summary;
    }

    const aiSummary = body.aiSummary || "";

    // 2. Format the messages for Gemini (OpenAI standard roles: 'user', 'assistant')
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role === "model" ? "assistant" : msg.role,
      content: msg.content,
    }));

    // 3. Formulate the system instruction context
    const authorNames = paperAuthors
      ? (paperAuthors as any[]).map((a) => a.name).join(", ")
      : "Unknown";

    const systemPrompt = `
You are an expert academic research assistant consulting on the paper: "${title}"
Published in: ${paperYear}
Authors: ${authorNames}

Abstract:
"${paperAbstract}"

${aiSummary ? `Here is a detailed Milestone Guide summary of the paper's full text:\n"${aiSummary}"` : ""}

Answer the user's questions utilizing the abstract, paper metadata, and detailed summary details provided. If the question cannot be answered using this context, explain this limitation clearly and invite the user to read the full text if available.
Maintain an objective, academic, yet encouraging tone.
Do not use emojis under any circumstances.
`;

    // 4. Call LLM API to generate response
    const replyText = await callLlm(formattedMessages, systemPrompt);

    return NextResponse.json({ reply: replyText });
  } catch (error: any) {
    console.error("Codex Chat error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during chat consultation." },
      { status: 500 }
    );
  }
}
