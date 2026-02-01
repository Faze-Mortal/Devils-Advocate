"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type AnalysisResponse = {
  assumptions: string[];
  counterArguments: string[];
  failurePoints: string[];
  uncomfortableQuestions: string[];
  upgradeSuggestions: string[];
};

type Revision = {
  id: string;
  idea: string;
  context: string;
  mode: string;
  createdAt: number;
  response?: AnalysisResponse;
};

const MODES = [
  { id: "brutal", label: "🔥 Brutal", description: "Harsh, ruthless, no cushioning." },
  { id: "logical", label: "🧠 Logical", description: "Tight reasoning and fallacy hunting." },
  { id: "ethical", label: "⚖️ Ethical", description: "Social impact and moral risk lens." },
  { id: "investor", label: "🧑‍💼 Investor-style", description: "ROI, scalability, moat, risk." },
  { id: "academic", label: "🎓 Academic", description: "Evidence-driven, conceptual rigor." },
];

const MAX_CHARS = 2000;
const STORAGE_KEYS = {
  idea: "devils-advocate-idea",
  goal: "devils-advocate-goal",
  audience: "devils-advocate-audience",
  constraints: "devils-advocate-constraints",
  mode: "devils-advocate-mode",
  history: "devils-advocate-history",
  baseline: "devils-advocate-baseline",
  novel: "devils-advocate-novel",
  revisions: "devils-advocate-revisions",
};

const SECTION_META = [
  { key: "assumptions", label: "❌ Weak Assumptions", severity: "Medium" },
  { key: "failurePoints", label: "⚠️ Likely Failure Points", severity: "High" },
  { key: "uncomfortableQuestions", label: "❓ Uncomfortable Questions", severity: "Medium" },
  { key: "counterArguments", label: "🧨 Strongest Counter-Argument", severity: "High" },
  { key: "upgradeSuggestions", label: "🔧 Improvement Suggestions", severity: "Low" },
] as const;

function safeParseArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }
  return [];
}

function extractJson(text: string): AnalysisResponse | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return {
      assumptions: safeParseArray(parsed.assumptions),
      counterArguments: safeParseArray(parsed.counterArguments),
      failurePoints: safeParseArray(parsed.failurePoints),
      uncomfortableQuestions: safeParseArray(parsed.uncomfortableQuestions),
      upgradeSuggestions: safeParseArray(parsed.upgradeSuggestions),
    };
  } catch {
    return null;
  }
}

