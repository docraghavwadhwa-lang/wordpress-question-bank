import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDaily, fetchProfile, updateProfile } from "@/lib/profile";
import { computeStreaks, isMilestone } from "@/lib/streak";

export function useStreak(userId: string | undefined) {
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["profile", userId], queryFn: () => fetchProfile(userId!), enabled: !!userId });
  const daily = useQuery({ queryKey: ["daily", userId], queryFn: fetchDaily, enabled: !!userId });
  const goal = profile.data?.streak_goal ?? 20;
  const counts = useMemo(() => new Map((daily.data ?? []).map((d) => [d.day, d.questions])), [daily.data]);
  const streak = useMemo(() => computeStreaks(counts, goal, new Date()), [counts, goal]);
  const [celebrate, setCelebrate] = useState<number | null>(null);

  useEffect(() => {
    if (!profile.data || !streak.todayDone) return;
    if (isMilestone(streak.current) && profile.data.last_celebrated_streak !== streak.current) setCelebrate(streak.current);
  }, [profile.data, streak]);

  async function closeCelebration() {
    const n = celebrate;
    setCelebrate(null);
    if (userId && n) {
      await updateProfile(userId, { last_celebrated_streak: n });
      void qc.invalidateQueries({ queryKey: ["profile", userId] });
    }
  }

  const totalQs = (daily.data ?? []).reduce((s, d) => s + d.questions, 0);
  const celebrationStats = [
    { label: "Today", value: String(streak.today) },
    { label: "Longest", value: `${streak.longest}d` },
    { label: "All-time Qs", value: String(totalQs) },
  ];
  return { profile, daily, counts, goal, streak, celebrate, closeCelebration, celebrationStats, refresh: () => daily.refetch() };
}
