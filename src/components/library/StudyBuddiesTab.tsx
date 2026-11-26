import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUserBuddies,
  searchBuddies,
  sendBuddyRequest,
  respondBuddyRequest,
  removeBuddy,
  sendStudyCheer,
  type Buddy,
  type StudyBuddySearchUser,
} from "@/lib/library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  UserPlus,
  Check,
  X,
  Coffee,
  Flame,
  Dumbbell,
  Radio,
  BookOpen,
  UserCheck,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/common/UserAvatar";
import { subjectLabel } from "@/lib/subjects";

interface StudyBuddiesTabProps {
  currentUserId: string;
}

export function StudyBuddiesTab({ currentUserId }: StudyBuddiesTabProps) {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<StudyBuddySearchUser[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search input for live autocomplete
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Close autocomplete on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: liveResults = [], isFetching: liveFetching } = useQuery({
    queryKey: ["buddy_autocomplete", debouncedQuery],
    queryFn: () => (debouncedQuery.length >= 2 ? searchBuddies(debouncedQuery) : Promise.resolve([])),
    enabled: debouncedQuery.length >= 2,
    staleTime: 20000,
  });

  // Queries
  const { data: buddies = [], isLoading } = useQuery({
    queryKey: ["user_buddies", currentUserId],
    queryFn: () => fetchUserBuddies(currentUserId),
    enabled: !!currentUserId,
    refetchInterval: 15000,
  });

  const activeBuddies = buddies.filter((b) => b.status === "accepted");
  const pendingReceived = buddies.filter((b) => b.status === "pending" && b.recipient_id === currentUserId);
  const pendingSent = buddies.filter((b) => b.status === "pending" && b.requester_id === currentUserId);

  // Check existing buddy status for search results
  const isAlreadyBuddy = (targetId: string) =>
    activeBuddies.some((b) => b.requester_id === targetId || b.recipient_id === targetId);
  const isRequestPending = (targetId: string) =>
    pendingSent.some((b) => b.recipient_id === targetId);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setIsDropdownOpen(false);
    try {
      const results = await searchBuddies(searchQuery);
      setSearchResults(results);
      if (!results.length) {
        toast.info("No students found matching that query");
      }
    } catch {
      toast.error("Could not complete student search");
    } finally {
      setIsSearching(false);
    }
  };

  const sendRequestMutation = useMutation({
    mutationFn: (targetId: string) => sendBuddyRequest(targetId),
    onSuccess: () => {
      toast.success("Buddy request sent successfully!");
      setIsDropdownOpen(false);
      void qc.invalidateQueries({ queryKey: ["user_buddies"] });
      void qc.invalidateQueries({ queryKey: ["buddy_autocomplete"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to send buddy request"),
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "accepted" | "declined" }) =>
      respondBuddyRequest(id, status),
    onSuccess: () => {
      toast.success("Buddy request updated!");
      void qc.invalidateQueries({ queryKey: ["user_buddies"] });
      void qc.invalidateQueries({ queryKey: ["library_leaderboard"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (buddyId: string) => removeBuddy(buddyId),
    onSuccess: () => {
      toast.info("Buddy removed");
      void qc.invalidateQueries({ queryKey: ["user_buddies"] });
    },
  });

  const cheerMutation = useMutation({
    mutationFn: ({ targetId, reaction }: { targetId: string; reaction: string }) =>
      sendStudyCheer(targetId, reaction),
    onSuccess: () => toast.success("Silent cheer sent to your buddy!"),
    onError: () => toast.error("Could not send cheer"),
  });

  return (
    <div className="space-y-6">
      {/* Top Search Banner */}
      <div className="bg-card p-4 rounded-xl border border-border/60 shadow-sm relative" ref={dropdownRef}>
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearch} className="relative flex-1 w-full">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Search by @handle, student name, or medical college..."
                className="pl-10 pr-20 h-10 text-xs font-medium text-[#0D4347] bg-[#F4F1EA] border-slate-300 placeholder:text-slate-400 focus:border-[#0D4347] focus:bg-white"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isSearching}
                className="absolute right-1 top-1 bottom-1 px-3 text-xs font-semibold bg-[#E5B95C] text-[#082428] hover:bg-[#E5B95C]/90"
              >
                Search
              </Button>
            </div>

            {/* Live Autocomplete Dropdown as user types */}
            {isDropdownOpen && debouncedQuery.length >= 2 && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-[#0D4347]/20 bg-white shadow-xl p-2 max-h-72 overflow-y-auto">
                <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 mb-1">
                  <span>Students matching "{debouncedQuery}"</span>
                  {liveFetching && <span className="text-[10px] text-slate-400">Searching...</span>}
                </div>

                {liveResults.length === 0 && !liveFetching ? (
                  <p className="p-3 text-xs text-slate-500 text-center">
                    No medical students found matching "@{debouncedQuery}".
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {liveResults.map((user) => {
                      const isSelf = user.user_id === currentUserId;
                      const isBuddy = isAlreadyBuddy(user.user_id);
                      const isPending = isRequestPending(user.user_id);

                      return (
                        <div
                          key={user.user_id}
                          className="flex items-center justify-between gap-2 p-2 hover:bg-slate-50 rounded-lg min-w-0"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <UserAvatar src={user.avatar_url} name={user.full_name} size={32} />
                            <div className="min-w-0 flex-1 truncate">
                              <p className="font-semibold text-xs text-[#0D4347] truncate">
                                {user.full_name || "Doctor"}
                              </p>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                                {user.handle && <span className="font-mono text-slate-600 truncate">@{user.handle}</span>}
                                {user.college && <span>• {user.college}</span>}
                              </div>
                            </div>
                          </div>

                          {!isSelf && (
                            <div className="shrink-0">
                              {isBuddy ? (
                                <span className="text-[11px] font-semibold text-emerald-600 px-2 py-1 bg-emerald-50 rounded-full border border-emerald-200">
                                  Buddy ✓
                                </span>
                              ) : isPending ? (
                                <span className="text-[11px] font-semibold text-amber-600 px-2 py-1 bg-amber-50 rounded-full border border-amber-200">
                                  Pending
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  className="h-7 px-2.5 text-xs font-semibold bg-[#E5B95C] text-[#082428] hover:bg-[#E5B95C]/90 shadow-sm"
                                  disabled={sendRequestMutation.isPending}
                                  onClick={() => sendRequestMutation.mutate(user.user_id)}
                                >
                                  <UserPlus className="h-3 w-3 mr-1" /> Add Buddy
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Explicit Search Results Drawer */}
      {searchResults.length > 0 && (
        <div className="rounded-xl border border-[#0D4347]/20 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-2">
            <h4 className="font-display font-semibold text-xs text-foreground uppercase tracking-wider">
              Search Results ({searchResults.length})
            </h4>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs text-[#0D4347] border-[#0D4347]/20 bg-[#F4F1EA] hover:bg-[#E8E2D5] font-semibold"
              onClick={() => setSearchResults([])}
            >
              Close
            </Button>
          </div>
          <div className="divide-y divide-border/40">
            {searchResults.map((user) => {
              const isSelf = user.user_id === currentUserId;
              const isBuddy = isAlreadyBuddy(user.user_id);
              const isPending = isRequestPending(user.user_id);

              return (
                <div key={user.user_id} className="flex items-center justify-between gap-2 py-2.5 min-w-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <UserAvatar src={user.avatar_url} name={user.full_name} size={36} />
                    <div className="min-w-0 flex-1 truncate">
                      <p className="font-semibold text-xs text-foreground truncate">{user.full_name || "Doctor"}</p>
                      {user.handle && <p className="font-mono text-[11px] text-muted-foreground truncate">@{user.handle}</p>}
                      <p className="text-[11px] text-muted-foreground truncate">{user.college}</p>
                    </div>
                  </div>

                  {!isSelf && (
                    <div className="shrink-0">
                      {isBuddy ? (
                        <span className="text-xs font-semibold text-emerald-600 px-2 py-1 bg-emerald-50 rounded-full border border-emerald-200">
                          Buddy ✓
                        </span>
                      ) : isPending ? (
                        <span className="text-xs font-semibold text-amber-600 px-2 py-1 bg-amber-50 rounded-full border border-amber-200">
                          Pending
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-semibold text-[#0D4347] border-[#0D4347]/20 bg-[#F4F1EA] hover:bg-[#E8E2D5]"
                          disabled={sendRequestMutation.isPending}
                          onClick={() => sendRequestMutation.mutate(user.user_id)}
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Buddy
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Requests Received */}
      {pendingReceived.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm space-y-3">
          <h4 className="font-display font-semibold text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            Pending Buddy Requests ({pendingReceived.length})
          </h4>
          <div className="divide-y divide-amber-500/20">
            {pendingReceived.map((req) => (
              <div key={req.id} className="flex items-center justify-between gap-2 py-2 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <UserAvatar src={req.other_user?.avatar_url} name={req.other_user?.full_name} size={34} />
                  <div className="min-w-0 flex-1 truncate">
                    <p className="font-semibold text-xs text-foreground truncate">{req.other_user?.full_name || "Doctor"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{req.other_user?.college}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => respondMutation.mutate({ id: req.id, status: "accepted" })}
                    disabled={respondMutation.isPending}
                  >
                    <Check className="h-3 w-3 mr-1" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-xs text-rose-600 border-rose-300 hover:bg-rose-50"
                    onClick={() => respondMutation.mutate({ id: req.id, status: "declined" })}
                    disabled={respondMutation.isPending}
                  >
                    <X className="h-3 w-3 mr-1" /> Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Requests Sent */}
      {pendingSent.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card/60 p-4 shadow-sm space-y-2">
          <h4 className="font-display font-semibold text-xs text-muted-foreground uppercase tracking-wider">
            Sent Requests Awaiting Response ({pendingSent.length})
          </h4>
          <div className="divide-y divide-border/30">
            {pendingSent.map((req) => (
              <div key={req.id} className="flex items-center justify-between gap-2 py-2 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <UserAvatar src={req.other_user?.avatar_url} name={req.other_user?.full_name} size={32} />
                  <div className="min-w-0 flex-1 truncate">
                    <p className="font-semibold text-xs text-foreground truncate">{req.other_user?.full_name || "Doctor"}</p>
                    {req.other_user?.handle && (
                      <p className="font-mono text-[11px] text-muted-foreground truncate">@{req.other_user?.handle}</p>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full shrink-0">
                  Pending approval
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Buddies Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-primary" /> Active Study Buddies ({activeBuddies.length})
          </h4>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-xs text-muted-foreground">Loading study buddies...</div>
        ) : activeBuddies.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border/70 p-6 space-y-2">
            <Users className="h-8 w-8 text-muted-foreground mx-auto" />
            <h5 className="font-display font-semibold text-sm text-foreground">No study buddies yet</h5>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Search by handle or college above to connect with fellow NEET-PG aspirants, track each other's focus hours, and send silent cheers.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeBuddies.map((buddy) => {
              const u = buddy.other_user;
              const isStudyingNow = !!u?.is_actively_studying;
              const visibleHours = u?.today_focus_hours ?? 0;

              return (
                <div
                  key={buddy.id}
                  className="rounded-xl border border-border/60 bg-card p-3.5 shadow-sm space-y-3 transition-all hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative">
                        <UserAvatar src={u?.avatar_url} name={u?.full_name} size={40} />
                        {isStudyingNow && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-foreground truncate">{u?.full_name || "Doctor"}</p>
                        {u?.handle && <p className="font-mono text-[11px] text-muted-foreground">@{u.handle}</p>}
                        <p className="text-[11px] text-muted-foreground truncate">{u?.college || "MBBS"}</p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-500 shrink-0"
                      onClick={() => removeMutation.mutate(buddy.id)}
                      title="Remove buddy"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Status & Live Study Presence */}
                  <div className="space-y-1.5 pt-1 border-t border-border/40 text-xs">
                    {isStudyingNow ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                        <Radio className="h-3 w-3 animate-ping" />
                        <span>Studying {subjectLabel(u?.active_subject ?? "General")}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <BookOpen className="h-3 w-3" /> Idle right now
                      </div>
                    )}

                    {u?.todays_mood && (
                      <div className="text-[11px] text-foreground bg-muted/40 px-2 py-0.5 rounded-md inline-block">
                        Status: <span className="font-medium">{u.todays_mood}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span>Today's Focus: <strong className="text-foreground">{visibleHours.toFixed(1)}h</strong></span>
                      {u?.dream_specialisation && (
                        <span className="text-[10px] text-primary truncate max-w-[140px]">
                          Goal: {u.dream_specialisation}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Silent Cheers Action Bar */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-border/40">
                    <span className="text-[10px] text-muted-foreground mr-1">Cheer:</span>
                    {[
                      { emoji: "☕", label: "Keep going", icon: Coffee },
                      { emoji: "🔥", label: "Locked in", icon: Flame },
                      { emoji: "💪", label: "You got this", icon: Dumbbell },
                    ].map((ch) => (
                      <Button
                        key={ch.emoji}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[11px] gap-1 border-border/60 hover:bg-primary/10"
                        onClick={() => cheerMutation.mutate({ targetId: u?.id ?? "", reaction: ch.emoji })}
                      >
                        <span>{ch.emoji}</span>
                        <span className="hidden sm:inline text-[10px]">{ch.label}</span>
                      </Button>
                    ))}
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
