"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CircleNotch } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { RoadmapNode } from "@/lib/gemini";
import RoadmapVisualizer from "@/components/RoadmapVisualizer";
import NodeDrawer from "@/components/NodeDrawer";
import Navbar from "@/components/Navbar";

interface ProgressState {
  node_id: string;
  status: "locked" | "unlocked" | "completed";
  quiz_score?: number;
}

// Static mockup dataset for Offline Demo Mode
const DEMO_NODES: RoadmapNode[] = [
  {
    id: "node-1",
    title: "Sodium Chemistry Basics",
    description: "Foundational chemistry of sodium cells compared to lithium-ion batteries.",
    tier: "foundational",
    prerequisites: [],
    searchQuery: "sodium battery chemistry review",
    paperId: "demo-paper-1",
  },
  {
    id: "node-2",
    title: "Solid Polymer Electrolytes",
    description: "Developing safe polymer solid-state materials for room temperature conductivity.",
    tier: "intermediate",
    prerequisites: ["node-1"],
    searchQuery: "solid polymer electrolytes sodium",
    paperId: "demo-paper-2",
  },
  {
    id: "node-3",
    title: "Ceramic Solid Electrolytes",
    description: "Investigating NASICON-type crystalline materials and grain boundaries.",
    tier: "intermediate",
    prerequisites: ["node-1"],
    searchQuery: "nasicon type solid electrolyte",
    paperId: "demo-paper-3",
  },
  {
    id: "node-4",
    title: "SEI Layer Passivation",
    description: "Mitigating sodium metal dendrite growths at the solid interphase.",
    tier: "advanced",
    prerequisites: ["node-2", "node-3"],
    searchQuery: "sodium dendrite prevention sei",
    paperId: "demo-paper-4",
  },
];

const DEMO_INITIAL_PROGRESS: ProgressState[] = [
  { node_id: "node-1", status: "completed", quiz_score: 3 },
  { node_id: "node-2", status: "unlocked" },
  { node_id: "node-3", status: "unlocked" },
  { node_id: "node-4", status: "locked" },
];

