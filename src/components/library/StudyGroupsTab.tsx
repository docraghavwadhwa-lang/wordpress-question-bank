import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUserGroups,
  createStudyGroup,
  joinStudyGroupByCode,
  fetchGroupMembers,
  sendStudyCheer,
  removeStudyGroupMember,
  type StudyGroup,
  type StudyGroupMember,
} from "@/lib/library";
import { UserAvatar } from "@/components/qbank/AppHeader";
import { QuickPeekProfileCard } from "./QuickPeekProfileCard";
import { subjectLabel } from "@/lib/subjects";
import { formatFocusDuration } from "@/lib/apothecary";
import { ApothecaryFlask } from "./ApothecaryFlask";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  Plus,
  KeyRound,
  Send,
  Target,
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  UserX,
  Flame,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface StudyGroupsTabProps {
  currentUserId: string;
}

interface EphemeralMessage {
  id: string;
  user_id: string;
  sender_name: string;
  sender_handle: string | null;
  message: string;
  timestamp: string;
}

export function StudyGroupsTab({ currentUserId }: StudyGroupsTabProps) {
  const qc = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [memberGoalHours, setMemberGoalHours] = useState(3);
  const [customGoalInput, setCustomGoalInput] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["user_study_groups", currentUserId],
    queryFn: () => fetchUserGroups(currentUserId),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const targetHours = customGoalInput ? parseFloat(customGoalInput) || 3 : memberGoalHours;
      return createStudyGroup({
        userId: currentUserId,
        name: groupName,
        description: groupDesc,
        dailyGoalMinutes: Math.round(targetHours * 60),
      });
    },
    onSuccess: (newGroup) => {
      toast.success(`Study group "${newGroup.name}" created!`);
      setCreateModalOpen(false);
      setGroupName("");
      setGroupDesc("");
      setCustomGoalInput("");
      setSelectedGroup(newGroup);
      void qc.invalidateQueries({ queryKey: ["user_study_groups"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create group"),
  });

  const joinMutation = useMutation({
    mutationFn: () => joinStudyGroupByCode(joinCode, currentUserId),
    onSuccess: (joinedGroup) => {
      toast.success(`Joined "${joinedGroup.name}"!`);
      setJoinModalOpen(false);
      setJoinCode("");
      setSelectedGroup(joinedGroup);
      void qc.invalidateQueries({ queryKey: ["user_study_groups"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to join group"),
  });

  if (selectedGroup) {
    return (
      <GroupRoomView
        group={selectedGroup}
        currentUserId={currentUserId}
        onBack={() => setSelectedGroup(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-4 rounded-xl border border-border/60 shadow-sm">
        <div>
          <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Study Groups
          </h3>
          <p className="text-xs text-muted-foreground">
            Form small accountability circles with your batchmates to study together in real time.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Join by Code Modal */}
          <Dialog open={joinModalOpen} onOpenChange={setJoinModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5 flex-1 sm:flex-initial text-[#0D4347] border-[#0D4347]/20 bg-[#F4F1EA] hover:bg-[#E8E2D5] shadow-sm">
                <KeyRound className="h-3.5 w-3.5" /> Join with Code
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm p-6">
              <DialogHeader>
                <DialogTitle className="font-display text-lg">Join Study Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label className="text-xs font-semibold">6-Character Invite Code</Label>
                  <Input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 8K2M9P"
                    className="mt-1 font-mono text-center tracking-widest text-base uppercase"
                    maxLength={10}
                  />
                </div>
                <Button
                  onClick={() => joinMutation.mutate()}
                  disabled={joinMutation.isPending || !joinCode.trim()}
                  className="w-full bg-primary text-primary-foreground"
                >
                  Join Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Create Group Modal */}
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs font-semibold gap-1.5 bg-[#E5B95C] text-[#082428] hover:bg-[#E5B95C]/90 shadow-sm flex-1 sm:flex-initial">
                <Plus className="h-3.5 w-3.5" /> Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md p-6">
              <DialogHeader>
                <DialogTitle className="font-display text-lg">Create a Study Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-3.5 py-2">
                <div>
                  <Label className="text-xs font-semibold">Group Name</Label>
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. AIIMS Batch 2022 • Final Year Squad"
                    className="mt-1 text-xs"
                    maxLength={60}
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Description (Optional)</Label>
                  <Textarea
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    placeholder="Our squad goal is 200 PYQs + 4h deep focus on Surgery & Med."
                    className="mt-1 text-xs"
                    rows={2}
                    maxLength={200}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Member Daily Goal (Hours/Day)</Label>
                    <span className="text-xs font-bold text-accent">
                      {customGoalInput ? `${customGoalInput}h` : `${memberGoalHours}h`} / member
                    </span>
                  </div>
                  <div className="flex gap-2 mt-1.5">
                    {[2, 3, 4, 6].map((h) => (
                      <Button
                        key={h}
                        type="button"
                        size="sm"
                        variant={!customGoalInput && memberGoalHours === h ? "default" : "outline"}
                        className="h-7 text-xs flex-1"
                        onClick={() => {
                          setMemberGoalHours(h);
                          setCustomGoalInput("");
                        }}
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
                      value={customGoalInput}
                      onChange={(e) => setCustomGoalInput(e.target.value)}
                      placeholder="Custom hours"
                      className="h-8 text-xs w-28"
                    />
                    <span className="text-xs text-muted-foreground">custom hours / day per member</span>
                  </div>
                </div>

                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !groupName.trim()}
                  className="w-full mt-2 bg-primary text-primary-foreground"
                >
                  Create & Get Invite Code
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Groups Grid */}
      {groupsLoading ? (
        <div className="py-16 text-center text-xs text-muted-foreground">Loading study groups...</div>
      ) : groups.length === 0 ? (
        <div className="py-16 text-center text-xs text-muted-foreground space-y-2 rounded-xl border border-border/60 bg-card p-6">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="font-display text-sm font-medium text-foreground">You haven't joined any groups yet</p>
          <p className="max-w-xs mx-auto">
            Create a private study group for your college friends or enter an invite code to join one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              onClick={() => setSelectedGroup(group)}
              className="group cursor-pointer rounded-xl border border-border/60 bg-card p-4 hover:border-accent/50 hover:shadow-md transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-display font-semibold text-foreground text-sm group-hover:text-primary transition-colors truncate">
                    {group.name}
                  </h4>
                  {group.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{group.description}</p>
                  )}
                </div>
                <span className="shrink-0 font-mono text-[11px] font-semibold text-accent px-2 py-0.5 rounded bg-accent/10">
                  {group.invite_code}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-2.5">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> Squad
                </span>
                <span className="font-medium text-foreground">
                  Goal: {Math.round(group.daily_goal_minutes / 60)}h / member
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Group Room View (Active Chamber, Shared Vial, Ephemeral Chat)
// -------------------------------------------------------------
function GroupRoomView({
  group,
  currentUserId,
  onBack,
}: {
  group: StudyGroup;
  currentUserId: string;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  // Ephemeral live chat messages (zero DB persistence)
  const [messages, setMessages] = useState<EphemeralMessage[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Shared Group Vial State
  const [isSharedSessionActive, setIsSharedSessionActive] = useState(false);
  const [sharedVialCracked, setSharedVialCracked] = useState(false);
  const [sharedVialBreaker, setSharedVialBreaker] = useState<string | null>(null);

  const isCreator = group.created_by === currentUserId;

  const { data: members = [] } = useQuery({
    queryKey: ["group_members", group.id],
    queryFn: () => fetchGroupMembers(group.id),
    refetchInterval: 15000,
  });

  const me = members.find((m) => m.user_id === currentUserId);
  const myName = me?.profile?.full_name || me?.profile?.handle || "Doctor";
  const myHandle = me?.profile?.handle || null;

  // Realtime Broadcast Channel (Ephemeral Chat & Shared Group Session)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const channel = client.channel(`study-group-${group.id}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "chat_message" }, ({ payload }: { payload: EphemeralMessage }) => {
        setMessages((prev) => [...prev, payload]);
      })
      .on("broadcast", { event: "shared_session_started" }, ({ payload }: { payload: { starter: string } }) => {
        setIsSharedSessionActive(true);
        setSharedVialCracked(false);
        setSharedVialBreaker(null);
        toast.info(`${payload.starter} started a Shared Group Distillation Session!`);
      })
      .on("broadcast", { event: "shared_vial_shattered" }, ({ payload }: { payload: { breakerName: string } }) => {
        setSharedVialCracked(true);
        setIsSharedSessionActive(false);
        setSharedVialBreaker(payload.breakerName);
        toast.error(`⚠️ Shared Group Vial shattered! ${payload.breakerName} gave up.`, { duration: 6000 });
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [group.id]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const copyInvite = () => {
    navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    toast.success("Invite code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const sendEphemeralChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const newMsg: EphemeralMessage = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      user_id: currentUserId,
      sender_name: myName,
      sender_handle: myHandle,
      message: chatMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    // Add to local state immediately
    setMessages((prev) => [...prev, newMsg]);
    setChatMessage("");

    // Broadcast live to everyone in the room
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const channel = client.channel(`study-group-${group.id}`);
    channel.send({
      type: "broadcast",
      event: "chat_message",
      payload: newMsg,
    });
  };

  const startSharedSession = () => {
    setIsSharedSessionActive(true);
    setSharedVialCracked(false);
    setSharedVialBreaker(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const channel = client.channel(`study-group-${group.id}`);
    channel.send({
      type: "broadcast",
      event: "shared_session_started",
      payload: { starter: myName },
    });
    toast.success("Shared Group Session initiated! Study together to fill the group flask.");
  };

  const triggerSharedGiveUp = () => {
    setSharedVialCracked(true);
    setIsSharedSessionActive(false);
    setSharedVialBreaker("You");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const channel = client.channel(`study-group-${group.id}`);
    channel.send({
      type: "broadcast",
      event: "shared_vial_shattered",
      payload: { breakerName: myName },
    });
    toast.error("You gave up. The shared group vial broke for everyone in the session.");
  };

  const removeMemberMutation = useMutation({
    mutationFn: (targetUserId: string) => removeStudyGroupMember(group.id, targetUserId),
    onSuccess: () => {
      toast.success("Member removed from group");
      void qc.invalidateQueries({ queryKey: ["group_members", group.id] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to remove member"),
  });

  const cheerMutation = useMutation({
    mutationFn: ({ recipientId, reaction }: { recipientId: string; reaction: string }) =>
      sendStudyCheer(recipientId, reaction),
    onSuccess: () => toast.success("Silent cheer sent to groupmate!"),
    onError: () => toast.error("Could not send cheer"),
  });

  const activelyStudyingMembers = members.filter((m) => m.is_studying);
  const activeFocusSeconds = members.reduce((sum, m) => sum + (m.active_seconds || 0), 0);
  const memberGoalHours = group.daily_goal_minutes / 60;
  const collectiveTargetSeconds = members.length * group.daily_goal_minutes * 60;
  const progressPercent =
    collectiveTargetSeconds > 0
      ? Math.min(100, Math.round((activeFocusSeconds / collectiveTargetSeconds) * 100))
      : 0;

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/60 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-foreground text-base">{group.name}</h3>
              {isCreator && (
                <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                  Creator
                </span>
              )}
            </div>
            {group.description && <p className="text-xs text-muted-foreground">{group.description}</p>}
          </div>
        </div>

        {/* Invite Code & Shared Session CTA */}
        <div className="flex items-center gap-2">
          {!isSharedSessionActive ? (
            <Button
              size="sm"
              onClick={startSharedSession}
              className="h-8 gap-1.5 text-xs bg-accent text-accent-foreground font-semibold hover:bg-accent/90"
            >
              <Flame className="h-3.5 w-3.5" /> Start Shared Session
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              onClick={triggerSharedGiveUp}
              className="h-8 gap-1.5 text-xs"
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Give Up (Breaks Vial)
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={copyInvite}
            className="h-8 gap-1.5 font-mono text-xs border-accent/40 text-accent"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Code: {group.invite_code}
          </Button>
        </div>
      </div>

      {/* Shared Group Flask / Goal Banner */}
      <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <ApothecaryFlask
              fillPercent={sharedVialCracked ? 100 : progressPercent}
              durationMinutes={Math.round(memberGoalHours * 60)}
              status={sharedVialCracked ? "abandoned" : isSharedSessionActive ? "running" : "completed"}
              size={68}
              showLabels={false}
            />
            <div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-accent" />
                <h4 className="font-semibold text-sm text-foreground">
                  Member Goal: {memberGoalHours} hrs / day
                </h4>
                {isSharedSessionActive && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent/20 text-accent animate-pulse">
                    LIVE SHARED VIAL
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {sharedVialCracked
                  ? `Group vial cracked! ${sharedVialBreaker || "A member"} gave up.`
                  : `${formatFocusDuration(activeFocusSeconds)} collective hours logged today across ${members.length} members`}
              </p>
            </div>
          </div>
          <span className="font-mono text-sm font-bold text-accent">
            {progressPercent}% completed
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              sharedVialCracked
                ? "bg-destructive"
                : "bg-gradient-to-r from-primary to-accent"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Two Column Grid: Active Chamber + Ephemeral Group Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Active Members Grid (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Study Chamber ({members.length} members • {activelyStudyingMembers.length} studying now)
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {members.map((member) => {
              const p = member.profile;
              const name = p?.full_name || p?.handle || "Doctor";
              const isMe = member.user_id === currentUserId;

              return (
                <div
                  key={member.user_id}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 transition-all shadow-sm ${
                    member.is_studying
                      ? "border-accent/60 bg-accent/5 ring-1 ring-accent/30"
                      : "border-border/50 bg-card/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <QuickPeekProfileCard
                      user={{
                        id: member.user_id,
                        full_name: p?.full_name || null,
                        handle: p?.handle || null,
                        college: p?.college || null,
                        study_year: p?.study_year || null,
                        avatar_url: p?.avatar_url || null,
                        dream_specialisation: p?.dream_specialisation || null,
                        todays_mood: p?.todays_mood || null,
                        is_studying: member.is_studying,
                        active_subject: member.active_subject,
                        active_seconds: member.active_seconds,
                      }}
                      isCurrentViewer={isMe}
                    >
                      <div className="flex items-center gap-2.5">
                        <UserAvatar src={p?.avatar_url} name={name} size={36} />
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-foreground truncate">
                            {name} {isMe && <span className="text-[10px] text-accent font-bold">(You)</span>}
                          </p>
                          {p?.handle && <p className="font-mono text-[11px] text-muted-foreground">@{p.handle}</p>}
                        </div>
                      </div>
                    </QuickPeekProfileCard>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-border/40 text-muted-foreground">
                        {member.role}
                      </span>
                      {isCreator && !isMe && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Remove ${name} from this group?`)) {
                              removeMemberMutation.mutate(member.user_id);
                            }
                          }}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remove member from group"
                        >
                          <UserX className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Study Status */}
                  <div className="mt-3 text-xs">
                    {member.is_studying && member.active_subject ? (
                      <div className="rounded-lg bg-accent/15 px-2.5 py-1.5 font-medium text-accent flex items-center justify-between">
                        <span className="truncate">{subjectLabel(member.active_subject)}</span>
                        <span className="font-mono font-bold text-[11px] ml-2">
                          {formatFocusDuration(member.active_seconds || 0)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/70 text-[11px]">Not studying right now</span>
                    )}
                  </div>

                  {/* Silent Cheers on active members */}
                  {member.is_studying && !isMe && (
                    <div className="mt-2 flex items-center justify-end gap-1 pt-2 border-t border-border/30">
                      <span className="text-[10px] text-muted-foreground mr-1">Cheer:</span>
                      {["☕", "🔥", "💪"].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => cheerMutation.mutate({ recipientId: member.user_id, reaction: emoji })}
                          className="rounded hover:bg-muted p-1 text-sm active:scale-90"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Ephemeral Realtime Group Chat Panel (1 Col - No History) */}
        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm flex flex-col h-[520px]">
          <div className="mb-2 pb-2 border-b border-border/40 flex items-center justify-between">
            <h4 className="font-display font-semibold text-foreground text-sm">
              Live Chat
            </h4>
            <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded">
              Ephemeral (No History)
            </span>
          </div>

          {/* Messages list */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            {messages.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground text-xs space-y-1">
                <p>No active messages in this session.</p>
                <p className="text-[11px] text-muted-foreground/60">
                  Messages exist only while the app is open.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isMine = m.user_id === currentUserId;
                const timeStr = new Intl.DateTimeFormat("en-IN", {
                  timeZone: "Asia/Kolkata",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(m.timestamp));

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                  >
                    {!isMine && (
                      <span className="text-[10px] font-semibold text-muted-foreground mb-0.5">
                        {m.sender_handle ? `@${m.sender_handle}` : m.sender_name || "Doctor"}
                      </span>
                    )}
                    <div
                      className={`rounded-xl px-3 py-1.5 max-w-[85%] break-words ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-muted text-foreground rounded-bl-none"
                      }`}
                    >
                      <p>{m.message}</p>
                    </div>
                    <span className="text-[9px] text-muted-foreground/60 mt-0.5">{timeStr}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat input */}
          <form onSubmit={sendEphemeralChat} className="mt-3 flex gap-2 pt-2 border-t border-border/40">
            <Input
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Live message to group..."
              className="h-8 text-xs"
              maxLength={300}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!chatMessage.trim()}
              className="h-8 px-2.5 bg-primary text-primary-foreground"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
