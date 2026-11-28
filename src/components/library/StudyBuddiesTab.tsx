import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUserBuddies,
  searchBuddies,
  sendBuddyRequest,
  respondBuddyRequest,
  removeBuddy,
  sendStudyCheer,
  fetchSameCollegeStudents,
  type Buddy,
  type LeaderboardEntry,
} from "@/lib/library";
import { fetchProfile } from "@/lib/profile";
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
  GraduationCap,
  Sparkles,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [searchResults, setSearchResults] = useState<LeaderboardEntry[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Unfriend dialog state
  const [unfriendTarget, setUnfriendTarget] = useState<{ id: string; name: string } | null>(null);

  // Current user's profile for college recommendations
  const { data: currentProfile } = useQuery({
    queryKey: ["profile", currentUserId],
    queryFn: () => fetchProfile(currentUserId),
    enabled: !!currentUserId,
  });

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

  // Live autocomplete query
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    let isMounted = true;
    setIsSearching(true);
    searchBuddies(debouncedQuery)
      .then((results) => {
        if (isMounted) {
          setSearchResults(results);
          setIsDropdownOpen(true);
        }
      })
      .catch((err) => {
        console.error("Autocomplete search error:", err);
      })
      .finally(() => {
        if (isMounted) setIsSearching(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  // Query: User's buddies
  const { data: buddies = [], isLoading } = useQuery({
    queryKey: ["study_buddies", currentUserId],
    queryFn: () => fetchUserBuddies(currentUserId),
    enabled: !!currentUserId,
  });

  // Query: Suggested homies from same medical college
  const { data: collegeSuggestions = [], isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ["college_homies_suggestions", currentUserId, currentProfile?.college],
    queryFn: () =>
      currentProfile?.college
        ? fetchSameCollegeStudents(currentUserId, currentProfile.college)
        : Promise.resolve([]),
    enabled: !!currentUserId && !!currentProfile?.college,
  });

  // Split buddies into active vs pending
  const activeBuddies = buddies.filter((b) => b.status === "accepted");
  const pendingReceived = buddies.filter(
    (b) => b.status === "pending" && b.recipient_id === currentUserId
  );
  const pendingSent = buddies.filter(
    (b) => b.status === "pending" && b.requester_id === currentUserId
  );

  // Mutation: Send homie request
  const addBuddyMutation = useMutation({
    mutationFn: (recipientId: string) => sendBuddyRequest(recipientId),
    onSuccess: () => {
      toast.success("Homie request sent!");
      void qc.invalidateQueries({ queryKey: ["study_buddies"] });
      void qc.invalidateQueries({ queryKey: ["college_homies_suggestions"] });
      setIsDropdownOpen(false);
      setSearchQuery("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send homie request");
    },
  });

  // Mutation: Accept/Decline homie request
  const respondMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "accepted" | "declined" }) =>
      respondBuddyRequest(id, status),
    onSuccess: (_, vars) => {
      toast.success(vars.status === "accepted" ? "Homie accepted!" : "Request declined");
      void qc.invalidateQueries({ queryKey: ["study_buddies"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to respond");
    },
  });

  // Mutation: Remove homie (Unfriend)
  const removeMutation = useMutation({
    mutationFn: (buddyId: string) => removeBuddy(buddyId),
    onSuccess: () => {
      toast.success("Homie removed");
      setUnfriendTarget(null);
      void qc.invalidateQueries({ queryKey: ["study_buddies"] });
      void qc.invalidateQueries({ queryKey: ["college_homies_suggestions"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to remove homie");
    },
  });

  // Mutation: Send silent cheer
  const cheerMutation = useMutation({
    mutationFn: ({ recipientId, cheer }: { recipientId: string; cheer: string }) =>
      sendStudyCheer(recipientId, cheer),
    onSuccess: () => {
      toast.success("Cheer sent! ⚡");
    },
    onError: () => {
      toast.error("Failed to send cheer");
    },
  });

  const getCheerIcon = (reaction: string) => {
    switch (reaction) {
      case "coffee":
        return <Coffee className="h-3 w-3" />;
      case "fire":
        return <Flame className="h-3 w-3" />;
      case "muscle":
        return <Dumbbell className="h-3 w-3" />;
      default:
        return <Sparkles className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#0D4347] pb-3">
        <div>
          <h3 className="font-display font-bold text-xl text-[#E5B95C] flex items-center gap-2">
            <Users className="h-5 w-5" /> My Homies
          </h3>
          <p className="text-xs text-[#F7F5F0]/70">
            Connect with batchmates, hold each other accountable, and track live focus sessions.
          </p>
        </div>
      </div>

      {/* Live Autocomplete Search Bar */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#F7F5F0]/40" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setIsDropdownOpen(true);
            }}
            placeholder="Search students by @handle, name, or medical college..."
            className="pl-10 pr-10 h-10 text-xs bg-[#082428] border-[#0D4347] text-[#F7F5F0] placeholder:text-[#F7F5F0]/40 rounded-xl focus:border-[#E5B95C]"
          />
          {isSearching && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-[#E5B95C] border-t-transparent animate-spin block" />
            </div>
          )}
        </div>

        {/* Live Autocomplete Dropdown */}
        {isDropdownOpen && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-40 max-h-72 overflow-y-auto rounded-xl border border-[#0D4347] bg-[#082428] shadow-2xl divide-y divide-[#0D4347]">
            {searchResults.map((user) => {
              const targetId = user.user_id;
              const isSelf = targetId === currentUserId;
              const isAlreadyBuddy = buddies.some(
                (b) =>
                  (b.requester_id === targetId || b.recipient_id === targetId) &&
                  b.status === "accepted"
              );
              const isPending = buddies.some(
                (b) =>
                  (b.requester_id === targetId || b.recipient_id === targetId) &&
                  b.status === "pending"
              );

              return (
                <div
                  key={targetId}
                  className="flex items-center justify-between gap-3 p-3 hover:bg-[#0D4347]/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar src={user.avatar_url} name={user.full_name} size={36} />
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-[#F7F5F0] truncate">
                        {user.full_name || "Doctor"}
                      </p>
                      {user.handle && (
                        <p className="font-mono text-[11px] text-[#E5B95C] truncate">
                          @{user.handle}
                        </p>
                      )}
                      <p className="text-[10px] text-[#F7F5F0]/60 truncate">
                        {user.college || user.study_year || "NEET-PG Aspirant"}
                      </p>
                    </div>
                  </div>

                  {!isSelf && (
                    <div className="shrink-0">
                      {isAlreadyBuddy ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <Check className="h-3 w-3" /> Homie ✓
                        </span>
                      ) : isPending ? (
                        <span className="text-[11px] font-medium text-[#F7F5F0]/60 bg-[#0D4347] px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          disabled={addBuddyMutation.isPending}
                          onClick={() => addBuddyMutation.mutate(targetId)}
                          className="h-7 text-xs font-semibold text-[#0D4347] border border-[#0D4347]/30 bg-[#F4F1EA] hover:bg-[#E8E2D5] px-2.5 shadow-sm"
                        >
                          <UserPlus className="mr-1 h-3 w-3 text-[#0D4347]" /> Add Homie
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

      {/* Pending Homie Requests (Received) */}
      {pendingReceived.length > 0 && (
        <div className="rounded-2xl border border-[#E5B95C]/40 bg-[#E5B95C]/5 p-4 space-y-3">
          <h4 className="font-display font-semibold text-xs text-[#E5B95C] uppercase tracking-wider flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5" /> Pending Homie Requests ({pendingReceived.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {pendingReceived.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-[#082428] border border-[#0D4347] p-3 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <UserAvatar
                    src={req.other_user?.avatar_url}
                    name={req.other_user?.full_name}
                    size={36}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#F7F5F0] truncate">
                      {req.other_user?.full_name || "Doctor"}
                    </p>
                    {req.other_user?.handle && (
                      <p className="font-mono text-[11px] text-[#E5B95C] truncate">
                        @{req.other_user?.handle}
                      </p>
                    )}
                    <p className="text-[10px] text-[#F7F5F0]/60 truncate">
                      {req.other_user?.college || "Medical Aspirant"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    className="h-7 px-2.5 bg-[#E5B95C] text-[#082428] font-bold hover:bg-[#E5B95C]/90"
                    onClick={() => respondMutation.mutate({ id: req.id, status: "accepted" })}
                    disabled={respondMutation.isPending}
                  >
                    <Check className="h-3 w-3 mr-1" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[#F7F5F0]/60 hover:text-red-400"
                    onClick={() => respondMutation.mutate({ id: req.id, status: "declined" })}
                    disabled={respondMutation.isPending}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Homies from Your Medical College */}
      {currentProfile?.college && collegeSuggestions.length > 0 && (
        <div className="rounded-2xl border border-[#0D4347] bg-[#082428]/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-semibold text-xs text-[#E5B95C] uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" /> Suggested Homies from {currentProfile.college}
            </h4>
            <span className="text-[10px] text-[#F7F5F0]/60 font-mono">
              {collegeSuggestions.length} batchmate(s)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {collegeSuggestions.slice(0, 6).map((peer) => (
              <div
                key={peer.user_id}
                className="flex items-center justify-between gap-2 rounded-xl bg-[#0D4347]/30 border border-[#0D4347] p-2.5 text-xs hover:bg-[#0D4347]/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <UserAvatar src={peer.avatar_url} name={peer.full_name} size={32} />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#F7F5F0] truncate">
                      {peer.full_name || "Batchmate"}
                    </p>
                    {peer.handle && (
                      <p className="font-mono text-[10px] text-[#E5B95C] truncate">
                        @{peer.handle}
                      </p>
                    )}
                    <p className="text-[10px] text-[#F7F5F0]/60 truncate">
                      {peer.study_year || "MBBS"}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  disabled={addBuddyMutation.isPending}
                  onClick={() => addBuddyMutation.mutate(peer.user_id)}
                  className="h-7 text-[11px] font-semibold text-[#0D4347] border border-[#0D4347]/30 bg-[#F4F1EA] hover:bg-[#E8E2D5] px-2 shrink-0 shadow-sm"
                >
                  <UserPlus className="mr-1 h-3 w-3 text-[#0D4347]" /> Add Homie
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Homies Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display font-semibold text-xs text-[#F4F1EA]/90 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-[#E5B95C]" /> Active Homies ({activeBuddies.length})
          </h4>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-xs text-[#F7F5F0]/60">Loading homies...</div>
        ) : activeBuddies.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-[#0D4347] bg-[#082428]/40 p-6 space-y-2">
            <Users className="h-8 w-8 text-[#E5B95C]/60 mx-auto" />
            <h5 className="font-display font-semibold text-sm text-[#F7F5F0]">No homies yet</h5>
            <p className="text-xs text-[#F7F5F0]/70 max-w-sm mx-auto">
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
                  className="rounded-xl border border-[#0D4347] bg-[#082428] p-3.5 shadow-sm space-y-3 transition-all hover:border-[#4BA09F]/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative">
                        <UserAvatar src={u?.avatar_url} name={u?.full_name} size={40} />
                        {isStudyingNow && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#082428] animate-pulse" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-[#F7F5F0] truncate">{u?.full_name || "Doctor"}</p>
                        {u?.handle && <p className="font-mono text-[11px] text-[#E5B95C]">@{u.handle}</p>}
                        <p className="text-[11px] text-[#F7F5F0]/60 truncate">{u?.college || "MBBS"}</p>
                      </div>
                    </div>

                    {/* Unfriend Button with Confirmation Dialog */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-[#F7F5F0]/50 hover:text-rose-400 hover:bg-[#0D4347] shrink-0"
                      onClick={() =>
                        setUnfriendTarget({
                          id: buddy.id,
                          name: u?.full_name || "this homie",
                        })
                      }
                      title="Unfriend homie"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Unfriend
                    </Button>
                  </div>

                  {/* Status & Live Study Presence */}
                  <div className="space-y-1.5 pt-1 border-t border-[#0D4347]/70 text-xs">
                    {u?.todays_mood && (
                      <p className="text-[11px] text-[#F7F5F0]/80 italic">"{u.todays_mood}"</p>
                    )}

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#F7F5F0]/60">Today's Focus:</span>
                      <span className="font-mono font-medium text-[#E5B95C]">
                        {visibleHours > 0 ? `${visibleHours.toFixed(1)} hrs` : "Hidden or 0h"}
                      </span>
                    </div>

                    {isStudyingNow ? (
                      <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1.5 text-emerald-400">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Radio className="h-3 w-3 animate-pulse" />
                          Studying {subjectLabel(u?.active_subject || "Focus")}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => cheerMutation.mutate({ recipientId: u.id, cheer: "coffee" })}
                            className="p-1 hover:bg-emerald-500/20 rounded"
                            title="Send coffee cheer"
                          >
                            <Coffee className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => cheerMutation.mutate({ recipientId: u.id, cheer: "fire" })}
                            className="p-1 hover:bg-emerald-500/20 rounded"
                            title="Send locked-in fire"
                          >
                            <Flame className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => cheerMutation.mutate({ recipientId: u.id, cheer: "muscle" })}
                            className="p-1 hover:bg-emerald-500/20 rounded"
                            title="Send strength cheer"
                          >
                            <Dumbbell className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#F7F5F0]/50 italic">
                        Offline / not studying right now
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Outgoing Pending Requests */}
      {pendingSent.length > 0 && (
        <div className="pt-2">
          <p className="text-[11px] font-mono text-[#F7F5F0]/50 uppercase tracking-wider mb-2">
            Outgoing Requests ({pendingSent.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {pendingSent.map((req) => (
              <span
                key={req.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0D4347]/60 border border-[#0D4347] px-3 py-1 text-xs text-[#F7F5F0]"
              >
                <UserAvatar src={req.other_user?.avatar_url} name={req.other_user?.full_name} size={18} />
                <span>{req.other_user?.full_name || "Doctor"}</span>
                <span className="text-[10px] text-[#E5B95C]">(Pending)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Unfriend Confirmation Dialog */}
      <AlertDialog
        open={!!unfriendTarget}
        onOpenChange={(open) => {
          if (!open) setUnfriendTarget(null);
        }}
      >
        <AlertDialogContent className="bg-[#082428] border border-[#0D4347] text-[#F7F5F0] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#E5B95C] font-display text-lg">
              Unfriend {unfriendTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#F7F5F0]/70">
              Are you sure you want to remove {unfriendTarget?.name} from your Homies? You can always send them a request again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-[#0D4347] text-[#F7F5F0] border-[#0D4347] hover:bg-[#165E63]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white font-semibold hover:bg-rose-700"
              onClick={() => {
                if (unfriendTarget) {
                  removeMutation.mutate(unfriendTarget.id);
                }
              }}
            >
              Unfriend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