function buildContext(goal: string, audience: string, constraints: string) {
  const lines = [
    goal.trim() ? `Goal: ${goal.trim()}` : "",
    audience.trim() ? `Audience: ${audience.trim()}` : "",
    constraints.trim() ? `Constraints: ${constraints.trim()}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

function buildPrompt(options: {
  idea: string;
  context: string;
  mode: string;
  intensity: number;
  novelCritique: boolean;
}) {
  return `You are a devil’s advocate whose job is to aggressively challenge ideas.
You do not comfort, validate, or soften criticism.
You expose weak assumptions, logical gaps, and failure risks.
You prioritize truth over politeness.

Analyze the following idea as a devil’s advocate.

Idea:
${options.idea}

Context:
${options.context || "No additional context provided."}

Mode:
${options.mode}

Intensity:
${options.intensity > 0 ? `Stronger counter (round ${options.intensity}).` : "Standard."}

Novel critique:
${options.novelCritique ? "Yes. Avoid repeating earlier critiques." : "No."}

Instructions:
- Identify hidden assumptions
- Argue the strongest opposing position
- Highlight logical fallacies
- Ask uncomfortable but fair questions
- Suggest concrete improvements

Return JSON only in this exact shape:
{
  "assumptions": [],
  "counterArguments": [],
  "failurePoints": [],
  "uncomfortableQuestions": [],
  "upgradeSuggestions": []
}`;
}

export default function Home() {
  const [idea, setIdea] = useState("");
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [constraints, setConstraints] = useState("");
  const [mode, setMode] = useState("brutal");
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  const [novelCritique, setNovelCritique] = useState(false);
  const [intensity, setIntensity] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AnalysisResponse | null>(null);
  const [rawResponse, setRawResponse] = useState("");
  const [history, setHistory] = useState<Revision[]>([]);
  const [baseline, setBaseline] = useState<Revision | null>(null);
  const [revisionCount, setRevisionCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const contextValue = useMemo(
    () => buildContext(goal, audience, constraints),
    [goal, audience, constraints]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIdea(localStorage.getItem(STORAGE_KEYS.idea) || "");
    setGoal(localStorage.getItem(STORAGE_KEYS.goal) || "");
    setAudience(localStorage.getItem(STORAGE_KEYS.audience) || "");
    setConstraints(localStorage.getItem(STORAGE_KEYS.constraints) || "");
    setMode(localStorage.getItem(STORAGE_KEYS.mode) || "brutal");
    setNovelCritique(localStorage.getItem(STORAGE_KEYS.novel) === "true");
    setRevisionCount(Number(localStorage.getItem(STORAGE_KEYS.revisions) || "0"));
    try {
      const storedHistory = localStorage.getItem(STORAGE_KEYS.history);
      if (storedHistory) setHistory(JSON.parse(storedHistory));
    } catch {
      setHistory([]);
    }
    try {
      const storedBaseline = localStorage.getItem(STORAGE_KEYS.baseline);
      if (storedBaseline) setBaseline(JSON.parse(storedBaseline));
    } catch {
      setBaseline(null);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.idea, idea);
  }, [idea]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.goal, goal);
    localStorage.setItem(STORAGE_KEYS.audience, audience);
    localStorage.setItem(STORAGE_KEYS.constraints, constraints);
  }, [goal, audience, constraints]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.mode, mode);
  }, [mode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.novel, String(novelCritique));
  }, [novelCritique]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.revisions, String(revisionCount));
  }, [revisionCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history.slice(0, 8)));
  }, [history]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (baseline) {
      localStorage.setItem(STORAGE_KEYS.baseline, JSON.stringify(baseline));
    } else {
      localStorage.removeItem(STORAGE_KEYS.baseline);
    }
  }, [baseline]);

  useEffect(() => {
    if (audioRef) {
      audioRef.volume = volume;
    }
  }, [volume, audioRef]);

  useEffect(() => {
    if (audioRef) {
      if (isPlaying) {
        audioRef.play().catch(() => setIsPlaying(false));
      } else {
        audioRef.pause();
      }
    }
  }, [isPlaying, audioRef]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const charCount = idea.length;
  const limitReached = charCount >= MAX_CHARS;

  const modeMeta = useMemo(() => MODES.find((item) => item.id === mode), [mode]);

  const handleAnalyze = async () => {
    setError(null);
    setRawResponse("");
    if (!idea.trim()) {
      setError("Enter an idea to attack.");
      return;
    }
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      setError("Set NEXT_PUBLIC_GEMINI_API_KEY in your environment to run analysis.");
      return;
    }
    setLoading(true);
    try {
      const prompt = buildPrompt({
        idea: idea.trim(),
        context: contextValue,
        mode: modeMeta?.label || mode,
        intensity,
        novelCritique,
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: mode === "brutal" ? 0.7 : 0.5 },
          }),
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Gemini request failed.");
      }

      const data = await response.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.map((part: { text: string }) => part.text).join("") ||
        "";
      const parsed = extractJson(text);
      if (!parsed) {
        setRawResponse(text || "No response text returned.");
        setResponse(null);
      } else {
        setResponse(parsed);
      }

      const newRevision: Revision = {
        id: crypto.randomUUID(),
        idea: idea.trim(),
        context: contextValue,
        mode,
        createdAt: Date.now(),
        response: parsed || undefined,
      };

      setHistory((prev) => [newRevision, ...prev].slice(0, 8));
      setRevisionCount((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setIdea("");
    setGoal("");
    setAudience("");
    setConstraints("");
    setResponse(null);
    setRawResponse("");
    setError(null);
  };

  const handleGoHarder = () => {
    setIntensity((prev) => prev + 1);
  };

  const handleUseRevision = (revision: Revision) => {
    setIdea(revision.idea);
    setGoal(revision.context.split("\n").find((line) => line.startsWith("Goal:"))?.replace("Goal:", "").trim() || "");
    setAudience(
      revision.context
        .split("\n")
        .find((line) => line.startsWith("Audience:"))
        ?.replace("Audience:", "")
        .trim() || ""
    );
    setConstraints(
      revision.context
        .split("\n")
        .find((line) => line.startsWith("Constraints:"))
        ?.replace("Constraints:", "")
        .trim() || ""
    );
    setMode(revision.mode);
    setResponse(revision.response || null);
    setRawResponse("");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 lg:px-10">
        <header className="flex flex-col gap-4 border-b-2 border-red-900/30 pb-8">
          <div className="flex items-center gap-3">
            <span className="text-4xl">😈</span>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-red-500">
              AI Devil's Advocate
            </p>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-red-50 md:text-5xl">
            Your ideas are <span className="text-red-500">weak</span>.
            <br />Let's fix that.
          </h1>
          <p className="max-w-2xl text-base text-zinc-400">
            ⚡ Ruthless AI critique engine. No mercy. No softening. Just brutal truth.
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border-2 border-red-900/40 bg-gradient-to-br from-zinc-900 to-red-950/20 p-6 shadow-2xl shadow-red-950/20">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-red-100">🎯 Drop your idea</h2>
                <span className={`text-xs font-mono ${limitReached ? "text-red-400 font-bold" : "text-zinc-500"}`}>
                  {charCount}/{MAX_CHARS}
                </span>
              </div>
              <textarea
                className="mt-4 min-h-[180px] w-full resize-none rounded-xl border-2 border-red-900/40 bg-black/60 p-4 text-sm text-red-50 outline-none transition focus:border-red-500 focus:bg-black/80 placeholder:text-zinc-600"
                placeholder="Defend your idea. We'll tear it apart. No holding back."
                value={idea}
                maxLength={MAX_CHARS}
                onChange={(event) => setIdea(event.target.value)}
              />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-red-400"
                  placeholder="Goal (optional)"
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                />
                <input
                  className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-red-400"
                  placeholder="Audience (optional)"
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                />
                <input
                  className="md:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-red-400"
                  placeholder="Constraints (budget, time, ethics)"
                  value={constraints}
                  onChange={(event) => setConstraints(event.target.value)}
                />
              </div>
            </div>

            <div className="rounded-2xl border-2 border-red-900/40 bg-gradient-to-br from-zinc-900 to-red-950/20 p-6 shadow-2xl shadow-red-950/20">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-red-100">🔥 Attack mode</h2>
                {mode === "brutal" && (
                  <span className="animate-pulse rounded-full border-2 border-red-500 bg-red-600/20 px-3 py-1 text-xs font-bold text-red-200">
                    ⚠️ BRUTAL MODE
                  </span>
                )}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {MODES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={`rounded-xl border-2 px-4 py-3 text-left text-sm transition-all ${
                      mode === item.id
                        ? "border-red-500 bg-red-600/20 text-red-50 shadow-lg shadow-red-900/50 scale-105"
                        : "border-red-900/30 bg-black/40 text-zinc-400 hover:border-red-700/60 hover:bg-red-950/20"
                    }`}
                  >
                    <p className="font-medium">{item.label}</p>
                    <p className="mt-1 text-xs text-zinc-500">{item.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border-2 border-red-900/40 bg-gradient-to-br from-zinc-900 to-red-950/20 p-6 shadow-2xl shadow-red-950/20">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-red-100">🎵 Devil's Soundtrack</h2>
                <span className="text-xs text-red-400/60">Set the mood</span>
              </div>
              <audio
                ref={(el) => setAudioRef(el)}
                loop
                src="/devil-music.mp3"
              />
              <div className="mt-4 space-y-4">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-900/40 bg-black/60 px-4 py-3 text-sm font-bold text-red-100 transition hover:border-red-700/60 hover:bg-red-950/30"
                >
                  {isPlaying ? (
                    <>
                      <span className="text-lg">⏸️</span> Pause
                    </>
                  ) : (
                    <>
                      <span className="text-lg">▶️</span> Play
                    </>
                  )}
                </button>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>🔇</span>
                    <span className="font-mono text-red-400">{Math.round(volume * 100)}%</span>
                    <span>🔊</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-full h-2 rounded-full bg-zinc-800 appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, rgb(220 38 38) 0%, rgb(220 38 38) ${volume * 100}%, rgb(39 39 42) ${volume * 100}%, rgb(39 39 42) 100%)`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border-2 border-red-900/40 bg-gradient-to-br from-zinc-900 to-red-950/20 p-6 shadow-2xl shadow-red-950/20">
              <h2 className="text-lg font-bold text-red-100">⚔️ Execute critique</h2>
              <p className="mt-2 text-sm text-red-300/60">
                ⚠️ Adversarial by design. Prepare for impact.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-4 text-sm font-black uppercase tracking-wider text-white shadow-xl shadow-red-900/50 transition hover:from-red-500 hover:to-red-600 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-60 disabled:grayscale"
                >
                  {loading ? "🔄 Attacking..." : "💥 Destroy this idea"}
                </button>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleGoHarder}
                    className="rounded-xl border border-zinc-700 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-200 transition hover:border-red-400"
                  >
                    Stronger counter (+{intensity})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBaseline(history[0] || null)}
                    className="rounded-xl border border-zinc-700 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-200 transition hover:border-zinc-500"
                  >
                    Save current as baseline
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-400 transition hover:border-zinc-600"
                >
                  Clear draft
                </button>
              </div>
              {error && (
                <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <h2 className="text-lg font-semibold">Latest response</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Structured output only. If parsing fails, raw response is shown.
              </p>
              <div className="mt-4 max-h-[600px] overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-red-900/50 scrollbar-track-zinc-900">
                <AnimatePresence mode="wait">
                  {response ? (
                    <motion.div
                      key="response"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      className="space-y-4"
                    >
                      {SECTION_META.map((section) => (
                        <div key={section.key} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white">{section.label}</h3>
                            <span className="rounded-full border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400">
                              {section.severity} risk
                            </span>
                          </div>
                          <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                            {response[section.key].length === 0 && (
                              <li className="text-xs text-zinc-500">No data returned.</li>
                            )}
                            {response[section.key].map((item, index) => (
                              <li key={`${section.key}-${index}`} className="border-l border-red-500/40 pl-3">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </motion.div>
                  ) : rawResponse ? (
                    <motion.pre
                      key="raw"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      className="whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-xs text-zinc-300"
                    >
                      {rawResponse}
                    </motion.pre>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/20 p-6 text-center text-sm text-zinc-500"
                    >
                      Run analysis to see structured critique.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="text-lg font-semibold">Revision comparison</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Compare baseline (v1) to current draft (v2).
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Baseline</p>
                <p className="mt-2 text-sm text-zinc-200">
                  {baseline?.idea || "No baseline saved yet."}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Current</p>
                <p className="mt-2 text-sm text-zinc-200">{idea || "Draft is empty."}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Idea history</h2>
              <span className="text-xs text-zinc-500">Stored locally</span>
            </div>
            <div className="mt-4 space-y-3">
              {history.length === 0 && (
                <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/20 p-4 text-sm text-zinc-500">
                  No critiques yet.
                </div>
              )}
              {history.map((item) => (
                <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-200">{item.idea}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400">
                      {item.mode}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUseRevision(item)}
                      className="rounded-full border border-zinc-700 px-3 py-1 text-[10px] text-zinc-300 transition hover:border-red-400"
                    >
                      Load
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border-2 border-red-900/40 bg-gradient-to-br from-red-950/20 to-zinc-900 p-6 text-xs text-red-200/70">
          <p className="font-bold text-red-400">⚠️ WARNING</p>
          <p className="mt-2">
            This is an AI-powered adversarial critique tool. Output is intentionally aggressive and may be wrong, biased, or incomplete. Use as a stress test only. Not a substitute for professional judgment.
          </p>
        </section>
      </div>
    </div>
  );
}
