"use client";

import { useState, useEffect, useRef } from "react";
import { X, Lock, CheckCircle, FileText, ChatTeardropText, Exam, CircleNotch, Question, Info, Trophy } from "@phosphor-icons/react";
import ReactMarkdown from "react-markdown";
import { MOCK_ROADMAPS } from "@/lib/mockData";

interface NodeDrawerProps {
  roadmapId: string;
  nodeId: string;
  nodeTitle: string;
  nodeDescription: string;
  nodeTier: string;
  paperId: string;
  status: "locked" | "unlocked" | "completed";
  quizScore?: number;
  onClose: () => void;
  onProgressUpdate: (newProgress: any[]) => void;
  embeddedPaper?: any;
  allNodes?: any[];
}

export default function NodeDrawer({
  roadmapId,
  nodeId,
  nodeTitle,
  nodeDescription,
  nodeTier,
  paperId,
  status,
  quizScore,
  onClose,
  onProgressUpdate,
  embeddedPaper,
  allNodes,
}: NodeDrawerProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "quiz" | "chat">("summary");
  
  // Paper State
  const [paper, setPaper] = useState<any>(null);
  
  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizFinalScore, setQuizFinalScore] = useState<number | null>(null);

  // Chat State (Mocked)
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      role: "model",
      content: `I am your offline study companion. Unfortunately, the AI chat is disabled in the prototype demo, but I hope you enjoy the interface!`,
    },
  ]);

  // Load Paper Metadata when drawer opens/changes
  useEffect(() => {
    if (embeddedPaper) {
      setPaper(embeddedPaper);
    }

    // Reset states when node changes
    setActiveTab("summary");
    setQuizQuestions([]);
    setCurrentQuizIdx(0);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizFinalScore(null);
  }, [paperId, embeddedPaper]);

  // Initiate Dynamic MCQ Quiz from Mock Data
  const handleStartTrial = () => {
    const roadmap = MOCK_ROADMAPS[roadmapId];
    if (roadmap && roadmap.quizzes && roadmap.quizzes[paperId]) {
      setQuizQuestions(roadmap.quizzes[paperId]);
    } else {
      setQuizQuestions([]);
    }
  };

  const handleSelectAnswer = (qIdx: number, aIdx: number) => {
    if (quizSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [qIdx]: aIdx }));
  };

  const handleSubmitQuiz = () => {
    if (Object.keys(selectedAnswers).length < quizQuestions.length) {
      alert("Please answer all questions before submitting.");
      return;
    }

    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answerIndex) score += 1;
    });
    setQuizFinalScore(score);
    setQuizSubmitted(true);

    const passed = score >= Math.ceil(quizQuestions.length * 0.6);
    
    if (passed && status !== "completed") {
      unlockNodeOffline(score);
    }
  };

  const unlockNodeOffline = (score: number) => {
    // 1. Get current progress
    const savedProgressRaw = localStorage.getItem(`yourway_demo_progress_${roadmapId}`);
    let progress = savedProgressRaw ? JSON.parse(savedProgressRaw) : [];

    // 2. Mark this node completed
    progress = progress.map((p: any) => {
      if (p.node_id === nodeId) {
        return { ...p, status: "completed", quiz_score: score };
      }
      return p;
    });

    // 3. Find children of this node that should be unlocked
    if (allNodes) {
      allNodes.forEach((node) => {
        if (node.prerequisites && node.prerequisites.includes(nodeId)) {
          // Check if ALL prerequisites for this child are now "completed"
          const allPrereqsMet = node.prerequisites.every((prereqId: string) => {
            const p = progress.find((state: any) => state.node_id === prereqId);
            return p?.status === "completed";
          });

          if (allPrereqsMet) {
            // Unlock it if it exists
            const existingProgress = progress.find((p: any) => p.node_id === node.id);
            if (existingProgress) {
              if (existingProgress.status === "locked") {
                existingProgress.status = "unlocked";
              }
            } else {
              progress.push({ node_id: node.id, status: "unlocked" });
            }
          }
        }
      });
    }

    // 4. Save and lift state
    localStorage.setItem(`yourway_demo_progress_${roadmapId}`, JSON.stringify(progress));
    onProgressUpdate(progress);
  };

  const getTierColor = (tier: string) => {
    if (tier === "foundational") return "border-retro-amber bg-retro-amber/10 text-retro-amber";
    if (tier === "intermediate") return "border-retro-cyan bg-retro-cyan/10 text-retro-cyan";
    if (tier === "advanced") return "border-retro-red bg-retro-red/10 text-retro-red";
    return "border-gray-500 bg-gray-500/10 text-gray-500";
  };

  if (!paper) return null;

  return (
    <div className="absolute right-0 top-0 h-full w-[450px] max-w-full bg-[#121317] border-l-[3px] border-black shadow-[-8px_0_0_0_#0c0d10] flex flex-col z-20 animate-slide-in-right overflow-hidden">
      {/* Drawer Header */}
      <div className="p-5 border-b-[3px] border-black flex items-start justify-between bg-panel-dark">
        <div className="flex-1 pr-4">
          <div className={`inline-block font-pixel text-[10px] uppercase font-bold border-2 rounded px-2 py-0.5 mb-2 ${getTierColor(nodeTier)}`}>
            {nodeTier} Milestone
          </div>
          <h2 className="font-pixel text-xl leading-tight text-white uppercase">{nodeTitle}</h2>
          <div className="flex items-center gap-2 mt-2">
            {status === "locked" && <><Lock size={14} className="text-retro-red" /><span className="font-mono text-xs text-retro-red font-bold">LOCKED</span></>}
            {status === "unlocked" && <><Question size={14} className="text-retro-cyan" /><span className="font-mono text-xs text-retro-cyan font-bold">READY TO LEARN</span></>}
            {status === "completed" && <><CheckCircle size={14} weight="fill" className="text-retro-green" /><span className="font-mono text-xs text-retro-green font-bold">MASTERY ACHIEVED {quizScore !== undefined && `(${quizScore}/${quizQuestions.length})`}</span></>}
          </div>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-white p-1 retro-btn border-none shadow-none">
          <X size={20} />
        </button>
      </div>

      {status === "locked" ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-muted gap-4">
          <Lock size={48} className="text-retro-red opacity-50" />
          <h3 className="font-pixel text-lg text-white uppercase">Milestone Locked</h3>
          <p className="font-mono text-sm leading-relaxed max-w-[250px]">
            You must complete all prerequisite nodes and pass their Active Recall Trials before unlocking this material.
          </p>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="flex border-b-[3px] border-black bg-[#171a21]">
            <button
              onClick={() => setActiveTab("summary")}
              className={`flex-1 py-3 px-2 font-pixel text-[11px] font-bold uppercase transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === "summary" ? "bg-[#1c1f26] text-retro-amber border-b-2 border-retro-amber" : "text-text-muted hover:text-white hover:bg-black/20"
              }`}
            >
              <FileText size={16} /> Guide
            </button>
            <button
              onClick={() => setActiveTab("quiz")}
              className={`flex-1 py-3 px-2 font-pixel text-[11px] font-bold uppercase transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === "quiz" ? "bg-[#1c1f26] text-retro-cyan border-b-2 border-retro-cyan" : "text-text-muted hover:text-white hover:bg-black/20"
              }`}
            >
              <Exam size={16} /> The Trial
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-3 px-2 font-pixel text-[11px] font-bold uppercase transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === "chat" ? "bg-[#1c1f26] text-retro-green border-b-2 border-retro-green" : "text-text-muted hover:text-white hover:bg-black/20"
              }`}
            >
              <ChatTeardropText size={16} /> Codex Chat
            </button>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#121317]">
            {activeTab === "summary" && (
              <div className="p-6 flex flex-col gap-6">
                <div className="rpg-panel p-5 bg-[#171a21] flex flex-col gap-2">
                  <span className="font-pixel text-[10px] text-text-muted uppercase tracking-widest border-b border-black/20 pb-1">
                    Peer-Reviewed Source
                  </span>
                  <h3 className="font-mono text-sm font-bold text-white leading-tight">
                    {paper.title}
                  </h3>
                  <p className="font-mono text-[11px] text-text-muted">
                    {paper.authors?.map((a: any) => a.name).join(", ")} • {paper.year}
                  </p>
                  
                  <div className="border-t-3 border-black pt-6 flex flex-col gap-3 mt-4">
                    {paper.external_pdf_url && (
                      <a
                        href={paper.external_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="active-press w-full inline-flex items-center justify-center bg-retro-cyan text-black border-3 border-black rounded-md px-4 py-2.5 font-pixel text-base font-bold shadow-[3px_3px_0_0_#0c0d10] hover:bg-retro-cyan/90 active:translate-y-[3px] active:shadow-[0_0_0_0_transparent] cursor-pointer"
                      >
                        Read Open Access
                      </a>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3 w-full">
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
                    </div>
                  </div>
                </div>

                <div className="prose prose-invert prose-sm font-mono max-w-none prose-headings:font-pixel prose-headings:uppercase prose-h2:text-retro-amber prose-h3:text-retro-cyan prose-p:text-text-muted prose-li:text-text-muted">
                  <ReactMarkdown>
                    {paper.ai_summary || "_Summary not available in demo._"}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {activeTab === "quiz" && (
              <div className="p-6 flex flex-col gap-6">
                {quizQuestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center gap-4 py-12">
                    <Trophy size={48} className="text-retro-cyan opacity-50" />
                    <p className="font-mono text-sm text-text-muted">
                      Synthesize your learning through Active Recall. Pass the trial to permanently unlock the next tier of the roadmap.
                    </p>
                    <button
                      onClick={handleStartTrial}
                      className="active-press mt-2 bg-retro-cyan text-black border-3 border-black rounded px-6 py-2.5 font-pixel text-sm font-bold shadow-[3px_3px_0_0_#0c0d10] hover:bg-retro-cyan/90 active:translate-y-[3px] active:shadow-[0_0_0_0_transparent] cursor-pointer uppercase"
                    >
                      Commence Trial
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b-2 border-black pb-4">
                      <span className="font-pixel text-xs text-retro-cyan uppercase">
                        Question {currentQuizIdx + 1} of {quizQuestions.length}
                      </span>
                      <div className="flex gap-1">
                        {quizQuestions.map((_, i) => (
                          <div
                            key={i}
                            className={`w-3 h-3 border-2 border-black ${
                              i === currentQuizIdx
                                ? "bg-retro-cyan animate-pulse"
                                : selectedAnswers[i] !== undefined
                                ? "bg-retro-green"
                                : "bg-panel-dark"
                            }`}
                          ></div>
                        ))}
                      </div>
                    </div>

                    {/* Question Card */}
                    <div className="rpg-panel p-5">
                      <h3 className="font-mono text-base text-white leading-relaxed mb-6">
                        {quizQuestions[currentQuizIdx].question}
                      </h3>
                      
                      <div className="flex flex-col gap-3">
                        {quizQuestions[currentQuizIdx].options.map((opt: string, idx: number) => {
                          const isSelected = selectedAnswers[currentQuizIdx] === idx;
                          const isCorrect = quizSubmitted && idx === quizQuestions[currentQuizIdx].answerIndex;
                          const isWrongSelection = quizSubmitted && isSelected && !isCorrect;
                          
                          let btnStyle = "border-black/30 hover:border-retro-cyan bg-[#1c1f26]";
                          if (isSelected && !quizSubmitted) btnStyle = "border-retro-cyan bg-retro-cyan/10";
                          if (isCorrect) btnStyle = "border-retro-green bg-retro-green/10 text-retro-green shadow-[inset_0_0_0_1px_#a3e635]";
                          if (isWrongSelection) btnStyle = "border-retro-red bg-retro-red/10 text-retro-red";

                          return (
                            <button
                              key={idx}
                              onClick={() => handleSelectAnswer(currentQuizIdx, idx)}
                              disabled={quizSubmitted}
                              className={`active-press text-left px-4 py-3 border-2 rounded font-mono text-sm transition-all ${btnStyle} ${quizSubmitted ? "opacity-90" : ""}`}
                            >
                              <span className="font-bold mr-2 opacity-50">{String.fromCharCode(65 + idx)}.</span>
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation (Post-submit) */}
                      {quizSubmitted && (
                        <div className="mt-6 p-4 bg-black/40 border-l-2 border-retro-amber rounded-r">
                          <span className="font-pixel text-[10px] text-retro-amber uppercase block mb-1">Codex Explanation</span>
                          <p className="font-mono text-xs text-text-muted leading-relaxed">
                            {quizQuestions[currentQuizIdx].explanation}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between items-center mt-2">
                      <button
                        onClick={() => setCurrentQuizIdx(p => Math.max(0, p - 1))}
                        disabled={currentQuizIdx === 0}
                        className="retro-btn text-xs py-2 px-4 disabled:opacity-30 disabled:hover:border-black"
                      >
                        Previous
                      </button>
                      
                      {!quizSubmitted ? (
                        currentQuizIdx === quizQuestions.length - 1 ? (
                          <button
                            onClick={handleSubmitQuiz}
                            className="bg-retro-green text-black border-3 border-black rounded px-4 py-2 font-pixel text-xs font-bold uppercase"
                          >
                            Submit Trial
                          </button>
                        ) : (
                          <button
                            onClick={() => setCurrentQuizIdx(p => Math.min(quizQuestions.length - 1, p + 1))}
                            className="retro-btn text-xs py-2 px-4 border-retro-cyan text-retro-cyan"
                          >
                            Next
                          </button>
                        )
                      ) : (
                        currentQuizIdx === quizQuestions.length - 1 ? (
                          <div className={`font-pixel text-xs uppercase px-3 py-1.5 border-2 ${
                            (quizFinalScore || 0) >= Math.ceil(quizQuestions.length * 0.6) 
                              ? "border-retro-green text-retro-green bg-retro-green/10" 
                              : "border-retro-red text-retro-red bg-retro-red/10"
                          }`}>
                            Score: {quizFinalScore}/{quizQuestions.length}
                          </div>
                        ) : (
                          <button
                            onClick={() => setCurrentQuizIdx(p => Math.min(quizQuestions.length - 1, p + 1))}
                            className="retro-btn text-xs py-2 px-4"
                          >
                            Next
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "chat" && (
              <div className="p-6 flex flex-col h-full items-center justify-center text-center gap-4">
                <Info size={48} className="text-text-muted opacity-50" />
                <h3 className="font-pixel text-lg text-white uppercase">Chat Disabled</h3>
                <p className="font-mono text-sm leading-relaxed max-w-[250px] text-text-muted">
                  The AI Tutor Chat is disabled in the offline demo mode. In the full app, you can ask the AI questions about the specific research paper.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
