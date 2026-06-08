import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateRoadmapStructure, RoadmapNode } from "@/lib/llm";
import { fetchPaperFromOpenAlex } from "@/lib/openalex";

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
    const { topic, userId, guestSessionId } = body;

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const hasSupabase = isSupabaseConfigured();

    // 1. Get Client IP Address for Rate Limiting
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";

    // 2. Perform Rate Limiting check if user is not logged in (is a guest) and database is available
    if (hasSupabase && !userId) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await supabase
        .from("roadmaps")
        .select("id", { count: "exact", head: true })
        .eq("user_ip", ip)
        .gt("created_at", oneHourAgo);

      if (countError) {
        console.error("Rate limit check database error:", countError);
      }

      if (count && count >= 3) {
        return NextResponse.json(
          {
            error:
              "Trial limit exceeded. Guest sessions are limited to 3 roadmaps per hour. Secure your Codex to bypass this limit.",
          },
          { status: 429 }
        );
      }
    }

    // 3. Generate the structural roadmap (Skill Tree nodes) via AI
    const rawNodes = await generateRoadmapStructure(topic);

    // 4. Fetch Open Access Paper metadata for each node sequentially using OpenAlex to avoid rate-limiting
    const enrichedNodes = [];
    for (const node of rawNodes) {
      const paper = await fetchPaperFromOpenAlex(node.searchQuery, node.title, node.description, node.suggestedPaper);

      if (hasSupabase) {
        // Cache paper metadata in Supabase cached_papers
        const { error: cacheError } = await supabase.from("cached_papers").upsert(
          {
            id: paper.id,
            title: paper.title,
            authors: paper.authors,
            abstract: paper.abstract,
            year: paper.year,
            citation_count: paper.citationCount,
            external_pdf_url: paper.oaUrl,
            doi: paper.doi,
          },
          { onConflict: "id" }
        );

        if (cacheError) {
          console.error("Failed to cache paper in database:", cacheError);
        }
      }

      // Associate the OpenAlex Paper ID and embed full paper metadata to the roadmap node
      enrichedNodes.push({
        ...node,
        paperId: paper.id,
        paper: {
          id: paper.id,
          title: paper.title,
          authors: paper.authors,
          abstract: paper.abstract,
          year: paper.year,
          citationCount: paper.citationCount,
          doi: paper.doi,
          oaUrl: paper.oaUrl, // Direct, legal Open Access URL
        },
      });
      
      // Wait a short delay to respect polite pool limits
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // 5. Save the roadmap (Store in DB if available, else return local ID)
    if (!hasSupabase) {
      const localId = `local-${Math.random().toString(36).substring(2, 15)}`;
      return NextResponse.json({
        roadmapId: localId,
        topic,
        nodes: enrichedNodes,
        isLocal: true,
      });
    }

    const { data: roadmapData, error: roadmapError } = await supabase
      .from("roadmaps")
      .insert({
        user_id: userId || null,
        guest_session_id: guestSessionId || null,
        user_ip: ip,
        topic,
        nodes: enrichedNodes,
      })
      .select()
      .single();

    if (roadmapError) {
      throw new Error(`Failed to save roadmap to database: ${roadmapError.message}`);
    }

    // 6. Initialize progress tracking states for each node
    // Foundational tier nodes are immediately 'unlocked', others are 'locked'
    const progressInserts = enrichedNodes.map((node) => ({
      user_id: userId || null,
      guest_session_id: guestSessionId || null,
      roadmap_id: roadmapData.id,
      node_id: node.id,
      status: node.tier === "foundational" ? "unlocked" : "locked",
    }));

    const { error: progressError } = await supabase
      .from("user_progress")
      .insert(progressInserts);

    if (progressError) {
      console.error("Failed to initialize user progress:", progressError);
    }

    return NextResponse.json({
      roadmapId: roadmapData.id,
      topic: roadmapData.topic,
      nodes: enrichedNodes,
    });
  } catch (error: any) {
    console.error("Roadmap generation error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during roadmap generation." },
      { status: 500 }
    );
  }
}
