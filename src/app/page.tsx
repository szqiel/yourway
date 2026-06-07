"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Compass, Shield, Sparkle } from "@phosphor-icons/react";
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

  // Fetch roadmap metadata from Supabase
  const fetchRoadmapHistory = async (ids: string[]) => {
    try {
      const { data, error: fetchError } = await supabase
        .from("roadmaps")
        .select("id, topic, created_at")
        .in("id", ids);

      if (fetchError) throw fetchError;

      if (data) {
        // Fetch completion rates for each roadmap
        const enrichedHistory = await Promise.all(
          data.map(async (item) => {
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
          })
        );

        // Sort by created date descending
        enrichedHistory.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setHistory(enrichedHistory);
      }
    } catch (err) {
      console.error("Error loading roadmap history:", err);
    }
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
    <div className="flex-1 w-full min-h-[100dvh] pixel-grid bg-bg-dark text-foreground px-6 md:px-12 py-16 flex flex-col justify-between max-w-[1400px] mx-auto select-none">
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

        {/* Human-Verified badge */}
        <div className="flex items-center gap-2 bg-[#1e2e28] border-2 border-black px-3 py-1 text-retro-green font-pixel text-sm uppercase font-bold rounded">
          <Shield size={16} weight="fill" />
          100% Peer-Reviewed
        </div>
      </header>

      {/* Main Asymmetric Split Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-24">
        {/* Left Section: Hero & Prompt Generator (7 cols) */}
        <section className="lg:col-span-7 flex flex-col justify-center animate-scroll-entry">
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
              {history.length} slots active
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
          ) : history.length === 0 ? (
            /* Typographic Empty State */
            <div className="border-[3px] border-dashed border-black/40 rounded-lg p-8 text-center bg-[#171a21]/50 flex flex-col items-center justify-center py-16">
              <Compass size={36} className="text-text-muted/40 mb-4" />
              <h3 className="font-pixel text-xl text-white mb-2">No active journeys</h3>
              <p className="text-xs font-mono text-text-muted max-w-[32ch]">
                Input a STEM research topic to create your first learning skill tree.
              </p>
            </div>
          ) : (
            /* Roadmap list */
            <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => router.push(`/roadmap/${item.id}`)}
                  className="active-press rpg-panel p-5 cursor-pointer border-black/10 hover:border-retro-amber flex flex-col justify-between h-28 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-pixel text-xl text-white leading-tight group-hover:text-retro-cyan transition-colors">
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

      {/* Footer Info */}
      <footer className="border-t-3 border-black pt-6 flex flex-col sm:flex-row justify-between items-center text-text-muted font-mono text-[10px]">
        <span>© 2026 YourWay. This is the Way.</span>
        <span className="mt-2 sm:mt-0">
          Powered by Gemini 2.5 Pro & Semantic Scholar API
        </span>
      </footer>
    </div>
  );
}
