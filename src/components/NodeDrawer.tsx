"use client";

import { useState, useEffect, useRef } from "react";
import { X, BookOpen, Chat, Trophy, ShieldWarning, ArrowRight } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { QuizQuestion } from "@/lib/gemini";
import confetti from "canvas-confetti";

interface NodeDrawerProps {
  roadmapId: string;
  nodeId: string;
  nodeTitle: string;
  nodeTier: string;
  paperId: string;
  status: "locked" | "unlocked" | "completed";
  quizScore?: number;
  guestSessionId: string;
  onClose: () => void;
  onProgressUpdate: (updatedProgress: any[]) => void;
}

interface Message {
  role: "user" | "model";
  content: string;
}

export default function NodeDrawer({
  roadmapId,
  nodeId,
  nodeTitle,
  nodeTier,
  paperId,
  status,
  quizScore,
  guestSessionId,
  onClose,
  onProgressUpdate,
}: NodeDrawerProps) {
  // Navigation tabs: 'summary' | 'chat' | 'trial'
  const [activeTab, setActiveTab] = useState<"summary" | "chat" | "trial">("summary");
  const [paper, setPaper] = useState<any>(null);
  const [loadingPaper, setLoadingPaper] = useState(true);

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizFinalScore, setQuizFinalScore] = useState<number | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load Paper Metadata when drawer opens/changes
  useEffect(() => {
    fetchPaperDetails();
    // Reset states when node changes
    setActiveTab("summary");
    setQuizQuestions([]);
    setCurrentQuizIdx(0);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizFinalScore(null);
    setQuizError(null);
    setChatMessages([
      {
        role: "model",
        content: `I am your study companion for this milestone. Ask me anything about the methodology, findings, or constraints of this research.`,
      },
    ]);
  }, [paperId]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const fetchPaperDetails = async () => {
    setLoadingPaper(true);
    try {
      const { data, error } = await supabase
        .from("cached_papers")
        .select("*")
        .eq("id", paperId)
        .single();

      if (error) throw error;
      setPaper(data);
    } catch (err) {
      console.error("Error loading cached paper:", err);
    } finally {
      setLoadingPaper(false);
    }
  };

  // Initiate Dynamic MCQ Quiz from server
  const handleStartTrial = async () => {
    setQuizLoading(true);
    setQuizError(null);
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate quiz");

      setQuizQuestions(data.questions);
    } catch (err: any) {
      setQuizError(err.message || "Could not generate assessment.");
    } finally {
      setQuizLoading(false);
    }
  };

  // Grade quiz and submit to validation endpoint
  const handleSubmitQuiz = async () => {
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answerIndex) {
        score += 1;
      }
    });

    setQuizLoading(true);
    try {
      const res = await fetch("/api/validate-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roadmapId,
          nodeId,
          guestSessionId,
          score,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit score");

      setQuizFinalScore(score);
      setQuizSubmitted(true);

      // Confetti celebration if 100% score (3/3)
      if (score === 3) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#00f2fe", "#00f5a0", "#ff9f1c"],
        });
      }

      // Propagate unlocked states back to the visualizer tree
      onProgressUpdate(data.progress);
    } catch (err: any) {
      setQuizError(err.message || "Failed to process trial submission.");
    } finally {
      setQuizLoading(false);
    }
  };

  // Send RAG chat message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat-paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperId,
          messages: [...chatMessages, { role: "user", content: userMsg }],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat failed");

      setChatMessages((prev) => [...prev, { role: "model", content: data.reply }]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: "model", content: "Apologies, I encountered a communication error with the Codex." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const authorsString = paper?.authors
    ? paper.authors.map((a: any) => a.name).join(", ")
    : "Loading...";

  return (
    <div className="fixed top-0 right-0 h-full w-full sm:w-[450px] border-l-[4px] border-black bg-panel-dark shadow-2xl z-30 flex flex-col justify-between animate-scroll-entry">
      {/* Drawer Header */}
      <div className="p-6 border-b-3 border-black flex items-start justify-between bg-black/10">
        <div>
          <span className="font-pixel text-sm uppercase tracking-wider text-retro-cyan font-bold">
            QUEST JOURNAL — {nodeTier}
          </span>
          <h2 className="font-pixel text-2xl leading-none text-white mt-1 uppercase">
            {nodeTitle}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="retro-btn text-xs py-1.5 px-3 hover:border-retro-amber cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex border-b-3 border-black p-2 bg-black/20 gap-2">
        <button
          onClick={() => setActiveTab("summary")}
          className={`flex-1 py-2 font-pixel text-sm uppercase tracking-wide border-2 border-black rounded transition-all cursor-pointer ${
            activeTab === "summary"
              ? "bg-retro-cyan text-black font-bold shadow-[2px_2px_0_0_#000]"
              : "bg-[#262b35] text-text-muted hover:text-white"
          }`}
        >
          Document
        </button>
        <button
          onClick={() => status !== "locked" && setActiveTab("chat")}
          disabled={status === "locked"}
          className={`flex-1 py-2 font-pixel text-sm uppercase tracking-wide border-2 border-black rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            activeTab === "chat"
              ? "bg-retro-cyan text-black font-bold shadow-[2px_2px_0_0_#000]"
              : "bg-[#262b35] text-text-muted hover:text-white"
          }`}
        >
          Codex Chat
        </button>
        <button
          onClick={() => status !== "locked" && setActiveTab("trial")}
          disabled={status === "locked"}
          className={`flex-1 py-2 font-pixel text-sm uppercase tracking-wide border-2 border-black rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            activeTab === "trial"
              ? "bg-retro-cyan text-black font-bold shadow-[2px_2px_0_0_#000]"
              : "bg-[#262b35] text-text-muted hover:text-white"
          }`}
        >
          The Trial
        </button>
      </div>

      {/* Drawer Body Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#13151b]">
        {loadingPaper ? (
          <div className="h-64 flex flex-col justify-center items-center gap-2">
            <div className="w-8 h-8 border-3 border-black border-t-retro-cyan rounded-full animate-spin"></div>
            <span className="font-pixel text-lg text-text-muted">Loading scientific metadata...</span>
          </div>
        ) : status === "locked" && activeTab !== "summary" ? (
          /* Lock state warning screen */
          <div className="h-64 flex flex-col justify-center items-center text-center p-6 bg-retro-red/10 border-3 border-retro-red rounded-lg">
            <ShieldWarning size={32} className="text-retro-red mb-3" />
            <h3 className="font-pixel text-2xl text-white mb-2 uppercase">Milestone is Veiled</h3>
            <p className="text-xs font-mono text-text-muted max-w-[28ch]">
              You must pass the Trials of the foundational parent milestones to forge this path.
            </p>
          </div>
        ) : (
          /* TAB CONTENTS */
          <>
            {/* 1. DOCUMENT SUMMARY TAB */}
            {activeTab === "summary" && paper && (
              <div className="flex flex-col gap-6 animate-scroll-entry">
                <div>
                  <h3 className="font-pixel text-2xl text-retro-amber leading-none uppercase mb-3">
                    {paper.title}
                  </h3>
                  <div className="flex flex-col gap-1.5 font-mono text-xs text-text-muted bg-black/30 p-3 border-2 border-black rounded">
                    <p className="text-white">Authors: {authorsString}</p>
                    <div className="flex gap-6 mt-1 text-[11px]">
                      <span>Year: {paper.year}</span>
                      <span>Citations: {paper.citation_count}</span>
                    </div>
                  </div>
                </div>

                {/* Abstract */}
                <div className="border-t-3 border-black pt-6">
                  <h4 className="font-pixel text-lg uppercase text-retro-cyan mb-3 font-bold">
                    Abstract Synthesis
                  </h4>
                  <p className="text-xs text-foreground leading-relaxed font-mono max-w-[65ch] bg-[#1a1c22] p-4 border-2 border-black rounded">
                    {paper.abstract}
                  </p>
                </div>

                {/* Citation & DOI badges */}
                <div className="border-t-3 border-black pt-6 flex flex-col sm:flex-row gap-3">
                  {paper.doi && (
                    <a
                      href={`https://doi.org/${paper.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="retro-btn text-xs text-center flex-1 py-2 px-3 justify-center"
                    >
                      DOI Link
                    </a>
                  )}
                  {paper.external_pdf_url && (
                    <a
                      href={paper.external_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="active-press flex-1 inline-flex items-center justify-center bg-retro-amber text-black border-3 border-black rounded-md px-4 py-2 font-pixel text-base font-bold shadow-[3px_3px_0_0_#0c0d10] hover:bg-retro-amber/90 active:translate-y-[3px] active:shadow-[0_0_0_0_transparent]"
                    >
                      Download PDF
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* 2. CODEX RAG CHAT TAB */}
            {activeTab === "chat" && (
              <div className="flex flex-col h-full justify-between gap-4">
                {/* Chat window list */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-4 max-h-[360px] pr-1">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col max-w-[85%] rounded border-2 border-black p-3 text-xs leading-relaxed font-mono ${
                        msg.role === "user"
                          ? "bg-[#262b35] self-end text-white"
                          : "bg-[#171920] border-retro-cyan/40 self-start text-[#cccccc]"
                      }`}
                    >
                      <span className="font-pixel text-[11px] uppercase text-retro-cyan mb-1 font-bold">
                        {msg.role === "user" ? "Learner" : "Codex AI"}
                      </span>
                      <p>{msg.content}</p>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="border-2 border-black self-start max-w-[85%] rounded p-3 text-xs font-mono bg-[#171920] flex items-center gap-2">
                      <span className="w-2 h-2 bg-retro-cyan rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-retro-cyan rounded-full animate-bounce delay-75"></span>
                      <span className="w-2 h-2 bg-retro-cyan rounded-full animate-bounce delay-150"></span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input panel */}
                <form onSubmit={handleSendMessage} className="flex gap-2 border-t-3 border-black pt-4">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Consult the Codex..."
                    disabled={chatLoading}
                    className="flex-1 border-[3px] border-black rounded px-3 py-2 text-xs bg-[#171a21] text-white focus:outline-none focus:border-retro-cyan placeholder:text-text-muted/50 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading}
                    className="retro-btn text-xs py-2 px-4"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}

            {/* 3. THE TRIAL TAB (QUIZ ENGINE) */}
            {activeTab === "trial" && (
              <div className="flex flex-col gap-6 animate-scroll-entry">
                {status === "completed" || quizSubmitted ? (
                  /* Completed state */
                  <div className="flex flex-col items-center justify-center text-center py-12 bg-retro-green/10 border-3 border-retro-green rounded-lg">
                    <Trophy size={56} weight="fill" className="text-retro-green mb-4" />
                    <h3 className="font-pixel text-3xl text-white mb-2 uppercase">Trial Forged</h3>
                    <p className="font-pixel text-lg text-retro-green uppercase tracking-wider mb-6">
                      Unlocked Path Forward!
                    </p>
                    <div className="bg-[#171a21] border-2 border-black rounded px-6 py-3 font-pixel text-lg text-white">
                      SCORE: {quizFinalScore !== null ? quizFinalScore : quizScore}/3 CORRECT
                    </div>
                  </div>
                ) : quizQuestions.length === 0 ? (
                  /* Initial initiation page */
                  <div className="text-center py-12">
                    <BookOpen size={48} className="mx-auto text-text-muted mb-4" />
                    <h3 className="font-pixel text-3xl tracking-tight text-white uppercase mb-2">Trial of active recall</h3>
                    <p className="text-xs font-mono text-text-muted max-w-[32ch] mx-auto mb-8">
                      Complete a 3-question Multiple Choice assessment synthesized from this 
                      paper abstract to unlock the next branches on your path.
                    </p>
                    <button
                      onClick={handleStartTrial}
                      disabled={quizLoading}
                      className="active-press inline-flex items-center justify-center bg-retro-cyan text-black border-3 border-black rounded-md px-8 py-3 font-pixel text-lg font-bold shadow-[3px_3px_0_0_#0c0d10] hover:bg-retro-cyan/90 active:translate-y-[3px] active:shadow-[0_0_0_0_transparent]"
                    >
                      {quizLoading ? "Synthesizing Trial..." : "Initiate Trial"}
                    </button>
                    {quizError && (
                      <p className="text-xs text-retro-red font-mono mt-4">{quizError}</p>
                    )}
                  </div>
                ) : (
                  /* Dynamic Quiz Form */
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between border-b-3 border-black pb-2">
                      <span className="font-pixel text-base uppercase text-retro-cyan font-bold">
                        TRIAL QUESTION {currentQuizIdx + 1} OF 3
                      </span>
                    </div>

                    {/* Question text */}
                    <p className="text-sm font-mono text-white leading-snug bg-black/40 p-4 border-2 border-black rounded">
                      {quizQuestions[currentQuizIdx].question}
                    </p>

                    {/* Options (RPG slot style items) */}
                    <div className="flex flex-col gap-3">
                      {quizQuestions[currentQuizIdx].options.map((option, optIdx) => {
                        const isSelected = selectedAnswers[currentQuizIdx] === optIdx;
                        return (
                          <div
                            key={optIdx}
                            onClick={() =>
                              setSelectedAnswers((prev) => ({ ...prev, [currentQuizIdx]: optIdx }))
                            }
                            className={`active-press border-[3px] p-4 rounded-md cursor-pointer select-none text-xs font-mono transition-all duration-100 ${
                              isSelected
                                ? "bg-pastel-blue/20 border-retro-cyan text-white font-medium"
                                : "bg-[#171a21] border-black text-text-muted hover:border-retro-cyan/50 hover:text-white"
                            }`}
                          >
                            {option}
                          </div>
                        );
                      })}
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between items-center border-t-3 border-black pt-6 mt-4">
                      {currentQuizIdx > 0 ? (
                        <button
                          onClick={() => setCurrentQuizIdx((p) => p - 1)}
                          className="retro-btn text-xs py-2 px-4"
                        >
                          Previous
                        </button>
                      ) : (
                        <div></div>
                      )}

                      {currentQuizIdx < 2 ? (
                        <button
                          onClick={() => setCurrentQuizIdx((p) => p + 1)}
                          disabled={selectedAnswers[currentQuizIdx] === undefined}
                          className="retro-btn text-xs py-2 px-5"
                        >
                          Next
                          <ArrowRight size={14} className="ml-1 inline" />
                        </button>
                      ) : (
                        <button
                          onClick={handleSubmitQuiz}
                          disabled={
                            selectedAnswers[0] === undefined ||
                            selectedAnswers[1] === undefined ||
                            selectedAnswers[2] === undefined ||
                            quizLoading
                          }
                          className="active-press inline-flex items-center justify-center bg-retro-green text-black border-3 border-black rounded-md px-6 py-2.5 font-pixel text-base font-bold shadow-[3px_3px_0_0_#0c0d10] hover:bg-retro-green/90 active:translate-y-[3px] active:shadow-[0_0_0_0_transparent] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {quizLoading ? "Submitting..." : "Submit Trial"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
