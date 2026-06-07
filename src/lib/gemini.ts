import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// Using the high-end gemini-2.5-pro model
const MODEL_NAME = "gemini-2.5-pro";

export interface RoadmapNode {
  id: string;
  title: string;
  description: string;
  tier: "foundational" | "intermediate" | "advanced";
  prerequisites: string[];
  searchQuery: string;
  paperId?: string; // Appended after Semantic Scholar search
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

/**
 * Generates the hierarchical structure of the learning roadmap based on a user's topic.
 */
export async function generateRoadmapStructure(topic: string): Promise<RoadmapNode[]> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

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
`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          nodes: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: { type: SchemaType.STRING },
                title: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                tier: {
                  type: SchemaType.STRING,
                },
                prerequisites: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                },
                searchQuery: { type: SchemaType.STRING },
              },
              required: ["id", "title", "description", "tier", "prerequisites", "searchQuery"],
            },
          },
        },
        required: ["nodes"],
      },
    },
  });

  const text = result.response.text();
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
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

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

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          questions: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                question: { type: SchemaType.STRING },
                options: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                },
                answerIndex: { type: SchemaType.INTEGER },
                explanation: { type: SchemaType.STRING },
              },
              required: ["question", "options", "answerIndex", "explanation"],
            },
          },
        },
        required: ["questions"],
      },
    },
  });

  const text = result.response.text();
  const data = JSON.parse(text);
  return data.questions;
}
