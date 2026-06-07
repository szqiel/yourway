import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roadmapId, nodeId, userId, guestSessionId, score } = body;

    if (!roadmapId || !nodeId) {
      return NextResponse.json(
        { error: "roadmapId and nodeId are required" },
        { status: 400 }
      );
    }

    if (!userId && !guestSessionId) {
      return NextResponse.json(
        { error: "userId or guestSessionId is required" },
        { status: 400 }
      );
    }

    // 1. Mark current node as completed
    const matchQuery = supabase
      .from("user_progress")
      .select("id")
      .eq("roadmap_id", roadmapId)
      .eq("node_id", nodeId);

    if (userId) {
      matchQuery.eq("user_id", userId);
    } else {
      matchQuery.eq("guest_session_id", guestSessionId);
    }

    const { data: existingProgress, error: fetchError } = await matchQuery;
    if (fetchError) {
      throw new Error(`Failed to query progress: ${fetchError.message}`);
    }

    if (existingProgress && existingProgress.length > 0) {
      // Update existing progress record
      const { error: updateError } = await supabase
        .from("user_progress")
        .update({
          status: "completed",
          quiz_score: score,
          completed_at: new Date().toISOString(),
        })
        .eq("id", existingProgress[0].id);

      if (updateError) throw updateError;
    } else {
      // Insert new progress record (should not happen normally since route initializes them)
      const { error: insertError } = await supabase.from("user_progress").insert({
        user_id: userId || null,
        guest_session_id: guestSessionId || null,
        roadmap_id: roadmapId,
        node_id: nodeId,
        status: "completed",
        quiz_score: score,
        completed_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;
    }

    // 2. Fetch the roadmap layout nodes to check child dependencies
    const { data: roadmap, error: roadmapError } = await supabase
      .from("roadmaps")
      .select("nodes")
      .eq("id", roadmapId)
      .single();

    if (roadmapError || !roadmap) {
      throw new Error("Roadmap not found");
    }

    const nodes: any[] = roadmap.nodes;

    // 3. Fetch all progress entries for this session to build a completed checklist
    const progressQuery = supabase
      .from("user_progress")
      .select("node_id, status")
      .eq("roadmap_id", roadmapId);

    if (userId) {
      progressQuery.eq("user_id", userId);
    } else {
      progressQuery.eq("guest_session_id", guestSessionId);
    }

    const { data: allProgress, error: progressError } = await progressQuery;
    if (progressError) throw progressError;

    // Build a set of completed node IDs
    const completedNodeIds = new Set<string>();
    allProgress.forEach((p) => {
      if (p.status === "completed") {
        completedNodeIds.add(p.node_id);
      }
    });

    // 4. Evaluate Locked nodes to see if their prerequisites are fully met
    for (const node of nodes) {
      const nodeProgress = allProgress.find((p) => p.node_id === node.id);
      const currentStatus = nodeProgress?.status || "locked";

      if (currentStatus === "locked") {
        const prerequisites = node.prerequisites || [];
        const allPrereqsMet =
          prerequisites.length > 0 &&
          prerequisites.every((prereqId: string) => completedNodeIds.has(prereqId));

        if (allPrereqsMet) {
          // Unlock this node!
          if (nodeProgress) {
            // Update in DB
            const { error: unlockUpdateError } = await supabase
              .from("user_progress")
              .update({ status: "unlocked" })
              .eq("roadmap_id", roadmapId)
              .eq("node_id", node.id)
              .eq(userId ? "user_id" : "guest_session_id", userId || guestSessionId);

            if (unlockUpdateError) console.error("Unlock update failed:", unlockUpdateError);
          }
        }
      }
    }

    // 5. Query and return the newly refreshed progress states
    const finalQuery = supabase
      .from("user_progress")
      .select("node_id, status, quiz_score")
      .eq("roadmap_id", roadmapId);

    if (userId) {
      finalQuery.eq("user_id", userId);
    } else {
      finalQuery.eq("guest_session_id", guestSessionId);
    }

    const { data: finalProgress, error: finalProgressError } = await finalQuery;
    if (finalProgressError) throw finalProgressError;

    return NextResponse.json({ progress: finalProgress });
  } catch (error: any) {
    console.error("Node validation error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during node validation." },
      { status: 500 }
    );
  }
}
