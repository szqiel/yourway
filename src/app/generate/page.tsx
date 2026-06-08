"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Compass, Sparkle, CircleNotch } from "@phosphor-icons/react";
import Navbar from "@/components/Navbar";

export default function GenerateRoadmap() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestSessionId, setGuestSessionId] = useState("");

  useEffect(() => {
    let sessionId = localStorage.getItem("yourway_guest_session_id");
    if (!sessionId) {
      sessionId = `guest_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem("yourway_guest_session_id", sessionId);
    }
    setGuestSessionId(sessionId);
  }, []);

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

  const sampleTopics = [
    "Modern European History",
    "Microeconomics Fundamentals",
    "Introduction to Linguistics",
    "Generative AI Model Collapse",
  ];

  return (
    <div className="flex-1 w-full min-h-[100dvh] bg-transparent text-foreground px-6 md:px-12 py-16 flex flex-col justify-between max-w-[1400px] mx-auto select-none animate-scroll-entry">
      <div className="flex flex-col gap-12 w-full">
        {/* Navigation HUD */}
        <Navbar />

        {/* Generator Main Content */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Form Side */}
          <section className="lg:col-span-7 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 text-retro-amber font-pixel text-lg uppercase mb-2">
              <Sparkle size={18} weight="fill" />
              Anchor study in peer-reviewed truth
            </div>
            <h1 className="font-pixel text-5xl leading-none tracking-tight text-white mb-6 uppercase">
              FORGE A NEW <span className="text-retro-cyan">WAY</span>.
            </h1>
            <p className="text-xs font-mono text-text-muted leading-relaxed max-w-[55ch] mb-8">
              Input any academic topic or field of study below. The AI will design a 3-tier milestone syllabus, 
              query the Semantic Scholar API to find peer-reviewed papers for each node, 
              and build your interactive skill tree.
            </p>

            <form onSubmit={handleGenerate} className="flex flex-col gap-4 max-w-[600px] w-full">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter any field of study (e.g. Modern European History)..."
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-[#171a21] border-[3px] border-black rounded text-sm text-white placeholder:text-text-muted/50 focus:outline-none focus:border-retro-cyan transition-colors font-mono"
                />
                <button
                  type="submit"
                  disabled={loading || !topic.trim()}
                  className="retro-btn text-base py-3 sm:py-0 disabled:opacity-50 px-8 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <CircleNotch size={16} className="animate-spin text-black" />
                      <span>Forging...</span>
                    </>
                  ) : (
                    <>
                      <span>Forge Path</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
              {error && (
                <span className="font-mono text-xs text-retro-red bg-retro-red/10 border-2 border-retro-red px-3 py-2 rounded">
                  [AI Engine Error]: {error}
                </span>
              )}
            </form>
          </section>

          {/* Tips / Suggestions Side */}
          <section className="lg:col-span-5 flex flex-col gap-6 w-full">
            <div className="rpg-panel p-6 flex flex-col gap-4">
              <h3 className="font-pixel text-xl uppercase text-retro-amber font-bold border-b-2 border-black pb-2">
                Curriculum Blueprinting Tips
              </h3>
              <ul className="flex flex-col gap-3 font-mono text-xs text-text-muted">
                <li>
                  <strong className="text-white">Be specific:</strong> Instead of "history", try <strong className="text-retro-cyan">"Modern European History"</strong>.
                </li>
                <li>
                  <strong className="text-white">Target Academic Concepts:</strong> The citation engines pull from millions of peer-reviewed papers across humanities, sciences, economics, and history.
                </li>
                <li>
                  <strong className="text-white">RPG Progression:</strong> You start with foundational nodes unlocked. To advance to intermediate and advanced nodes, you must pass active-recall quizzes.
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <span className="font-pixel text-xs text-text-muted uppercase font-bold tracking-wider">
                Recommended Forges
              </span>
              <div className="flex gap-2 flex-wrap">
                {sampleTopics.map((t) => (
                  <button
                    key={t}
                    onClick={() => !loading && setTopic(t)}
                    disabled={loading}
                    className="font-pixel px-3 py-1.5 text-xs uppercase border-2 border-black rounded bg-[#262b35] text-text-muted hover:text-white hover:border-retro-amber transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Footer Info */}
      <footer className="border-t-3 border-black pt-6 mt-16 flex justify-center text-text-muted font-mono text-[10px]">
        <span>© 2026 YourWay. This is the Way.</span>
      </footer>
    </div>
  );
}
