import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paperId, messages } = body;

    if (!paperId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "paperId and messages array are required" },
        { status: 400 }
      );
    }

    // 1. Fetch paper details from cached database
    const { data: paper, error: paperError } = await supabase
      .from("cached_papers")
      .select("title, abstract, authors, year")
      .eq("id", paperId)
      .single();

    if (paperError || !paper) {
      return NextResponse.json(
        { error: "Paper not found in database cache." },
        { status: 404 }
      );
    }

    // 2. Format the messages for Gemini
    const lastMessage = messages[messages.length - 1].content;
    const chatHistory = messages.slice(0, -1).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    // 3. Formulate the system instruction context
    const authorNames = paper.authors
      ? (paper.authors as any[]).map((a) => a.name).join(", ")
      : "Unknown";

    const systemPrompt = `
You are a expert academic research assistant consulting on the paper: "${paper.title}"
Published in: ${paper.year}
Authors: ${authorNames}

Abstract:
"${paper.abstract}"

Answer the user's questions utilizing ONLY the abstract and paper metadata details provided. If the question cannot be answered using the abstract, explain this limitation clearly and invite the user to read the full text if available.
Maintain an objective, academic, yet encouraging tone.
Do not use emojis under any circumstances.
`;

    // 4. Call Gemini to generate response
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({
      history: chatHistory,
    });

    const result = await chat.sendMessage(lastMessage);
    const replyText = result.response.text();

    return NextResponse.json({ reply: replyText });
  } catch (error: any) {
    console.error("Codex Chat error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during chat consultation." },
      { status: 500 }
    );
  }
}
