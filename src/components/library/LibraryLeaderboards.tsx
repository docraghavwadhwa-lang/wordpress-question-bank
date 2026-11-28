import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchLeaderboard, sendBuddyRequest, type LeaderboardEntry } from "@/lib/library";
import { UserAvatar } from "@/components/qbank/AppHeader";
import { QuickPeekProfileCard } from "./QuickPeekProfileCard";
import { formatFocusDuration } from "@/lib/apothecary";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, UserPlus, Check, UserCheck, Flame, Users, GraduationCap, Calendar, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/lib/profile";
import { cn } from "@/lib/utils";

interface LibraryLeaderboardsProps {
  currentUserId: string;
  currentUserProfile: Profile | null;
}

export function LibraryLeaderboards({ currentUserId, currentUserProfile }: LibraryLeaderboardsProps) {
  const qc = useQueryClient();
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");
  const [filter, setFilter] = useState<"global" | "college" | "year" | "buddies">("global");

  // Filter value based on selection
  let filterVal: string | undefined = undefined;
  if (filter === "college") filterVal = currentUserProfile?.college || "";
  if (filter === "year") filterVal = currentUserProfile?.study_year || "";

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["library_leaderboard", period, filter, filterVal],
    queryFn: () => fetchLeaderboard(period, filter, filterVal),
    refetchInterval: 60000, // Refresh every minute
  });

  const buddyMutation = useMutation({
    mutationFn: (targetId: string) => sendBuddyRequest(targetId),
    onSuccess: () => {
      toast.success("Buddy request sent!");
      void qc.invalidateQueries({ queryKey: ["library_leaderboard"] });
      void qc.invalidateQueries({ queryKey: ["user_buddies"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send buddy request");
    },
  });

  // Find current user's entry
  const myEntry = leaderboard.find((e) => e.user_id === currentUserId);

  return (
    <div className="space-y-4">
      {/* Controls: Daily / Weekly + Filters with Crisp Contrast */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/70 shadow-sm">
        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border text-xs">
          <button
            type="button"
            className={cn(
              "h-7 text-xs px-3 font-semibold rounded-md transition-all",
              period === "daily"
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "bg-transparent text-foreground/80 hover:text-foreground hover:bg-muted/80"
            )}
            onClick={() => setPeriod("daily")}
          >
            Today (IST)
          </button>
          <button
            type="button"
            className={cn(
              "h-7 text-xs px-3 font-semibold rounded-md transition-all",
              period === "weekly"
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "bg-transparent text-foreground/80 hover:text-foreground hover:bg-muted/80"
            )}
            onClick={() => setPeriod("weekly")}
          >
            This Week (Mon-Sun IST)
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            className={cn(
              "h-7 text-xs px-3 rounded-md font-semibold inline-flex items-center transition-all border",
              filter === "global"
                ? "bg-[#E5B95C] text-[#082428] border-[#E5B95C] font-bold shadow-sm"
                : "bg-card text-foreground/85 border-border hover:text-foreground hover:bg-muted"
            )}
            onClick={() => setFilter("global")}
          >
            <Trophy className="h-3 w-3 mr-1" /> Global
          </button>

          <button
            type="button"
            disabled={!currentUserProfile?.college}
            title={!currentUserProfile?.college ? "Set your college in Profile first" : undefined}
            className={cn(
              "h-7 text-xs px-3 rounded-md font-semibold inline-flex items-center transition-all border",
              filter === "college"
                ? "bg-[#E5B95C] text-[#082428] border-[#E5B95C] font-bold shadow-sm"
                : "bg-card text-foreground/85 border-border hover:text-foreground hover:bg-muted disabled:opacity-40"
            )}
            onClick={() => setFilter("college")}
          >
            <GraduationCap className="h-3 w-3 mr-1" /> My College
          </button>

          <button
            type="button"
            disabled={!currentUserProfile?.study_year}
            title={!currentUserProfile?.study_year ? "Set your study year in Profile first" : undefined}
            className={cn(
              "h-7 text-xs px-3 rounded-md font-semibold inline-flex items-center transition-all border",
              filter === "year"
                ? "bg-[#E5B95C] text-[#082428] border-[#E5B95C] font-bold shadow-sm"
                : "bg-card text-foreground/85 border-border hover:text-foreground hover:bg-muted disabled:opacity-40"
            )}
            onClick={() => setFilter("year")}
          >
            <Calendar className="h-3 w-3 mr-1" /> My Year
          </button>

          <button
            type="button"
            className={cn(
              "h-7 text-xs px-3 rounded-md font-semibold inline-flex items-center transition-all border",
              filter === "buddies"
                ? "bg-[#E5B95C] text-[#082428] border-[#E5B95C] font-bold shadow-sm"
                : "bg-card text-foreground/85 border-border hover:text-foreground hover:bg-muted"
            )}
            onClick={() => setFilter("buddies")}
          >
            <Users className="h-3 w-3 mr-1" /> Homies
          </button>
        </div>
      </div>

      {/* Current User Standings Card */}
      {myEntry && (
        <div className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary/5 p-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-primary-foreground">
              #{myEntry.rank}
            </span>
            <UserAvatar src={myEntry.avatar_url} name={myEntry.full_name} size={36} />
            <div>
              <p className="text-xs font-semibold text-foreground">Your Current Rank</p>
              <p className="text-[11px] text-muted-foreground">
                {currentUserProfile?.college || "Global Arena"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold text-primary">
              {formatFocusDuration(myEntry.total_seconds)}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Logged Focus</p>
          </div>
        </div>
      )}

      {/* Main Leaderboard List */}
      <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground text-xs">
            Loading leaderboard standings...
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-xs space-y-2">
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="font-display text-sm font-medium text-foreground">No students on this board yet</p>
            <p className="max-w-xs mx-auto">
              Be the first to log study hours for this period or invite your college batchmates!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {leaderboard.map((entry) => {
              const isMe = entry.user_id === currentUserId;
              const name = entry.full_name || entry.handle || "Student Doctor";

              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center justify-between p-3.5 transition-colors hover:bg-muted/40 ${
                    isMe ? "bg-accent/5" : ""
                  }`}
                >
                  {/* Left: Rank & Avatar & User Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Rank Badge */}
                    <div className="flex w-7 shrink-0 items-center justify-center">
                      {entry.rank === 1 ? (
                        <Medal className="h-6 w-6 text-amber-500 fill-amber-500/20" />
                      ) : entry.rank === 2 ? (
                        <Medal className="h-5 w-5 text-slate-400 fill-slate-400/20" />
                      ) : entry.rank === 3 ? (
                        <Medal className="h-5 w-5 text-amber-700 fill-amber-700/20" />
                      ) : (
                        <span className="font-mono text-xs font-semibold text-muted-foreground">
                          #{entry.rank}
                        </span>
                      )}
                    </div>

                    {/* Quick Peek Profile Card Trigger */}
                    <QuickPeekProfileCard
                      user={{
                        id: entry.user_id,
                        full_name: entry.full_name,
                        handle: entry.handle,
                        college: entry.college,
                        study_year: entry.study_year,
                        avatar_url: entry.avatar_url,
                        dream_specialisation: entry.dream_specialisation,
                        todays_mood: entry.todays_mood,
                        today_seconds: entry.total_seconds,
                        buddy_status: entry.buddy_status,
                      }}
                      onAddBuddy={(id) => buddyMutation.mutate(id)}
                      isCurrentViewer={isMe}
                    >
                      <UserAvatar src={entry.avatar_url} name={name} size={40} />
                    </QuickPeekProfileCard>

                    {/* Name and Meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <QuickPeekProfileCard
                          user={{
                            id: entry.user_id,
                            full_name: entry.full_name,
                            handle: entry.handle,
                            college: entry.college,
                            study_year: entry.study_year,
                            avatar_url: entry.avatar_url,
                            dream_specialisation: entry.dream_specialisation,
                            todays_mood: entry.todays_mood,
                            today_seconds: entry.total_seconds,
                            buddy_status: entry.buddy_status,
                          }}
                          onAddBuddy={(id) => buddyMutation.mutate(id)}
                          isCurrentViewer={isMe}
                        >
                          <span className="font-display font-semibold text-sm text-foreground hover:underline truncate">
                            {name}
                          </span>
                        </QuickPeekProfileCard>

                        {isMe && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                            YOU
                          </span>
                        )}

                        {entry.todays_mood && (
                          <span className="text-[11px] text-accent truncate">
                            • {entry.todays_mood}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                        {entry.college && <span className="truncate">{entry.college}</span>}
                        {entry.study_year && <span>• {entry.study_year}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right: Duration + Inline Add Buddy Action */}
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-foreground block">
                        {formatFocusDuration(entry.total_seconds)}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center justify-end gap-0.5">
                        <Flame className="h-2.5 w-2.5 text-accent" /> focus
                      </span>
                    </div>

                    {/* Inline Buddy Button */}
                    {!isMe && (
                      <div className="hidden sm:block">
                        {entry.buddy_status === "accepted" ? (
                          <Button size="sm" variant="ghost" disabled className="h-7 w-7 p-0 text-emerald-600">
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        ) : entry.buddy_status === "pending_sent" ? (
                          <Button size="sm" variant="ghost" disabled className="h-7 px-2 text-xs text-amber-600">
                            <Check className="h-3.5 w-3.5 mr-1" /> Sent
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => buddyMutation.mutate(entry.user_id)}
                            disabled={buddyMutation.isPending}
                            className="h-7 text-xs px-2.5 border-primary/30 text-primary hover:bg-primary/10"
                          >
                            <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
