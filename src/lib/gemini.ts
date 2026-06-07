const apiKey = process.env.NVIDIA_API_KEY || "";
const MODEL_NAME = process.env.NVIDIA_MODEL_NAME || "meta/llama-3.3-70b-instruct";
const BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

export interface RoadmapNode {
  id: string;
  title: string;
  description: string;
  tier: "foundational" | "intermediate" | "advanced";
  prerequisites: string[];
  searchQuery: string;
  paperId?: string; // Appended after Semantic Scholar search
  paper?: {
    id: string;
    title: string;
    authors: { name: string; authorId?: string }[];
    abstract: string;
    year: number;
    citationCount: number;
    doi: string;
    pdfUrl: string;
  };
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

/**
 * Robust JSON parser that strips markdown code fences if returned by the LLM.
 */
function cleanAndParseJson(text: string): any {
  if (!text) {
    throw new Error("AI returned empty or null text.");
  }
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/\s*```$/, "")
      .trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to parse JSON from text:", text);
    throw new Error("AI output was not valid JSON. Please try again.");
  }
}

/**
 * Sends a chat completion request to NVIDIA NIM (OpenAI-compatible endpoint).
 */
export async function callNvidiaNim(
  messages: { role: string; content: string }[],
  systemInstruction?: string
): Promise<string> {
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not configured in environment variables.");
  }

  const finalMessages = systemInstruction
    ? [{ role: "system", content: systemInstruction }, ...messages]
    : messages;

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages: finalMessages,
      temperature: 0.5,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`NVIDIA NIM API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  if (!data.choices || data.choices.length === 0) {
    throw new Error("NVIDIA NIM API returned empty choices.");
  }

  const message = data.choices[0].message;
  if (!message || message.content === undefined || message.content === null) {
    if (message.reasoning_content) {
      throw new Error(
        `NVIDIA NIM API model (${MODEL_NAME}) spent all of its tokens reasoning and did not produce any output content. Try increasing max_tokens or switching to a non-reasoning model like 'meta/llama-3.3-70b-instruct'.`
      );
    }
    throw new Error("NVIDIA NIM API returned null or undefined content.");
  }

  return message.content;
}

/**
 * Generates the hierarchical structure of the learning roadmap based on a user's topic.
 */
export async function generateRoadmapStructure(topic: string): Promise<RoadmapNode[]> {
  const prompt = `
You are an elite academic curriculum designer and STEM researcher.
Your task is to break down the STEM topic: "${topic}" into a structured learning roadmap (Skill Tree) consisting of exactly 6 to 9 milestones.

Structure the path into three sequential tiers:
1. "foundational" (1-2 nodes) - Base concepts and history necessary to understand the field.
2. "intermediate" (2-3 nodes) - Key methodologies, frameworks, or standard tools.
3. "advanced" (2-3 nodes) - Cutting-edge breakthroughs, efficiency limits, or niche applications.

Establish logical dependencies (prerequisites) between nodes. For instance:
- Foundational nodes have no prerequisites.
- Intermediate nodes list the foundational node(s) as prerequisites.
- Advanced nodes list the intermediate node(s) as prerequisites.

For each node, provide a highly specific, scientific search query that will be used to find a real, highly cited academic paper on Semantic Scholar. Do not include search operators like AND/OR; use natural research queries (e.g. "perovskite solar cells efficiency limits review 2022").

Enforce output as a JSON object matching this schema:
{
  "nodes": [
    {
      "id": "unique-id-slug",
      "title": "Clear Node Title",
      "description": "A 1-2 sentence explanation of what this milestone covers.",
      "tier": "foundational" | "intermediate" | "advanced",
      "prerequisites": ["list-of-parent-ids"],
      "searchQuery": "academic query for paper search"
    }
  ]
}

Ensure the response contains ONLY the raw JSON block.
`;

  const reply = await callNvidiaNim([{ role: "user", content: prompt }]);
  const data = cleanAndParseJson(reply);
  return data.nodes;
}

/**
 * Generates a 3-question MCQ quiz based on a paper's abstract.
 */
export async function generateQuiz(
  paperTitle: string,
  abstract: string
): Promise<QuizQuestion[]> {
  const prompt = `
You are a university professor creating an active-recall assessment.
Generate exactly 3 multiple-choice questions based on the abstract of the research paper: "${paperTitle}".

Abstract:
"${abstract}"

Each question must:
1. Test comprehension of key findings, methodology, or core conclusions of the abstract.
2. Have exactly 4 plausible options, but only 1 mathematically/scientifically correct answer.
3. Include a detailed, 1-sentence explanation of why the correct option is right based on the text.

Enforce output as a JSON object matching this schema:
{
  "questions": [
    {
      "question": "Comprehension question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 0,
      "explanation": "Explanation for the correct option."
    }
  ]
}

Ensure the response contains ONLY the raw JSON block.
`;

  const reply = await callNvidiaNim([{ role: "user", content: prompt }]);
  const data = cleanAndParseJson(reply);
  return data.questions;
}
