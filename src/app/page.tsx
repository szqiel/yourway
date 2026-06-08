"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkle, ArrowRight, Compass, ShieldCheck, Trophy, Key } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // If already logged in, redirect to dashboard automatically
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.replace("/dashboard");
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  const handleEnterCodex = () => {
    // Initialize guest session ID if not existing, then redirect to dashboard
    let sessionId = localStorage.getItem("yourway_guest_session_id");
    if (!sessionId) {
      sessionId = `guest_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem("yourway_guest_session_id", sessionId);
    }
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="flex-1 w-full min-h-[100dvh] flex items-center justify-center bg-[#121317]">
        <div className="w-8 h-8 border-3 border-black border-t-retro-cyan rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full min-h-[100dvh] bg-transparent text-foreground px-6 md:px-12 py-16 flex flex-col justify-between max-w-[1200px] mx-auto select-none animate-scroll-entry">
      {/* Top Header bar */}
      <header className="flex items-center justify-between border-[3px] border-black p-4 bg-panel-dark shadow-[4px_4px_0_0_#0c0d10] rounded-md mb-16">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-black flex items-center justify-center font-mono font-black text-sm bg-retro-amber text-black shadow-[2px_2px_0_0_#000]">
            Y
          </div>
          <span className="font-pixel text-xl tracking-wider text-white uppercase font-bold">
            YOURWAY
          </span>
        </div>
        <button
          onClick={() => router.push("/profile")}
          className="retro-btn text-xs py-1.5 px-4 flex items-center gap-1.5"
        >
          <Key size={14} />
          <span>Login / Verify</span>
        </button>
      </header>

      {/* Hero Presentation */}
      <main className="flex-1 flex flex-col gap-16 items-center justify-center text-center max-w-[800px] mx-auto mb-16">
        <div className="flex flex-col items-center">
          <div className="inline-flex items-center gap-2 text-retro-amber font-pixel text-lg uppercase mb-3">
            <Sparkle size={18} weight="fill" />
            Conquer Academic Information Overload
          </div>
          <h1 className="font-pixel text-5xl sm:text-7xl leading-none tracking-tight text-white uppercase mb-6">
            FORGE LEARNING PATHS THROUGH <span className="text-retro-cyan">SCIENTIFIC TRUTH</span>.
          </h1>
          <p className="text-sm text-text-muted leading-relaxed font-mono max-w-[65ch] mb-8">
            The internet is decaying into AI-generated noise and tutorial-spam. 
            YourWay safeguards self-education by mapping structural study plans anchored exclusively in 
            human-validated, peer-reviewed scientific literature from Semantic Scholar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full">
            <button
              onClick={handleEnterCodex}
              className="active-press w-full sm:w-auto inline-flex items-center justify-center bg-retro-cyan text-black border-[3px] border-black rounded px-8 py-3 font-pixel text-lg font-bold shadow-[4px_4px_0_0_#0c0d10] hover:bg-retro-cyan/90 active:translate-y-[4px] active:shadow-[0_0_0_0_transparent] cursor-pointer"
            >
              <span>Enter the Codex</span>
              <ArrowRight size={18} className="ml-2" />
            </button>
            <button
              onClick={() => router.push("/roadmap/demo")}
              className="retro-btn w-full sm:w-auto text-base py-3 px-8 hover:border-retro-amber"
            >
              Try Pinned Demo
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left mt-8">
          <div className="rpg-panel p-6 flex flex-col gap-3">
            <div className="w-10 h-10 border-2 border-black rounded bg-retro-amber/20 flex items-center justify-center text-retro-amber">
              <ShieldCheck size={20} />
            </div>
            <h3 className="font-pixel text-xl text-white uppercase font-bold">1. Peer-Reviewed</h3>
            <p className="text-xs font-mono text-text-muted leading-relaxed">
              Every milestone node links to a real academic publication with citation counts, DOIs, and PDF links, keeping hallucinations at 0%.
            </p>
          </div>

          <div className="rpg-panel p-6 flex flex-col gap-3">
            <div className="w-10 h-10 border-2 border-black rounded bg-retro-cyan/20 flex items-center justify-center text-retro-cyan">
              <Compass size={20} />
            </div>
            <h3 className="font-pixel text-xl text-white uppercase font-bold">2. 2D RPG Visualizer</h3>
            <p className="text-xs font-mono text-text-muted leading-relaxed">
              Interact with custom SVG skill trees, drag-to-pan, scroll-to-zoom, and unlock milestones through orthogonal step wireframe connections.
            </p>
          </div>

          <div className="rpg-panel p-6 flex flex-col gap-3">
            <div className="w-10 h-10 border-2 border-black rounded bg-retro-green/20 flex items-center justify-center text-retro-green">
              <Trophy size={20} />
            </div>
            <h3 className="font-pixel text-xl text-white uppercase font-bold">3. Active Recall</h3>
            <p className="text-xs font-mono text-text-muted leading-relaxed">
              Test your understanding. Complete dynamically synthesized multiple-choice quiz Trials generated from paper abstracts to unlock new nodes.
            </p>
          </div>
        </section>
      </main>

      {/* Footer Info */}
      <footer className="border-t-3 border-black pt-6 flex justify-center text-text-muted font-mono text-[10px]">
        <span>© 2026 YourWay. This is the Way.</span>
      </footer>
    </div>
  );
}
