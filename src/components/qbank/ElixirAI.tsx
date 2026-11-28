"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Search,
  BookOpen,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
  X,
  ChevronRight,
  Filter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const MBBS_SUBJECTS = [
  "All Subjects",
  "Anatomy",
  "Physiology",
  "Biochemistry",
  "Pathology",
  "Pharmacology",
  "Microbiology",
  "Forensic Medicine",
  "Community Medicine (PSM)",
  "ENT",
  "Ophthalmology",
  "Medicine",
  "Surgery",
  "Obstetrics & Gynecology",
  "Pediatrics",
  "Dermatology",
  "Psychiatry",
  "Radiology",
  "Orthopedics",
  "Anesthesia",
];

const SUGGESTED_DOUBTS = [
  "Modified Duke criteria for Infective Endocarditis",
  "Glasgow Coma Scale (GCS) scoring breakdown",
  "Parkland formula for burn fluid resuscitation",
  "Stages of labor and active phase management",
  "Cushing triad vs Beck triad differences",
];

interface SourceCitation {
  subject: string;
  topic: string;
  document_title: string;
  similarity?: number;
}

interface DoubtResponse {
  answer: string;
  sources: SourceCitation[];
  covered: boolean;
  cached?: boolean;
}

export function ElixirAI({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All Subjects");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DoubtResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  async function handleAsk(e?: React.FormEvent, customQuery?: string) {
    if (e) e.preventDefault();
    const doubtText = (customQuery || query).trim();
    if (!doubtText || loading) return;

    if (customQuery) {
      setQuery(customQuery);
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Please log in to ask doubts with Elixir AI.");
      }

      const res = await supabase.functions.invoke("ask-doubt", {
        body: {
          query: doubtText,
          subject: selectedSubject === "All Subjects" ? null : selectedSubject,
        },
      });

      if (res.error) {
        throw new Error(res.error.message || "Failed to solve doubt. Please try again.");
      }

      setResult(res.data as DoubtResponse);
    } catch (err: any) {
      console.error("Elixir AI error:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
      toast.error(err.message || "Failed to resolve doubt");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!result?.answer) return;
    navigator.clipboard.writeText(result.answer);
    setCopied(true);
    toast.success("Answer copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-background border border-border/80 shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="elixir-ai-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/70 bg-card/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#E5B95C]/25 to-amber-600/30 text-[#E5B95C] border border-[#E5B95C]/40 shadow-xs">
              <Sparkles className="h-5 w-5 text-[#E5B95C]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="elixir-ai-title" className="text-base font-bold text-foreground">
                  Elixir AI
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0D4347]/20 text-[#0D4347] dark:text-[#E5B95C] border border-[#0D4347]/30 dark:border-[#E5B95C]/30">
                  <ShieldCheck className="h-3 w-3" /> Grounded in 24 Notes
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ask your MBBS doubts · Strictly verified from Elixir study notes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
          {/* Subject Filter Pills */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" /> Filter by Subject:
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {MBBS_SUBJECTS.map((subj) => (
                <button
                  key={subj}
                  type="button"
                  onClick={() => setSelectedSubject(subj)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer",
                    selectedSubject === subj
                      ? "bg-[#E5B95C] text-black font-semibold shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border/50"
                  )}
                >
                  {subj}
                </button>
              ))}
            </div>
          </div>

          {/* Question Input Form */}
          <form onSubmit={handleAsk} className="relative">
            <div className="relative rounded-xl border border-input bg-card shadow-xs focus-within:ring-2 focus-within:ring-[#E5B95C]/50 focus-within:border-[#E5B95C] transition-all">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type your MBBS doubt (e.g. diagnostic criteria, drug of choice, management protocol)..."
                rows={3}
                className="w-full resize-none bg-transparent p-3.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-hidden"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAsk();
                  }
                }}
              />
              <div className="flex items-center justify-between px-3 py-2 border-t border-border/40 bg-muted/20">
                <span className="text-[11px] text-muted-foreground">
                  Press Enter to submit
                </span>
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#E5B95C] text-black hover:bg-[#d8ad50] disabled:opacity-50 disabled:pointer-events-none transition-all shadow-xs cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Verifying Notes...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Solve Doubt</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Quick Suggestions (if no result yet) */}
          {!result && !loading && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-medium text-muted-foreground">
                High-Yield Examples:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED_DOUBTS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleAsk(undefined, suggestion)}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card/40 hover:bg-accent/40 text-left text-xs text-foreground transition-all cursor-pointer group"
                  >
                    <span className="line-clamp-1">{suggestion}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Answer Display */}
          {result && (
            <div className="space-y-3 pt-2">
              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <BookOpen className="h-4 w-4 text-[#E5B95C]" />
                    <span>Clinical Explanation</span>
                    {result.cached && (
                      <span className="text-[10px] text-muted-foreground font-normal">
                        · Instant Cache Hit
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {result.answer}
                </div>

                {/* Sources Attribution */}
                {result.sources && result.sources.length > 0 && (
                  <div className="pt-3 border-t border-border/40 space-y-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Verified Sources:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {result.sources.map((src, i) => (
                        <div
                          key={i}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] bg-muted/60 border border-border/50 text-foreground/80"
                        >
                          <span className="font-semibold text-[#E5B95C]">{src.subject}:</span>
                          <span className="truncate max-w-[200px]">{src.topic}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Trigger Button that can be placed in headers or action bars
 */
export function ElixirAITrigger({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#E5B95C]/15 text-[#E5B95C] border border-[#E5B95C]/40 hover:bg-[#E5B95C]/25 transition-all shadow-xs cursor-pointer",
          className
        )}
      >
        <Sparkles className="h-3.5 w-3.5 text-[#E5B95C]" />
        <span>Ask Elixir</span>
      </button>

      <ElixirAI isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
