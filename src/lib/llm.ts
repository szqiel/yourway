export interface RoadmapNode {
  id: string;
  title: string;
  description: string;
  tier: "foundational" | "intermediate" | "advanced";
  prerequisites: string[];
  searchQuery: string;
  paperId?: string;
  paper?: {
    id: string;
    title: string;
    authors: { name: string; authorId?: string }[];
    abstract: string;
    year: number;
    citationCount: number;
    doi: string;
    pdfUrl: string;
    sciHubUrl?: string;
  };
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

const BLUESMINDS_API_KEY = process.env.BLUESMINDS_API_KEY || "";
const BLUESMINDS_MODEL_NAME = process.env.BLUESMINDS_MODEL_NAME || "moonshotai/kimi-k2.6";
const BLUESMINDS_BASE_URL = "https://api.bluesminds.com/v1";

/**
 * Helper to parse LLM response text which might be a standard JSON response or an SSE stream chunk list.
 */
function parseLlmResponseText(text: string): string {
  text = text.trim();
  if (text.startsWith("data:")) {
    let content = "";
    const lines = text.split("\n");
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine === "data: [DONE]") {
        continue;
      }
      if (trimmedLine.startsWith("data:")) {
        const jsonStr = trimmedLine.substring(5).trim();
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.choices && parsed.choices[0]) {
            const delta = parsed.choices[0].delta;
            if (delta && delta.content) {
              content += delta.content;
            } else if (parsed.choices[0].message && parsed.choices[0].message.content) {
              content += parsed.choices[0].message.content;
            }
          }
        } catch (e) {
          // ignore malformed lines
        }
      }
    }
    return content;
  } else {
    const parsed = JSON.parse(text);
    if (parsed.choices && parsed.choices[0]) {
      return parsed.choices[0].message.content || "";
    }
    throw new Error("No choices returned in standard JSON response.");
  }
}

/**
 * Sends a chat completion request to the Bluesminds OpenAI-compatible endpoint.
 * Includes client-side fallback if the primary model is degraded upstream.
 */
