"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Compass, Trophy, Plus, Trash } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

interface RoadmapHistoryItem {
  id: string;
  topic: string;
  created_at: string;
  completionRate?: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [history, setHistory] = useState<RoadmapHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRoadmaps: 0,
    averageProgress: 0,
    completedPaths: 0,
  });

  useEffect(() => {
    let sessionId = localStorage.getItem("yourway_guest_session_id");
    if (!sessionId) {
      sessionId = `guest_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem("yourway_guest_session_id", sessionId);
    }

    const savedIdsRaw = localStorage.getItem("yourway_roadmap_ids");
    const savedIds: string[] = savedIdsRaw ? JSON.parse(savedIdsRaw) : [];

    fetchRoadmapHistory(savedIds);
  }, []);

  const fetchRoadmapHistory = async (ids: string[]) => {
    setLoading(true);
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

    // Calculate Dashboard Stats
    const total = historyItems.length;
    let avg = 0;
    let completedCount = 0;

    if (total > 0) {
      const sum = historyItems.reduce((acc, curr) => acc + (curr.completionRate || 0), 0);
      avg = Math.round(sum / total);
      completedCount = historyItems.filter((h) => h.completionRate === 100).length;
    }

    setStats({
      totalRoadmaps: total,
      averageProgress: avg,
      completedPaths: completedCount,
    });
    setLoading(false);
  };

  const handleDeleteRoadmap = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigating to the roadmap workspace
    if (!confirm("Are you sure you want to delete this roadmap from your Codex?")) return;

    try {
      if (id.startsWith("local-")) {
        // 1. Delete from Local Storage
        localStorage.removeItem(`yourway_local_roadmap_${id}`);
        localStorage.removeItem(`yourway_local_progress_${id}`);
        
        const savedIdsRaw = localStorage.getItem("yourway_roadmap_ids");
        if (savedIdsRaw) {
          let savedIds: string[] = JSON.parse(savedIdsRaw);
          savedIds = savedIds.filter((cid) => cid !== id);
          localStorage.setItem("yourway_roadmap_ids", JSON.stringify(savedIds));
        }
      } else {
        // 2. Delete from Supabase
        const { error } = await supabase.from("roadmaps").delete().eq("id", id);
        if (error) throw error;

        // Also remove ID from local history cache
        const savedIdsRaw = localStorage.getItem("yourway_roadmap_ids");
        if (savedIdsRaw) {
          let savedIds: string[] = JSON.parse(savedIdsRaw);
          savedIds = savedIds.filter((cid) => cid !== id);
          localStorage.setItem("yourway_roadmap_ids", JSON.stringify(savedIds));
        }
      }

      // 3. Update local state
      const remainingHistory = history.filter(item => item.id !== id);
      setHistory(remainingHistory);

      // Re-calculate Stats
      const total = remainingHistory.length;
      let avg = 0;
      let completedCount = 0;

      if (total > 0) {
        const sum = remainingHistory.reduce((acc, curr) => acc + (curr.completionRate || 0), 0);
        avg = Math.round(sum / total);
        completedCount = remainingHistory.filter((h) => h.completionRate === 100).length;
      }

      setStats({
        totalRoadmaps: total,
        averageProgress: avg,
        completedPaths: completedCount,
      });

    } catch (err: any) {
      console.error("Failed to delete roadmap:", err);
      alert(`Failed to delete roadmap: ${err.message || err}`);
    }
  };

  return (
    <div className="flex-1 w-full min-h-[100dvh] bg-transparent text-foreground px-6 md:px-12 py-16 flex flex-col justify-between max-w-[1400px] mx-auto select-none animate-scroll-entry">
      <div className="flex flex-col gap-12 w-full">
        {/* Navigation HUD */}
        <Navbar />

        {/* Overview Stats Row */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rpg-panel p-5 flex flex-col justify-between">
            <span className="font-pixel text-xs text-text-muted uppercase font-bold tracking-wider">
              Codex Volume
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="font-pixel text-4xl text-retro-cyan font-black">
                {stats.totalRoadmaps}
              </span>
              <span className="font-mono text-[10px] text-text-muted">Paths Forged</span>
            </div>
          </div>
          <div className="rpg-panel p-5 flex flex-col justify-between">
            <span className="font-pixel text-xs text-text-muted uppercase font-bold tracking-wider">
              Global Sync Progress
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="font-pixel text-4xl text-retro-amber font-black">
                {stats.averageProgress}%
              </span>
              <span className="font-mono text-[10px] text-text-muted">Avg Completion</span>
            </div>
          </div>
          <div className="rpg-panel p-5 flex flex-col justify-between">
            <span className="font-pixel text-xs text-text-muted uppercase font-bold tracking-wider">
              Mastery Achieved
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="font-pixel text-4xl text-retro-green font-black">
                {stats.completedPaths}
              </span>
              <span className="font-mono text-[10px] text-text-muted">Completed (100%)</span>
            </div>
          </div>
        </section>

        {/* Active Saves Section */}
        <main className="flex flex-col gap-6 w-full">
          <div className="flex items-center justify-between border-b-3 border-black pb-2">
            <span className="font-pixel text-2xl uppercase text-white font-bold">
              The Codex Saves
            </span>
            <button
              onClick={() => router.push("/generate")}
              className="retro-btn text-xs py-1 px-3 flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Forge New</span>
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-28 bg-[#1c1f26] border-[3px] border-black rounded p-6 animate-pulse"
                >
                  <div className="h-4 bg-black/40 w-3/4 mb-4"></div>
                  <div className="h-3 bg-black/40 w-1/4"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <Trophy size={18} className="text-retro-amber group-hover:text-retro-cyan" />
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex-1 retro-progress-container">
                    <div className="retro-progress-bar" style={{ width: "25%" }}></div>
                  </div>
                  <span className="font-pixel text-sm text-retro-green font-bold min-w-[35px] text-right">
                    25%
                  </span>
                </div>
              </div>

              {/* Dynamic DB/Local Roadmap Slots */}
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => router.push(`/roadmap/${item.id}`)}
                  className="active-press rpg-panel p-5 cursor-pointer border-black/10 hover:border-retro-amber flex flex-col justify-between h-28 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-pixel text-xl text-white leading-tight group-hover:text-retro-cyan transition-colors uppercase truncate flex-1 pr-2">
                      {item.topic}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDeleteRoadmap(item.id, e)}
                        className="text-text-muted hover:text-retro-red p-1 rounded transition-colors hover:bg-black/20"
                        title="Delete Roadmap"
                      >
                        <Trash size={16} />
                      </button>
                      <BookOpen size={18} className="text-text-muted group-hover:text-retro-cyan" />
                    </div>
                  </div>
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

              {/* Empty State Add Card */}
              <div
                onClick={() => router.push("/generate")}
                className="active-press border-[3px] border-black border-dashed rounded-md p-5 flex flex-col items-center justify-center gap-2 h-28 hover:bg-black/10 cursor-pointer text-text-muted hover:text-white transition-colors"
              >
                <Compass size={24} />
                <span className="font-pixel text-sm uppercase tracking-wide">
                  Forge Another Link...
                </span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer Info */}
      <footer className="border-t-3 border-black pt-6 mt-16 flex justify-center text-text-muted font-mono text-[10px]">
        <span>© 2026 YourWay. This is the Way.</span>
      </footer>
    </div>
  );
}
