"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldWarning, CircleNotch, SignOut, ShieldCheck, Key } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

export default function Profile() {
  const router = useRouter();
  
  // Auth State
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [guestId, setGuestId] = useState("");

  useEffect(() => {
    // 1. Get Guest ID
    const sessionId = localStorage.getItem("yourway_guest_session_id") || "";
    setGuestId(sessionId);

    // 2. Get active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 3. Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      setLoading(false);

      if (activeUser) {
        // Sync local guest roadmaps to Supabase database upon successful login/signup
        await syncGuestRoadmapsToCloud(activeUser.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync logic to convert local saves to cloud databases
  const syncGuestRoadmapsToCloud = async (userId: string) => {
    const savedIdsRaw = localStorage.getItem("yourway_roadmap_ids");
    if (!savedIdsRaw) return;

    const savedIds: string[] = JSON.parse(savedIdsRaw);
    const localIds = savedIds.filter((id) => id.startsWith("local-"));
    if (localIds.length === 0) return;

    console.log("Syncing local roadmaps to Supabase Cloud for user:", userId);

    for (const id of localIds) {
      try {
        const roadmapRaw = localStorage.getItem(`yourway_local_roadmap_${id}`);
        const progressRaw = localStorage.getItem(`yourway_local_progress_${id}`);

        if (roadmapRaw) {
          const roadmap = JSON.parse(roadmapRaw);
          const progress = progressRaw ? JSON.parse(progressRaw) : [];

          // 1. Save Roadmap to Supabase
          const { data: cloudRoadmap, error: roadmapError } = await supabase
            .from("roadmaps")
            .insert({
              user_id: userId,
              topic: roadmap.topic,
              nodes: roadmap.nodes,
            })
            .select()
            .single();

          if (roadmapError) throw roadmapError;

          // 2. Save progress entries
          if (progress.length > 0) {
            const progressInserts = progress.map((p: any) => ({
              user_id: userId,
              roadmap_id: cloudRoadmap.id,
              node_id: p.node_id,
              status: p.status,
              quiz_score: p.quiz_score || null,
            }));

            const { error: progressError } = await supabase
              .from("user_progress")
              .insert(progressInserts);

            if (progressError) throw progressError;
          }

          // 3. Remove local copy and replace ID in history
          localStorage.removeItem(`yourway_local_roadmap_${id}`);
          localStorage.removeItem(`yourway_local_progress_${id}`);

          const currentIdsRaw = localStorage.getItem("yourway_roadmap_ids");
          let currentIds: string[] = currentIdsRaw ? JSON.parse(currentIdsRaw) : [];
          currentIds = currentIds.filter((cid) => cid !== id);
          if (!currentIds.includes(cloudRoadmap.id)) {
            currentIds.push(cloudRoadmap.id);
          }
          localStorage.setItem("yourway_roadmap_ids", JSON.stringify(currentIds));
        }
      } catch (err) {
        console.error(`Failed to sync guest roadmap ${id}:`, err);
      }
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      if (isSignUp) {
        // Sign Up
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        setAuthSuccess("Codex registration successful! Please check your email to verify your account.");
      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        setAuthSuccess("Codex authentication successful!");
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      router.push("/");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full min-h-[100dvh] bg-transparent text-foreground px-6 md:px-12 py-16 flex flex-col justify-between max-w-[1400px] mx-auto select-none animate-scroll-entry">
      <div className="flex flex-col gap-12 w-full">
        {/* Navigation HUD */}
        <Navbar />

        {/* Profile/Auth Main Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {loading ? (
            <div className="lg:col-span-12 flex items-center justify-center h-64">
              <CircleNotch size={32} className="animate-spin text-retro-cyan" />
            </div>
          ) : !user ? (
            /* ================= GUEST / LOGIN VIEW ================= */
            <>
              {/* Left explanation card */}
              <section className="lg:col-span-7 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 text-retro-amber font-pixel text-lg uppercase mb-2">
                  <ShieldWarning size={18} />
                  Codex Slot Is Unsecured
                </div>
                <h1 className="font-pixel text-5xl leading-none text-white uppercase mb-6">
                  SECURE YOUR <span className="text-retro-amber">CODEX</span>.
                </h1>
                <p className="text-xs font-mono text-text-muted leading-relaxed max-w-[55ch] mb-4">
                  You are currently using YourWay in <strong className="text-retro-amber">Guest Session Mode</strong>. 
                  Your roadmaps, progress stats, and quiz scores are saved exclusively in your browser's local cache.
                </p>
                <div className="font-mono text-[10px] text-text-muted bg-[#121317] border border-black p-4 rounded-md max-w-[550px] mb-8">
                  <span className="text-retro-amber font-bold font-pixel text-xs block mb-1">GUEST SLOT ID:</span>
                  <span className="break-all">{guestId}</span>
                </div>
                <p className="text-xs font-mono text-text-muted leading-relaxed max-w-[55ch]">
                  Creating a secure Codex account links your roadmap data directly to Supabase Cloud, 
                  allowing you to sync your studies across devices and bypass guest rate limits. 
                  Any local roadmaps you forged will automatically migrate to your cloud account upon signing up!
                </p>
              </section>

              {/* Right Auth Card */}
              <section className="lg:col-span-5 w-full">
                <div className="rpg-panel p-6 flex flex-col gap-6">
                  <div className="flex border-b-2 border-black pb-2 justify-between items-center">
                    <span className="font-pixel text-xl uppercase text-white font-bold">
                      {isSignUp ? "Create Secure Codex" : "Verify Codex Key"}
                    </span>
                    <button
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setAuthError(null);
                        setAuthSuccess(null);
                      }}
                      className="text-[10px] font-mono text-retro-cyan hover:underline hover:text-white"
                    >
                      {isSignUp ? "Already secured? Log In" : "Need account? Sign Up"}
                    </button>
                  </div>

                  <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-pixel text-sm uppercase text-text-muted">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your-email@study.edu"
                        required
                        disabled={authLoading}
                        className="px-4 py-2.5 bg-[#171a21] border-[3px] border-black rounded text-xs text-white placeholder:text-text-muted/50 focus:outline-none focus:border-retro-cyan font-mono"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-pixel text-sm uppercase text-text-muted">Pass-Key (Password)</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        disabled={authLoading}
                        className="px-4 py-2.5 bg-[#171a21] border-[3px] border-black rounded text-xs text-white placeholder:text-text-muted/50 focus:outline-none focus:border-retro-cyan font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="retro-btn text-sm w-full py-3 mt-2 flex items-center justify-center gap-2"
                    >
                      {authLoading ? (
                        <>
                          <CircleNotch size={16} className="animate-spin text-black" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <Key size={16} />
                          <span>{isSignUp ? "Initialize Secure Codex" : "Verify Codex Key"}</span>
                        </>
                      )}
                    </button>
                  </form>

                  {authError && (
                    <span className="font-mono text-xs text-retro-red bg-retro-red/10 border-2 border-retro-red px-3 py-2 rounded">
                      [Auth Fail]: {authError}
                    </span>
                  )}

                  {authSuccess && (
                    <span className="font-mono text-xs text-retro-green bg-retro-green/10 border-2 border-retro-green px-3 py-2 rounded">
                      [Auth Success]: {authSuccess}
                    </span>
                  )}
                </div>
              </section>
            </>
          ) : (
            /* ================= AUTHENTICATED VIEW ================= */
            <>
              {/* Left explanation card */}
              <section className="lg:col-span-7 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 text-retro-green font-pixel text-lg uppercase mb-2">
                  <ShieldCheck size={18} />
                  Codex Securely Linked
                </div>
                <h1 className="font-pixel text-5xl leading-none text-white uppercase mb-6">
                  CODEX SETTINGS
                </h1>
                <p className="text-xs font-mono text-text-muted leading-relaxed max-w-[55ch] mb-4">
                  Welcome back. Your active profile is linked to Supabase Cloud services. All your
                  learning paths, milestones, and recall scores are encrypted and synced in real-time.
                </p>
                <div className="flex flex-col gap-3 font-mono text-xs text-text-muted bg-[#121317] border border-black p-4 rounded-md max-w-[550px] mb-8">
                  <div>
                    <span className="text-retro-green font-bold font-pixel text-xs block mb-0.5">ACTIVE EMAIL:</span>
                    <span>{user.email}</span>
                  </div>
                  <div>
                    <span className="text-retro-green font-bold font-pixel text-xs block mb-0.5">CODEX HASH (UUID):</span>
                    <span className="break-all">{user.id}</span>
                  </div>
                </div>
              </section>

              {/* Right Settings Logout Card */}
              <section className="lg:col-span-5 w-full">
                <div className="rpg-panel p-6 flex flex-col gap-6">
                  <h3 className="font-pixel text-xl uppercase text-white font-bold border-b-2 border-black pb-2">
                    Profile Management
                  </h3>
                  <button
                    onClick={handleLogout}
                    className="retro-btn text-sm w-full py-3 hover:border-retro-red flex items-center justify-center gap-2"
                  >
                    <SignOut size={16} />
                    <span>Sever Link (Log Out)</span>
                  </button>
                </div>
              </section>
            </>
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
