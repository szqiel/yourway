"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CircleNotch } from "@phosphor-icons/react";
import RoadmapVisualizer from "@/components/RoadmapVisualizer";
import NodeDrawer from "@/components/NodeDrawer";
import Navbar from "@/components/Navbar";
import { MOCK_ROADMAPS } from "@/lib/mockData";

interface ProgressState {
  node_id: string;
  status: "locked" | "unlocked" | "completed";
  quiz_score?: number;
}

export default function RoadmapWorkspace() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [roadmap, setRoadmap] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [progress, setProgress] = useState<ProgressState[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadRoadmapData(id);
    }
  }, [id]);

  const loadRoadmapData = async (roadmapId: string) => {
    setLoading(true);
    setError(null);
    try {
      const mockRoadmap = MOCK_ROADMAPS[roadmapId];
      if (!mockRoadmap) {
        throw new Error("Offline Demo learning path not found.");
      }

      setRoadmap({ topic: mockRoadmap.topic });
      setNodes(mockRoadmap.nodes);

      // Load progress from local storage
      const savedProgressRaw = localStorage.getItem(`yourway_demo_progress_${roadmapId}`);
      if (savedProgressRaw) {
        setProgress(JSON.parse(savedProgressRaw));
      } else {
        // Initialize default progress for demo (first node unlocked)
        const initialProgress: ProgressState[] = mockRoadmap.nodes.map((n, idx) => ({
          node_id: n.id,
          status: idx === 0 ? "unlocked" : "locked"
        }));
        setProgress(initialProgress);
        localStorage.setItem(`yourway_demo_progress_${roadmapId}`, JSON.stringify(initialProgress));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load offline workspace.");
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
                THE WAY PATHWAY [OFFLINE DEMO]
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
              <span className="font-pixel text-lg text-text-muted">Loading offline tree...</span>
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
                  nodeDescription={selectedNode.description}
                  nodeTier={selectedNode.tier}
                  paperId={selectedNode.paperId || ""}
                  status={selectedProgress?.status || "locked"}
                  quizScore={selectedProgress?.quiz_score}
                  onClose={() => setSelectedNodeId(null)}
                  onProgressUpdate={handleProgressUpdate}
                  embeddedPaper={selectedNode.paper}
                  allNodes={nodes} // pass nodes to compute unlocks
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Footer Info */}
      <footer className="border-t-3 border-black pt-6 mt-12 flex justify-center text-text-muted font-mono text-[10px]">
        <span>© 2026 YourWay. Offline Prototype Demo.</span>
      </footer>
    </div>
  );
}