export async function callLlm(
  messages: { role: string; content: string }[],
  systemInstruction?: string,
  jsonMode: boolean = false
): Promise<string> {
  if (!BLUESMINDS_API_KEY) {
    throw new Error("BLUESMINDS_API_KEY is not configured in environment variables. Please add BLUESMINDS_API_KEY to your .env.local file.");
  }

  const formattedMessages: { role: string; content: string }[] = [];
  if (systemInstruction) {
    formattedMessages.push({ role: "system", content: systemInstruction });
  }

  messages.forEach(m => {
    const role = m.role === "model" || m.role === "assistant" ? "assistant" : "user";
    formattedMessages.push({ role, content: m.content });
  });

  // Strip any double quotes that might be parsed literally from .env.local
  const primaryModel = BLUESMINDS_MODEL_NAME.replace(/^"|"$/g, "");
  
  // Fallback chain of active models
  const modelsToTry = [primaryModel];
  if (!modelsToTry.includes("qwen3.6-plus")) {
    modelsToTry.push("qwen3.6-plus");
  }
  if (!modelsToTry.includes("fallback")) {
    modelsToTry.push("fallback");
  }

  let lastError: any = null;

  for (const model of modelsToTry) {
    const maxRetries = 1;
    let attempt = 0;
    let delay = 1500;

    while (attempt <= maxRetries) {
      try {
        attempt++;
        const res = await fetch(`${BLUESMINDS_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${BLUESMINDS_API_KEY}`,
          },
          body: JSON.stringify({
            model: model,
            messages: formattedMessages,
            temperature: 0.3,
            ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
          }),
          signal: AbortSignal.timeout(45000), // 45s timeout
        });

        const status = res.status;
        const responseText = await res.text();

        // Check if there is an error object inside the response JSON
        try {
          if (!responseText.trim().startsWith("data:")) {
            const responseData = JSON.parse(responseText);
            if (responseData && responseData.error) {
              const errMsg = responseData.error.message || "";
              const errType = responseData.error.type || "";
              const errCode = responseData.error.code || "";
              throw new Error(`API error details: [${errType} / ${errCode}] ${errMsg}`);
            }
          }
        } catch (e: any) {
          if (e.message.startsWith("API error details:")) {
            throw e;
          }
        }

        if (!res.ok) {
          if (status === 429) {
            console.warn(`[LLM] Rate limit or insufficient balance for ${model} (429). Moving to next fallback model.`);
            break; // Do not retry on 429, fallback immediately to save bill
          }
          if (status >= 500) {
            console.warn(`[LLM] Upstream error ${status} for ${model}. Moving to next fallback model.`);
            break; // Do not retry on 5xx, fallback immediately
          }
          throw new Error(`Bluesminds API error (${status}): ${responseText}`);
        }

        return parseLlmResponseText(responseText);

      } catch (err: any) {
        lastError = err;
        
        const isUpstreamError = err.message.includes("bad_response_status_code") || 
                                err.message.includes("do_request_failed") ||
                                err.message.includes("Invalid model name") ||
                                err.message.includes("openai_error");

        if (isUpstreamError || err.name === "AbortError" || attempt > maxRetries) {
          console.warn(`[LLM] Model ${model} failed: ${err.message || err}. Moving to next fallback model.`);
          break; // break retry loop for this model
        }

        // Only retry for generic network errors (not 429/5xx)
        console.warn(`[LLM] Attempt ${attempt} for model ${model} encountered error: ${err.message || err}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  }

  throw new Error(`All LLM models in the fallback chain failed. Last error: ${lastError ? (lastError.message || lastError) : "unknown"}`);
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
1. Provide a highly specific, scientific search query that will be used to find a real, highly cited academic paper on Semantic Scholar. Do not include search operators like AND/OR; use natural research queries (e.g. "perovskite solar cells efficiency limits review 2022").
2. Identify a real, seminal, highly cited academic paper or textbook matching this exact topic. Provide its actual details (Title, Authors, Year, Citation Count, and its real working DOI). DO NOT make up fake DOIs. The DOI must be authentic so that it can be resolved on Sci-Hub (e.g. "10.1016/j.ensm.2021.04.012" or "10.1109/CVPR.2016.90").

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
        "doi": "Real working DOI of this paper (essential for retrieving from Sci-Hub, e.g. 10.xxxx/xxxxx)"
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

  const text = await callLlm([{ role: "user", content: prompt }], undefined, true);
  const data = JSON.parse(text);
  return data.questions;
}

/**
 * Generates a comprehensive study guide/milestone summary based on a paper's full text or abstract metadata.
 */
export async function generatePaperSummary(
  title: string,
  abstract: string,
  fullText?: string,
  nodeTitle?: string,
  nodeDescription?: string
): Promise<string> {
  let prompt = "";
  if (fullText && fullText.trim().length > 100) {
    prompt = `
You are an expert academic tutor and scientific researcher. Your task is to write a detailed, highly structured Milestone Study Guide (AI Summary) based on the provided full-text contents of the paper: "${title}".
This guide is specifically designed for a student studying the milestone: "${nodeTitle || title}" (${nodeDescription || ""}).

Here are the extracted text contents of the research paper:
--- START OF PAPER TEXT ---
${fullText}
--- END OF PAPER TEXT ---

Write a comprehensive, detailed Study Guide in Markdown.
Structure your guide with the following sections:
## ## MILESTONE GUIDE: ${nodeTitle?.toUpperCase() || title.toUpperCase()}

### 1. Milestone Concept Alignment
Explain how this research paper directly connects to the skills and concepts of the milestone: "${nodeTitle || title}". What is the core relevance?

### 2. Deep Dive Methodology & Findings
Based on the full-text, describe the experimental setup, mathematical models, key datasets, or core methodologies used by the authors. What were the specific, quantified outcomes?

### 3. Essential Takeaways
List 3-5 critical, non-obvious scientific facts, equations, constants, or design principles from the paper that the student *must* understand to pass this milestone.

### 4. Limitations & Challenges
What are the limitations, edge cases, bottlenecks, or future research directions discussed in the paper?

Write the guide in clear, concise, academic, yet engaging language. Use standard markdown. Avoid generic summaries; be highly specific to the actual text.
`;
  } else {
    prompt = `
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
`;
  }

  return await callLlm([{ role: "user", content: prompt }], undefined, false);
}
