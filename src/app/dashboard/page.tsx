"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Trophy } from "@phosphor-icons/react";
import Navbar from "@/components/Navbar";
import { MOCK_ROADMAPS } from "@/lib/mockData";

interface RoadmapHistoryItem {
  id: string;
  topic: string;
  completionRate: number;
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
    // 1. Initialize guest session if missing
    let sessionId = localStorage.getItem("yourway_guest_session_id");
    if (!sessionId) {
      sessionId = `guest_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem("yourway_guest_session_id", sessionId);
    }

    // 2. Load the 3 offline mock roadmaps
    const historyItems: RoadmapHistoryItem[] = [];

    Object.values(MOCK_ROADMAPS).forEach((mock) => {
      // Calculate local progress
      const progressRaw = localStorage.getItem(`yourway_demo_progress_${mock.id}`);
      let rate = 0;
      if (progressRaw) {
        const progress = JSON.parse(progressRaw);
        if (progress.length > 0) {
          const completed = progress.filter((p: any) => p.status === "completed").length;
          rate = Math.round((completed / progress.length) * 100);
        }
      }

      historyItems.push({
        id: mock.id,
        topic: mock.topic,
        completionRate: rate,
      });
    });

    setHistory(historyItems);

    // 3. Calculate Stats
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
  }, []);

  return (
    <div className="flex-1 w-full min-h-[100dvh] bg-transparent text-foreground px-6 md:px-12 py-16 flex flex-col justify-between max-w-[1400px] mx-auto select-none animate-scroll-entry">
      <div className="flex flex-col gap-12 w-full">
        {/* Navigation HUD */}
        <Navbar />

        {/* Overview Stats Row */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rpg-panel p-5 flex flex-col justify-between">
            <span className="font-pixel text-xs text-text-muted uppercase font-bold tracking-wider">
              Offline Demo Paths
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="font-pixel text-4xl text-retro-cyan font-black">
                {stats.totalRoadmaps}
              </span>
              <span className="font-mono text-[10px] text-text-muted">Available</span>
            </div>
          </div>
          <div className="rpg-panel p-5 flex flex-col justify-between">
            <span className="font-pixel text-xs text-text-muted uppercase font-bold tracking-wider">
              Local Sync Progress
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
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => router.push(`/roadmap/${item.id}`)}
                  className="active-press rpg-panel p-5 cursor-pointer border-black/10 hover:border-retro-amber flex flex-col justify-between h-28 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="font-pixel text-[11px] text-retro-amber tracking-wider uppercase font-bold block leading-none mb-1">
                        [ Pinned Offline Demo ]
                      </span>
                      <h3 className="font-pixel text-xl text-white leading-tight group-hover:text-retro-cyan transition-colors uppercase truncate flex-1 pr-2">
                        {item.topic}
                      </h3>
                    </div>
                    <BookOpen size={18} className="text-text-muted group-hover:text-retro-cyan flex-shrink-0" />
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
            </div>
          )}
        </main>
      </div>

      {/* Footer Info */}
      <footer className="border-t-3 border-black pt-6 mt-16 flex justify-center text-text-muted font-mono text-[10px]">
        <span>© 2026 YourWay. Offline Prototype Demo.</span>
      </footer>
    </div>
  );
}
