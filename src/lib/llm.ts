import { GoogleGenerativeAI } from "@google/generative-ai";

export interface RoadmapNode {
  id: string;
  title: string;
  description: string;
  tier: "foundational" | "intermediate" | "advanced";
  prerequisites: string[];
  searchQuery: string;
  suggestedPaper?: any;
  paperId?: string;
  paper?: {
    id: string;
    title: string;
    authors: { name: string; authorId?: string }[];
    abstract: string;
    year: number;
    citationCount: number;
    doi: string;
    oaUrl: string; // OpenAlex Open Access URL
  };
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const GEMINI_MODEL_NAME = "gemini-2.5-flash"; // Requested by user to use version 2 (flash or pro)

/**
 * Sends a chat completion request to Google Gemini API using robust retries for high demand (429).
 */
export async function callLlm(
  messages: { role: string; content: string }[],
  systemInstruction?: string,
  jsonMode: boolean = false,
  maxTokens?: number
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables. Please add it to your .env.local file.");
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  
  // Initialize the Gemini version 2 model
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL_NAME,
    systemInstruction: systemInstruction || undefined,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: maxTokens || undefined,
      responseMimeType: jsonMode ? "application/json" : "text/plain",
    }
  });

  // Convert generic messages to Gemini format
  const geminiMessages = messages.map(m => ({
    role: m.role === "model" || m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  // We usually send the conversation history. Since GoogleGenerativeAI expects history minus the last message,
  // we extract the last message to send directly.
  const lastMessage = geminiMessages.pop()?.parts[0].text || "";

  let lastError: any = null;
  const maxRetries = 3;
  let delay = 2000; // start with 2s delay

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const chat = model.startChat({ history: geminiMessages });
      const result = await chat.sendMessage(lastMessage);
      const text = result.response.text();
      return text;
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.response?.status;
      const message = err.message || "";

      // Handle 429 Resource Exhausted (High Demand)
      if (status === 429 || message.includes("429") || message.includes("Resource Exhausted") || message.includes("quota")) {
        if (attempt < maxRetries) {
          console.warn(`[Gemini API] High demand/429 error on attempt ${attempt}. Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          continue;
        } else {
          throw new Error("Gemini API is currently experiencing extreme high demand. Please try again in a few minutes.");
        }
      }

      // If it's a 500 error, we can retry as well
      if (status >= 500 || message.includes("500") || message.includes("Internal error")) {
        if (attempt < maxRetries) {
          console.warn(`[Gemini API] Upstream 500 error on attempt ${attempt}. Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
      }

      // For any other error (e.g., 400 Bad Request, API key invalid), throw immediately without retrying
      throw new Error(`Gemini API Error: ${message}`);
    }
  }

  throw new Error(`Gemini API failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
}

/**
 * Generates the hierarchical structure of the learning roadmap based on a user's topic.
 */
export async function generateRoadmapStructure(topic: string): Promise<RoadmapNode[]> {
  const prompt = `
You are an elite academic curriculum designer and expert research compiler.
Your task is to break down the topic: "${topic}" into a structured learning roadmap (Skill Tree) consisting of exactly 6 to 9 milestones.

Structure the path into three sequential tiers:
1. "foundational" (1-2 nodes) - Base concepts and history necessary to understand the field.
2. "intermediate" (2-3 nodes) - Key methodologies, frameworks, or standard tools.
3. "advanced" (2-3 nodes) - Cutting-edge breakthroughs, efficiency limits, or niche applications.

Establish logical dependencies (prerequisites) between nodes.

For each node:
1. Provide a highly specific, scientific search query that will be used to find a real, highly cited academic paper on OpenAlex. Do NOT use search operators (like AND/OR). Use natural, descriptive keywords (e.g. "javascript functional programming fundamentals"). The query MUST be highly relevant to the milestone topic.
2. Identify a real, seminal, highly cited academic paper or textbook matching this exact topic. Provide its actual details (Title, Authors, Year, Citation Count, and its real working DOI). DO NOT make up fake DOIs.

Enforce output as a JSON object matching this schema:
{
  "nodes": [
    {
      "id": "unique-id-slug",
      "title": "Clear Node Title",
      "description": "A 1-2 sentence explanation of what this milestone covers.",
      "tier": "foundational" | "intermediate" | "advanced",
      "prerequisites": ["list-of-parent-ids"],
      "searchQuery": "academic query for paper search",
      "suggestedPaper": {
        "title": "Exact Title of the Real Academic Paper",
        "authors": ["Author Name 1", "Author Name 2"],
        "year": 2020,
        "citationCount": 420,
        "doi": "Real working DOI of this paper"
      }
    }
  ]
}
`;

  const text = await callLlm([{ role: "user", content: prompt }], undefined, true);
  const data = JSON.parse(text);
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
`;

  const text = await callLlm([{ role: "user", content: prompt }], undefined, true, 1500);
  const data = JSON.parse(text);
  return data.questions;
}

/**
 * Generates a comprehensive study guide/milestone summary based on a paper's full text or abstract metadata.
 */
export async function generatePaperSummary(
  title: string,
  abstract: string,
  fullText?: string, // Kept for backwards compatibility but unused
  nodeTitle?: string,
  nodeDescription?: string
): Promise<string> {
  const prompt = `
You are an expert academic tutor and scientific researcher with deep pre-trained knowledge of all published scientific literature.
Your task is to write a detailed, highly structured Milestone Study Guide (AI Summary) based on the abstract and metadata of the research paper: "${title}" (Abstract: "${abstract}").
This guide is specifically designed for a student studying the milestone: "${nodeTitle || title}" (${nodeDescription || ""}).

Use the paper's metadata and your own deep academic and scientific knowledge of this seminal paper to write a comprehensive Study Guide in Markdown.
Structure your guide with the following sections:
## ## MILESTONE GUIDE: ${nodeTitle?.toUpperCase() || title.toUpperCase()}

### 1. Milestone Concept Alignment
Explain how this research paper directly connects to the skills and concepts of the milestone: "${nodeTitle || title}". What is the core relevance?

### 2. Deep Dive Methodology & Findings
Describe the typical experimental setup, methodologies, or frameworks of this study. What were the major conclusions and findings?

### 3. Essential Takeaways
List 3-5 critical, non-obvious scientific facts, equations, constants, or design principles from the paper that the student *must* understand to pass this milestone.

### 4. Limitations & Challenges
What are the limitations, edge cases, bottlenecks, or future research directions associated with this study?

Write the guide in clear, concise, academic, yet engaging language. Use standard markdown. Focus on high educational value.
IMPORTANT: Be concise and direct to save time. Do NOT generate massive repetitive walls of text, but ensure all sections are fully completed and sentences are properly finished.
`;

  return await callLlm([{ role: "user", content: prompt }], undefined, false, 2000);
}