export default function RoadmapWorkspace() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [roadmap, setRoadmap] = useState<any>(null);
  const [nodes, setNodes] = useState<RoadmapNode[]>([]);
  const [progress, setProgress] = useState<ProgressState[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestSessionId, setGuestSessionId] = useState("");

  // Retrieve Guest Session ID and load data
  useEffect(() => {
    const sessionId = localStorage.getItem("yourway_guest_session_id") || "";
    setGuestSessionId(sessionId);

    if (id) {
      if (id === "demo") {
        loadDemoWorkspace();
      } else {
        loadRoadmapData(id, sessionId);
      }
    }
  }, [id]);

  // Load local static mockup workspace for demo
  const loadDemoWorkspace = () => {
    setLoading(true);
    setError(null);
    setRoadmap({ topic: "Solid-State Sodium Batteries (Demo)" });
    setNodes(DEMO_NODES);
    setProgress(DEMO_INITIAL_PROGRESS);
    setLoading(false);
  };

  const loadRoadmapData = async (roadmapId: string, sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      if (roadmapId.startsWith("local-")) {
        const savedRoadmapRaw = localStorage.getItem(`yourway_local_roadmap_${roadmapId}`);
        if (!savedRoadmapRaw) {
          throw new Error("Local learning path (roadmap) not found.");
        }
        const roadmapData = JSON.parse(savedRoadmapRaw);
        setRoadmap(roadmapData);
        setNodes(roadmapData.nodes);

        const savedProgressRaw = localStorage.getItem(`yourway_local_progress_${roadmapId}`);
        const progressData = savedProgressRaw ? JSON.parse(savedProgressRaw) : [];
        setProgress(progressData);
      } else {
        // 1. Fetch roadmap structure
        const { data: roadmapData, error: roadmapError } = await supabase
          .from("roadmaps")
          .select("*")
          .eq("id", roadmapId)
          .single();

        if (roadmapError || !roadmapData) {
          throw new Error("Learning path (roadmap) not found.");
        }

        setRoadmap(roadmapData);
        setNodes(roadmapData.nodes);

        // 2. Fetch progress states
        const progressQuery = supabase
          .from("user_progress")
          .select("node_id, status, quiz_score")
          .eq("roadmap_id", roadmapId);

        // Query by guest session
        if (sessionId) {
          progressQuery.eq("guest_session_id", sessionId);
        }

        const { data: progressData, error: progressError } = await progressQuery;
        if (progressError) throw progressError;

        setProgress(progressData || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load workspace.");
    } finally {
      setLoading(false);
    }
  };

  // Callback to receive progress updates from drawer quiz submissions
  const handleProgressUpdate = (updatedProgress: ProgressState[]) => {
    setProgress(updatedProgress);
  };

  // Find active selected node details
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedProgress = progress.find((p) => p.node_id === selectedNodeId);

  return (
    <div className="flex-1 w-full min-h-[100dvh] bg-transparent text-foreground px-6 md:px-12 py-16 flex flex-col justify-between max-w-[1400px] mx-auto relative select-none animate-scroll-entry">
      <div className="flex flex-col gap-8 w-full">
        {/* Navigation HUD */}
        <Navbar />

        {/* Workspace Header HUD */}
        <header className="flex items-center justify-between border-[3px] border-black p-4 bg-panel-dark shadow-[4px_4px_0_0_#0c0d10] rounded-md">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push("/dashboard")}
              className="retro-btn text-xs py-1.5 px-3 flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft size={14} className="mr-1 inline" />
              Codex
            </button>
            <div>
              <span className="font-pixel text-sm uppercase tracking-wider text-retro-cyan block leading-none font-bold">
                THE WAY PATHWAY {id === "demo" && "[DEMO MODE]"}
              </span>
              <h1 className="font-pixel text-2xl leading-none text-white uppercase mt-1">
                {loading ? "Loading scientific path..." : roadmap?.topic}
              </h1>
            </div>
          </div>
        </header>

        {/* Main Workspace Area */}
        <main className="flex-1 w-full flex flex-col gap-6 relative">
          {loading ? (
            <div className="flex-1 h-[450px] border-[3px] border-black border-dashed rounded bg-[#171a21]/50 flex flex-col items-center justify-center gap-3">
              <CircleNotch size={28} className="animate-spin text-text-muted" />
              <span className="font-pixel text-lg text-text-muted">Loading scientific tree...</span>
            </div>
          ) : error ? (
            <div className="flex-1 h-[450px] border-3 border-retro-red border-dashed rounded bg-retro-red/5 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="font-mono text-sm text-retro-red">Error: {error}</p>
              <button
                onClick={() => router.push("/dashboard")}
                className="retro-btn text-xs py-2 px-4"
              >
                Return to Codex
              </button>
            </div>
          ) : (
            <div className="w-full relative">
              {/* SVG Visualizer Tree */}
              <RoadmapVisualizer
                nodes={nodes}
                progress={progress}
                selectedNodeId={selectedNodeId}
                onNodeSelect={(nodeId) => setSelectedNodeId(nodeId)}
              />

              {/* Slide-out Drawer Panel overlay */}
              {selectedNode && (
                <NodeDrawer
                  roadmapId={id}
                  nodeId={selectedNode.id}
                  nodeTitle={selectedNode.title}
                  nodeTier={selectedNode.tier}
                  paperId={selectedNode.paperId || ""}
                  status={selectedProgress?.status || "locked"}
                  quizScore={selectedProgress?.quiz_score}
                  guestSessionId={guestSessionId}
                  onClose={() => setSelectedNodeId(null)}
                  onProgressUpdate={handleProgressUpdate}
                  embeddedPaper={(selectedNode as any).paper}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Footer Info (Copyright Centered, powered by and instructions removed) */}
      <footer className="border-t-3 border-black pt-6 mt-12 flex justify-center text-text-muted font-mono text-[10px]">
        <span>© 2026 YourWay. This is the Way.</span>
      </footer>
    </div>
  );
}
