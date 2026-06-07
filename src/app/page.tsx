"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Compass, Sparkle } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";

interface RoadmapHistoryItem {
  id: string;
  topic: string;
  created_at: string;
  completionRate?: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RoadmapHistoryItem[]>([]);
  const [guestSessionId, setGuestSessionId] = useState("");

  // Initialize Guest Session ID and load history on mount
  useEffect(() => {
    let sessionId = localStorage.getItem("yourway_guest_session_id");
    if (!sessionId) {
      sessionId = `guest_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem("yourway_guest_session_id", sessionId);
    }
    setGuestSessionId(sessionId);

    // Retrieve saved roadmaps from local storage
    const savedIdsRaw = localStorage.getItem("yourway_roadmap_ids");
    const savedIds: string[] = savedIdsRaw ? JSON.parse(savedIdsRaw) : [];

    if (savedIds.length > 0) {
      fetchRoadmapHistory(savedIds);
    }
  }, []);

  // Fetch roadmap metadata from Supabase / LocalStorage
  const fetchRoadmapHistory = async (ids: string[]) => {
    const localIds = ids.filter((id) => id.startsWith("local-"));
    const cloudIds = ids.filter((id) => !id.startsWith("local-"));

    const historyItems: RoadmapHistoryItem[] = [];

    // 1. Load Local Roadmaps from localStorage
    localIds.forEach((id) => {
      try {
        const savedRoadmapRaw = localStorage.getItem(`yourway_local_roadmap_${id}`);
        if (savedRoadmapRaw) {
          const saved = JSON.parse(savedRoadmapRaw);
          const savedProgressRaw = localStorage.getItem(`yourway_local_progress_${id}`);
          const progress = savedProgressRaw ? JSON.parse(savedProgressRaw) : [];
          
          let rate = 0;
          if (progress.length > 0) {
            const completed = progress.filter((p: any) => p.status === "completed").length;
            rate = Math.round((completed / progress.length) * 100);
          }

          historyItems.push({
            id,
            topic: saved.topic,
            created_at: saved.created_at || new Date().toISOString(),
            completionRate: rate,
          });
        }
      } catch (e) {
        console.error("Failed to parse local roadmap:", id, e);
      }
    });

    // 2. Load Cloud Roadmaps from Supabase
    if (cloudIds.length > 0) {
      try {
        const { data, error: fetchError } = await supabase
          .from("roadmaps")
          .select("id, topic, created_at")
          .in("id", cloudIds);

        if (fetchError) throw fetchError;

        if (data) {
          const enrichedHistory = await Promise.all(
            data.map(async (item) => {
              try {
                const { data: progress } = await supabase
                  .from("user_progress")
                  .select("status")
                  .eq("roadmap_id", item.id);

                let rate = 0;
                if (progress && progress.length > 0) {
                  const completed = progress.filter((p) => p.status === "completed").length;
                  rate = Math.round((completed / progress.length) * 100);
                }

                return {
                  id: item.id,
                  topic: item.topic,
                  created_at: item.created_at,
                  completionRate: rate,
                };
              } catch (e) {
                return {
                  id: item.id,
                  topic: item.topic,
                  created_at: item.created_at,
                  completionRate: 0,
                };
              }
            })
          );
          historyItems.push(...enrichedHistory);
        }
      } catch (err) {
        console.error("Error loading cloud roadmap history:", err);
      }
    }

    // Sort by created date descending
    historyItems.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setHistory(historyItems);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          guestSessionId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      // Save to localStorage if it's a local roadmap (Supabase bypassed)
      if (data.roadmapId.startsWith("local-")) {
        const localRoadmap = {
          id: data.roadmapId,
          topic: data.topic,
          nodes: data.nodes,
          created_at: new Date().toISOString(),
        };
        localStorage.setItem(`yourway_local_roadmap_${data.roadmapId}`, JSON.stringify(localRoadmap));

        // Initialize progress for local nodes
        const localProgress = data.nodes.map((node: any) => ({
          node_id: node.id,
          status: node.tier === "foundational" ? "unlocked" : "locked",
        }));
        localStorage.setItem(`yourway_local_progress_${data.roadmapId}`, JSON.stringify(localProgress));
      }

      // Save new roadmap ID to history in localStorage
      const savedIdsRaw = localStorage.getItem("yourway_roadmap_ids");
      const savedIds: string[] = savedIdsRaw ? JSON.parse(savedIdsRaw) : [];
      if (!savedIds.includes(data.roadmapId)) {
        savedIds.push(data.roadmapId);
        localStorage.setItem("yourway_roadmap_ids", JSON.stringify(savedIds));
      }

      // Navigate to the roadmap visualizer workspace
      router.push(`/roadmap/${data.roadmapId}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full min-h-[100dvh] bg-transparent text-foreground px-6 md:px-12 py-16 flex flex-col justify-between max-w-[1400px] mx-auto select-none animate-scroll-entry">
      {/* Top HUD bar */}
      <header className="flex items-center justify-between border-[3px] border-black p-4 bg-panel-dark shadow-[4px_4px_0_0_#0c0d10] rounded-md mb-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-black flex items-center justify-center font-mono font-black text-sm bg-retro-amber text-black shadow-[2px_2px_0_0_#000]">
            Y
          </div>
          <span className="font-pixel text-xl tracking-wider text-retro-cyan uppercase font-bold">
            YOURWAY // THE ROADMAP FORGER
          </span>
        </div>
      </header>

      {/* Main Asymmetric Split Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-24">
        {/* Left Section: Hero & Prompt Generator (7 cols) */}
        <section className="lg:col-span-7 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 text-retro-amber font-pixel text-lg uppercase mb-2">
            <Sparkle size={18} weight="fill" />
            Establish spatial learning paths
          </div>
          <h1 className="font-pixel text-5xl sm:text-7xl leading-none tracking-tight text-white mb-6 uppercase">
            Forge your <span className="text-retro-amber">Own Path</span>.
          </h1>
          <p className="text-sm text-text-muted leading-relaxed max-w-[55ch] mb-8 font-mono">
            The internet is decaying into AI-generated tutorials and model-collapsed noise. 
            YourWay safeguards academic discovery by anchoring study paths exclusively in 
            human-validated, peer-reviewed scientific literature.
          </p>

          <form onSubmit={handleGenerate} className="flex flex-col gap-4 max-w-[550px]">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a STEM topic (e.g. Sodium Battery Electrolytes)..."
                disabled={loading}
                className="flex-1 px-4 py-3 bg-[#171a21] border-[3px] border-black rounded text-sm text-white placeholder:text-text-muted/50 focus:outline-none focus:border-retro-cyan transition-colors"
              />
              <button
                type="submit"
                disabled={loading}
                className="retro-btn text-base py-3 sm:py-0 disabled:opacity-50 px-8"
              >
                {loading ? "Generating..." : "Forge Path"}
                {!loading && <ArrowRight size={16} className="ml-2 inline" />}
              </button>
            </div>
            {error && (
              <span className="font-mono text-xs text-retro-red bg-retro-red/10 border-2 border-retro-red px-3 py-2 rounded">
                [GoogleGenerativeAI Error]: {error}
              </span>
            )}
          </form>
        </section>

        {/* Right Section: Saved Codex History (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-6 w-full">
          <div className="flex items-center justify-between border-b-3 border-black pb-2">
            <span className="font-pixel text-xl uppercase text-retro-amber font-bold">
              The Codex (Active Saves)
            </span>
            <span className="font-mono text-[10px] text-text-muted bg-[#1c1f26] border border-border-slate px-2 py-0.5 rounded">
              {history.length + 1} slots active
            </span>
          </div>

          {loading ? (
            /* Loading skeletons during generation */
            <div className="flex flex-col gap-4">
              <div className="h-28 bg-[#1c1f26] border-[3px] border-black rounded p-6 animate-pulse">
                <div className="h-4 bg-black/40 w-3/4 mb-4"></div>
                <div className="h-3 bg-black/40 w-1/4"></div>
              </div>
            </div>
          ) : (
            /* Roadmap list */
            <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2">
              {/* Static Pinned Interactive Demo Slot */}
              <div
                onClick={() => router.push("/roadmap/demo")}
                className="active-press rpg-panel p-5 cursor-pointer border-retro-amber/80 border-[3px] hover:border-retro-cyan flex flex-col justify-between h-28 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="font-pixel text-[11px] text-retro-amber tracking-wider uppercase font-bold block leading-none mb-1">
                      [ Pinned Offline Demo ]
                    </span>
                    <h3 className="font-pixel text-xl text-white leading-tight group-hover:text-retro-cyan transition-colors uppercase">
                      Solid-State Sodium Batteries
                    </h3>
                  </div>
                  <Compass size={20} className="text-retro-amber group-hover:text-retro-cyan" />
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex-1 retro-progress-container">
                    <div
                      className="retro-progress-bar"
                      style={{ width: "25%" }}
                    ></div>
                  </div>
                  <span className="font-pixel text-sm text-retro-green font-bold min-w-[35px] text-right">
                    25%
                  </span>
                </div>
              </div>

              {/* Dynamic DB Roadmap Slots */}
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => router.push(`/roadmap/${item.id}`)}
                  className="active-press rpg-panel p-5 cursor-pointer border-black/10 hover:border-retro-amber flex flex-col justify-between h-28 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-pixel text-xl text-white leading-tight group-hover:text-retro-cyan transition-colors uppercase">
                      {item.topic}
                    </h3>
                    <BookOpen size={20} className="text-text-muted group-hover:text-retro-cyan" />
                  </div>
                  
                  {/* Energy/Health style Progress Bar */}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex-1 retro-progress-container">
                      <div
                        className="retro-progress-bar"
                        style={{ width: `${item.completionRate || 0}%` }}
                      ></div>
                    </div>
                    <span className="font-pixel text-sm text-retro-green font-bold min-w-[35px] text-right">
                      {item.completionRate || 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer Info (Copyright Centered, Powered By Removed) */}
      <footer className="border-t-3 border-black pt-6 flex justify-center text-text-muted font-mono text-[10px]">
        <span>© 2026 YourWay. This is the Way.</span>
      </footer>
    </div>
  );
}
