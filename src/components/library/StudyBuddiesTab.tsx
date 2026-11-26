import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUserBuddies,
  searchBuddies,
  sendBuddyRequest,
  respondBuddyRequest,
  removeBuddy,
  sendStudyCheer,
  type Buddy,
  type LeaderboardEntry,
} from "@/lib/library";
import { updateProfile, type Profile } from "@/lib/profile";
import { UserAvatar } from "@/components/qbank/AppHeader";
import { QuickPeekProfileCard } from "./QuickPeekProfileCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  UserPlus,
  Check,
  X,
  Coffee,
  Flame,
  Dumbbell,
  Shield,
  Sparkles,
  Settings,
  Heart,
} from "lucide-react";
import { toast } from "sonner";

interface StudyBuddiesTabProps {
  currentUserId: string;
  profile: Profile | null;
}

export function StudyBuddiesTab({ currentUserId, profile }: StudyBuddiesTabProps) {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LeaderboardEntry[]>([]);

  // Profile Privacy & Settings state
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [handle, setHandle] = useState(profile?.handle || "");
  const [mood, setMood] = useState(profile?.todays_mood || "");
  const [dreamSpec, setDreamSpec] = useState(profile?.dream_specialisation || "");
  const [goalHours, setGoalHours] = useState<number>((profile?.daily_focus_goal_minutes || 240) / 60);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [visibility, setVisibility] = useState(profile?.study_hours_visibility || "all_buddies");

  const { data: buddies = [], isLoading: buddiesLoading } = useQuery({
    queryKey: ["user_buddies", currentUserId],
    queryFn: () => fetchUserBuddies(currentUserId),
    refetchInterval: 30000,
  });

  
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { data: liveResults = [], isFetching: liveFetching } = useQuery({
    queryKey: ["buddy_autocomplete", debouncedQuery],
    queryFn: () => (debouncedQuery.length >= 2 ? searchBuddies(debouncedQuery) : Promise.resolve([])),
    enabled: debouncedQuery.length >= 2,
    staleTime: 20000,
  });

  const acceptedBuddies = buddies.filter((b) => b.status === "accepted");
  const pendingReceived = buddies.filter((b) => b.status === "pending" && b.recipient_id === currentUserId);
  const pendingSent = buddies.filter((b) => b.status === "pending" && b.requester_id === currentUserId);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await searchBuddies(searchQuery.trim());
      setSearchResults(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to search students");
    } finally {
      setIsSearching(false);
    }
  };

  const sendRequestMutation = useMutation({
    mutationFn: (targetId: string) => sendBuddyRequest(targetId),
    onSuccess: () => {
      toast.success("Buddy request dispatched!");
      void qc.invalidateQueries({ queryKey: ["user_buddies"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to send buddy request"),
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "accepted" | "declined" }) =>
      respondBuddyRequest(id, status),
    onSuccess: () => {
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

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      await updateProfile(currentUserId, {
        handle: handle.trim().toLowerCase().replace(/^@/, ""),
        todays_mood: mood.trim() || null,
        dream_specialisation: dreamSpec.trim() || null,
        daily_focus_goal_minutes: Math.max(15, Math.round(Number(goalHours) * 60)),
        study_hours_visibility: visibility,
      });
    },
    onSuccess: () => {
      toast.success("Study profile & privacy updated!");
      setPrivacyModalOpen(false);
      void qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to update settings"),
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Search + Privacy Settings Trigger */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-4 rounded-xl border border-border/60 shadow-sm">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by @handle, student name, or college..."
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Button type="submit" size="sm" disabled={isSearching} className="h-9 px-3 text-xs bg-primary text-primary-foreground">
            Search
          </Button>
        </form>

        {/* Privacy & Handle Settings Modal */}
        <Dialog open={privacyModalOpen} onOpenChange={setPrivacyModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs w-full sm:w-auto">
              <Settings className="h-3.5 w-3.5" /> Study Profile & Privacy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="font-display text-lg">Study Profile & Privacy</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-semibold">Unique Study Handle</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">@</span>
                  <Input
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="raghav_mbbs"
                    className="pl-7 h-9 text-xs font-mono"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Letters, numbers, and underscores only. Other students can find you with this.
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold">Today's Study Mood / Status</Label>
                <Input
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  placeholder="e.g. Locked in 🔥, Caffeinated ☕, Revising Pathology"
                  className="mt-1 h-9 text-xs"
                  maxLength={50}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Dream Specialisation</Label>
                <Input
                  value={dreamSpec}
                  onChange={(e) => setDreamSpec(e.target.value)}
                  placeholder="e.g. General Surgery, Radiology, Internal Medicine"
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Daily Focus Target (Hours)</Label>
                  <span className="text-xs font-bold text-accent">{goalHours} hrs / day</span>
                </div>
                <div className="flex gap-2 mt-1">
                  {[2, 4, 6, 8].map((h) => (
                    <Button
                      key={h}
                      type="button"
                      size="sm"
                      variant={goalHours === h ? "default" : "outline"}
                      className="h-7 text-xs flex-1"
                      onClick={() => setGoalHours(h)}
                    >
                      {h}h
                    </Button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    value={goalHours || ""}
                    onChange={(e) => setGoalHours(parseFloat(e.target.value) || 0)}
                    placeholder="Custom hours"
                    className="h-8 text-xs w-28"
                  />
                  <span className="text-xs text-muted-foreground">hours per day</span>
                </div>
              </div>

              <div className="border-t border-border/50 pt-3">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" /> Study-Hours Visibility
                </Label>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Controls who can view your focus hours and see you on Leaderboards.
                </p>

                <div className="space-y-1.5 text-xs">
                  {[
                    { id: "everyone", label: "Everyone (Includes Public Leaderboards)" },
                    { id: "all_buddies", label: "All Accepted Buddies Only" },
                    { id: "hidden", label: "Hidden (Only you see your hours)" },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className="flex items-center gap-2 p-2 rounded-lg border border-border/40 hover:bg-muted/40 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={opt.id}
                        checked={visibility === opt.id}
                        onChange={() => setVisibility(opt.id as any)}
                        className="text-primary"
                      />
                      <span className="font-medium text-foreground">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => saveSettingsMutation.mutate()}
                disabled={saveSettingsMutation.isPending}
                className="w-full mt-2 bg-primary text-primary-foreground"
              >
                Save Preferences
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Results Drawer */}
      {searchResults.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-display font-semibold text-xs text-foreground uppercase tracking-wider">
              Search Results ({searchResults.length})
            </h4>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSearchResults([])}>
              Close
            </Button>
          </div>
          <div className="divide-y divide-border/40">
            {searchResults.map((user) => (
              <div key={user.user_id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <UserAvatar src={user.avatar_url} name={user.full_name} size={36} />
                  <div>
                    <p className="font-semibold text-xs text-foreground">{user.full_name || "Doctor"}</p>
                    {user.handle && <p className="font-mono text-[11px] text-muted-foreground">@{user.handle}</p>}
                    <p className="text-[11px] text-muted-foreground truncate">{user.college}</p>
                  </div>
                </div>

                {user.user_id !== currentUserId && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-primary/30 text-primary"
                    disabled={sendRequestMutation.isPending}
                    onClick={() => sendRequestMutation.mutate(user.user_id)}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Buddy
                  </Button>
                )}
              </div>
            ))}
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
              <div key={req.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2.5">
                  <UserAvatar src={req.other_user?.avatar_url} name={req.other_user?.full_name} size={34} />
                  <div>
                    <p className="font-semibold text-xs text-foreground">{req.other_user?.full_name || "Doctor"}</p>
                    <p className="text-[11px] text-muted-foreground">{req.other_user?.college}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => respondMutation.mutate({ id: req.id, status: "accepted" })}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => respondMutation.mutate({ id: req.id, status: "declined" })}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Study Buddies List */}
      <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
            <Heart className="h-4 w-4 text-accent" />
            Your Study Buddies ({acceptedBuddies.length})
          </h3>
        </div>

        {buddiesLoading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Loading buddies...</div>
        ) : acceptedBuddies.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="font-display text-sm font-medium text-foreground">No study buddies yet</p>
            <p className="max-w-xs mx-auto">
              Search for your medical college batchmates or add students from the Leaderboards above to study together.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {acceptedBuddies.map((buddy) => {
              const u = buddy.other_user;
              if (!u) return null;
              const name = u.full_name || u.handle || "Doctor";

              return (
                <div
                  key={buddy.id}
                  className="flex flex-col justify-between rounded-xl border border-border/50 bg-background/60 p-3.5 hover:border-accent/40 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <QuickPeekProfileCard user={{ ...u, id: u.id, buddy_status: "accepted" }}>
                      <div className="flex items-center gap-2.5">
                        <UserAvatar src={u.avatar_url} name={name} size={38} />
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-foreground truncate">{name}</p>
                          {u.handle && <p className="font-mono text-[11px] text-muted-foreground">@{u.handle}</p>}
                        </div>
                      </div>
                    </QuickPeekProfileCard>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      title="Remove buddy"
                      onClick={() => removeMutation.mutate(buddy.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Mood pill if set */}
                  {u.todays_mood && (
                    <div className="mt-2 text-[11px] text-accent bg-accent/10 px-2 py-0.5 rounded-full inline-block truncate">
                      {u.todays_mood}
                    </div>
                  )}

                  {/* Quick Silent Cheers bar */}
                  <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Cheer:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => cheerMutation.mutate({ targetId: u.id, reaction: "☕" })}
                        className="rounded p-1 hover:bg-muted text-base transition-transform active:scale-90"
                        title="Keep going! ☕"
                      >
                        ☕
                      </button>
                      <button
                        type="button"
                        onClick={() => cheerMutation.mutate({ targetId: u.id, reaction: "🔥" })}
                        className="rounded p-1 hover:bg-muted text-base transition-transform active:scale-90"
                        title="Locked in! 🔥"
                      >
                        🔥
                      </button>
                      <button
                        type="button"
                        onClick={() => cheerMutation.mutate({ targetId: u.id, reaction: "💪" })}
                        className="rounded p-1 hover:bg-muted text-base transition-transform active:scale-90"
                        title="You got this! 💪"
                      >
                        💪
                      </button>
                    </div>
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
