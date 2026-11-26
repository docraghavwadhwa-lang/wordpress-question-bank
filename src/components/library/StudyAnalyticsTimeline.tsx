import React, { useMemo } from "react";
import type { StudySession } from "@/lib/library";
import { subjectLabel } from "@/lib/subjects";
import { formatFocusDuration } from "@/lib/apothecary";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Clock, PieChart, Sparkles } from "lucide-react";

interface StudyAnalyticsTimelineProps {
  sessions: StudySession[];
}

const SUBJECT_COLORS: Record<string, string> = {
  Anatomy: "#38BDF8",
  Physiology: "#4ADE80",
  Biochemistry: "#FBBF24",
  Pathology: "#F87171",
  Pharmacology: "#A78BFA",
  Microbiology: "#34D399",
  ForensicMedicine: "#FB923C",
  CommunityMedicine: "#2DD4BF",
  GeneralMedicine: "#60A5FA",
  Pediatrics: "#F472B6",
  Dermatology: "#E879F9",
  Psychiatry: "#C084FC",
  GeneralSurgery: "#EF4444",
  Orthopedics: "#F59E0B",
  ENT: "#10B981",
  Ophthalmology: "#06B6D4",
  ObstetricsGynecology: "#EC4899",
  Anesthesia: "#8B5CF6",
  Radiology: "#6366F1",
};

export function StudyAnalyticsTimeline({ sessions }: StudyAnalyticsTimelineProps) {
  // 1. Calculate 24-hour slots for today in IST
  const { hourlySlots, todaySessions, totalTodaySeconds } = useMemo(() => {
    // Current IST date string YYYY-MM-DD
    const nowIST = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const slots: Array<{ hour: number; label: string; sessions: StudySession[]; totalSeconds: number }> = [];
    for (let h = 0; h < 24; h++) {
      slots.push({
        hour: h,
        label: `${h.toString().padStart(2, "0")}:00`,
        sessions: [],
        totalSeconds: 0,
      });
    }

    const today: StudySession[] = [];
    let todaySec = 0;

    sessions.forEach((s) => {
      if (s.status === "abandoned") return;
      const sessionDateIST = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(s.started_at));

      if (sessionDateIST === nowIST) {
        today.push(s);
        todaySec += s.duration_seconds;

        // Determine IST hour of session start
        const sessionHourIST = parseInt(
          new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Kolkata",
            hour: "numeric",
            hour12: false,
          }).format(new Date(s.started_at)),
          10
        );

        if (sessionHourIST >= 0 && sessionHourIST < 24) {
          slots[sessionHourIST]!.sessions.push(s);
          slots[sessionHourIST]!.totalSeconds += s.duration_seconds;
        }
      }
    });

    return { hourlySlots: slots, todaySessions: today, totalTodaySeconds: todaySec };
  }, [sessions]);

  // 2. Weekly breakdown data by subject
  const weeklySubjectData = useMemo(() => {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const subjectTotals: Record<string, number> = {};

    sessions.forEach((s) => {
      if (s.status === "abandoned") return;
      if (new Date(s.started_at) >= cutoff) {
        subjectTotals[s.subject] = (subjectTotals[s.subject] || 0) + s.duration_seconds;
      }
    });

    return Object.entries(subjectTotals)
      .map(([subject, seconds]) => ({
        subject,
        label: subjectLabel(subject),
        minutes: Math.round(seconds / 60),
        hours: parseFloat((seconds / 3600).toFixed(1)),
        color: SUBJECT_COLORS[subject] || "#0D5C63",
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [sessions]);

  return (
    <div className="space-y-6">
      {/* 24-Hour Visual Heat Timeline */}
      <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold text-foreground text-sm">
              Today's 24-Hour Focus Timeline (IST)
            </h3>
          </div>
          <span className="font-mono text-xs font-semibold text-accent">
            {formatFocusDuration(totalTodaySeconds)} logged today
          </span>
        </div>

        {/* Hour Grid Bar */}
        <div className="relative pt-2 pb-1">
          <div className="grid grid-cols-24 gap-0.5 sm:gap-1 h-14 bg-muted/30 rounded-lg p-1 border border-border/40">
            {hourlySlots.map((slot) => {
              const hasStudy = slot.totalSeconds > 0;
              const primarySession = slot.sessions[0];
              const color = primarySession ? SUBJECT_COLORS[primarySession.subject] || "#2DD4BF" : "transparent";

              return (
                <div
                  key={slot.hour}
                  title={
                    hasStudy
                      ? `${slot.label}: ${slot.sessions.map((s) => `${subjectLabel(s.subject)} (${formatFocusDuration(s.duration_seconds)})`).join(", ")}`
                      : slot.label
                  }
                  className={`group relative flex flex-col justify-end rounded-[3px] transition-all duration-200 ${
                    hasStudy ? "hover:scale-105 hover:z-10 shadow-sm" : "hover:bg-muted/50"
                  }`}
                  style={{
                    backgroundColor: hasStudy ? color : undefined,
                    opacity: hasStudy ? Math.min(1, 0.4 + (slot.totalSeconds / 3600) * 0.6) : 0.2,
                  }}
                >
                  {/* Tooltip on hover */}
                  <div className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-30 whitespace-nowrap rounded bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md border border-border">
                    <span className="font-semibold">{slot.label}</span>
                    {hasStudy && (
                      <span className="block text-accent">
                        {formatFocusDuration(slot.totalSeconds)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time axis labels: 00h, 06h, 12h, 18h, 23h */}
          <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1.5 px-1">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00 (Noon)</span>
            <span>18:00</span>
            <span>23:59</span>
          </div>
        </div>

        {/* Legend of today's subjects */}
        {todaySessions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-border/40">
            {Array.from(new Set(todaySessions.map((s) => s.subject))).map((subj) => (
              <span
                key={subj}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted/60 text-foreground"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: SUBJECT_COLORS[subj] || "#2DD4BF" }}
                />
                {subjectLabel(subj)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Subject Breakdown Chart */}
      <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-accent" />
            <h3 className="font-display font-semibold text-foreground text-sm">
              7-Day Subject Breakdown
            </h3>
          </div>
        </div>

        {weeklySubjectData.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-xs">
            <Sparkles className="mx-auto h-6 w-6 text-muted-foreground/40 mb-2" />
            No focus sessions logged in the past 7 days yet. Start your first session above!
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklySubjectData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                  <XAxis type="number" unit="h" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "currentColor", opacity: 0.7 }} />
                  <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={100} tick={{ fontSize: 10, fill: "currentColor", opacity: 0.8 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0]!.payload;
                        return (
                          <div className="rounded-lg border border-border bg-popover p-2 text-xs shadow-md">
                            <p className="font-semibold">{d.label}</p>
                            <p className="text-accent">{d.hours} hrs ({d.minutes} mins)</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="hours" fill="#0D5C63" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
