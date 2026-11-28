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
  Share2,
  UserPlus,
  Link as LinkIcon,
} from "lucide-react";
import {
  sendStudyTogetherInvite,
  fetchUserBuddies,
  type StudyBuddy,
} from "@/lib/library";
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
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<EphemeralMessage[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Shared Group Session State
  const [isSharedSessionActive, setIsSharedSessionActive] = useState(false);
  const [sharedVialCracked, setSharedVialCracked] = useState(false);
  const [sharedVialBreaker, setSharedVialBreaker] = useState<string | null>(null);

  const isCreator = group.created_by === currentUserId;

  const { data: members = [] } = useQuery({
    queryKey: ["group_members", group.id],
    queryFn: () => fetchGroupMembers(group.id),
    refetchInterval: 15000,
  });

  const { data: homies = [] } = useQuery({
    queryKey: ["study_buddies", currentUserId],
    queryFn: () => fetchUserBuddies(currentUserId),
    enabled: !!currentUserId && inviteModalOpen,
  });

  const [invitedHomies, setInvitedHomies] = useState<Set<string>>(new Set());

  const me = members.find((m) => m.user_id === currentUserId);
  const myName = me?.profile?.full_name || me?.profile?.handle || "Doctor";
  const myHandle = me?.profile?.handle || null;

  // Realtime Broadcast Channel (Ephemeral Chat & Shared Session)
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

  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/homies?code=${group.invite_code}`
    : `/homies?code=${group.invite_code}`;

  const copyCode = () => {
    navigator.clipboard.writeText(group.invite_code);
    setCopiedCode(true);
    toast.success("Room code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    toast.success("Invite link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareRoom = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Study Together in "${group.name}" on Elixir`,
          text: `Join my medical study room "${group.name}" on Elixir! Room Code: ${group.invite_code}`,
          url: inviteUrl,
        });
        toast.success("Shared successfully!");
      } catch (err: any) {
        if (err.name !== "AbortError") {
          copyInviteLink();
        }
      }
    } else {
      copyInviteLink();
    }
  };

  const sendHomieInvite = async (homieId: string) => {
    try {
      await sendStudyTogetherInvite(group.id, homieId);
      setInvitedHomies((prev) => new Set([...prev, homieId]));
      toast.success("Study Together invitation sent!");
    } catch {
      toast.error("Could not send invite");
    }
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

    setMessages((prev) => [...prev, newMsg]);
    setChatMessage("");

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
    if (members.length < 2) {
      toast.error("At least 2 members are required to start a shared session.");
      return;
    }
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
  const memberGoalHours = group.daily_goal_minutes ? group.daily_goal_minutes / 60 : 4;
  const canStartSession = members.length >= 2;

  // Filter homies not already in group
  const memberUserIds = new Set(members.map((m) => m.user_id));
  const availableHomiesToInvite = homies.filter((h) => {
    const friendId = h.requester_id === currentUserId ? h.addressee_id : h.requester_id;
    return !memberUserIds.has(friendId);
  });

  return (
    <div className="space-y-5">
      {/* Room Header bar */}
      <div className="rounded-2xl border border-[#0D4347] bg-[#082428] p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 w-8 p-0 text-[#F7F5F0]/80 hover:text-[#E5B95C] hover:bg-[#0D4347]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-[#F7F5F0] text-lg">{group.name}</h3>
                {isCreator && (
                  <span className="rounded-full bg-[#E5B95C]/20 border border-[#E5B95C]/30 px-2 py-0.5 text-[10px] font-bold text-[#E5B95C]">
                    Creator
                  </span>
                )}
              </div>
              {group.description && (
                <p className="text-xs text-[#F7F5F0]/65 mt-0.5">{group.description}</p>
              )}
            </div>
          </div>

          {/* Action Row: Copy Link, Share, Invite Homie */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyInviteLink}
              className="h-8 text-xs font-semibold text-[#0D4347] border-[#0D4347]/30 bg-[#F4F1EA] hover:bg-[#E8E2D5] gap-1.5 shadow-sm"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <LinkIcon className="h-3.5 w-3.5" />}
              Copy Invite Link
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={shareRoom}
              className="h-8 text-xs font-semibold text-[#082428] bg-[#E5B95C] hover:bg-[#E5B95C]/90 border-none gap-1.5 shadow-sm"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setInviteModalOpen(true)}
              className="h-8 text-xs font-semibold text-[#F7F5F0] bg-[#0D4347] hover:bg-[#165E63] border border-[#0D4347] gap-1.5"
            >
              <UserPlus className="h-3.5 w-3.5 text-[#E5B95C]" /> Invite Homie
            </Button>

            <button
              type="button"
              onClick={copyCode}
              className="h-8 px-2.5 rounded-lg border border-[#E5B95C]/40 bg-[#082428] font-mono text-xs text-[#E5B95C] hover:border-[#E5B95C] transition-colors flex items-center gap-1.5"
              title="Click to copy code"
            >
              {copiedCode ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              Code: {group.invite_code}
            </button>
          </div>
        </div>

        {/* Start Shared Session CTA with 2-Member Gate */}
        <div className="pt-2 border-t border-[#0D4347] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[#E5B95C]" />
            <span className="text-xs font-semibold text-[#F7F5F0]">
              Per-Member Goal: <strong className="text-[#E5B95C]">{memberGoalHours}h</strong> / day
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isSharedSessionActive ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={startSharedSession}
                  disabled={!canStartSession}
                  className="h-8 gap-1.5 text-xs bg-[#E5B95C] text-[#082428] font-bold hover:bg-[#E5B95C]/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  <Flame className="h-3.5 w-3.5 fill-[#082428]" /> Start Shared Session
                </Button>
                {!canStartSession && (
                  <span className="text-[11px] text-[#F7F5F0]/60 italic">
                    Waiting for at least 1 Homie to accept & join...
                  </span>
                )}
              </div>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                onClick={triggerSharedGiveUp}
                className="h-8 gap-1.5 text-xs font-bold"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Give Up (Breaks Vial)
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Grid: Members Per-Member Goal Cards + Ephemeral Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Members Grid with Per-Member Goal (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-semibold text-[#F7F5F0] text-sm flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E5B95C] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E5B95C]" />
              </span>
              Study Chamber ({members.length} {members.length === 1 ? "member" : "members"} • {activelyStudyingMembers.length} studying now)
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {members.map((member) => {
              const p = member.profile;
              const name = p?.full_name || p?.handle || "Doctor";
              const isMe = member.user_id === currentUserId;
              const memberActiveSecs = member.active_seconds || 0;
              const memberGoalSecs = memberGoalHours * 3600;
              const memberPct = Math.min(100, Math.round((memberActiveSecs / memberGoalSecs) * 100));

              return (
                <div
                  key={member.user_id}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition-all shadow-md ${
                    member.is_studying
                      ? "border-[#E5B95C]/60 bg-[#082428] ring-1 ring-[#E5B95C]/30"
                      : "border-[#0D4347] bg-[#082428]/80"
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
                      <div className="flex items-center gap-2.5 cursor-pointer">
                        <UserAvatar src={p?.avatar_url} name={name} size={36} />
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-[#F7F5F0] truncate">
                            {name} {isMe && <span className="text-[10px] text-[#E5B95C] font-bold">(You)</span>}
                          </p>
                          {p?.handle && (
                            <p className="font-mono text-[10px] text-[#F7F5F0]/60">@{p.handle}</p>
                          )}
                          {p?.college && (
                            <p className="text-[10px] text-[#E5B95C] truncate">{p.college}</p>
                          )}
                        </div>
                      </div>
                    </QuickPeekProfileCard>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-[#0D4347] text-[#F7F5F0]/70">
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
                          className="p-1 rounded text-[#F7F5F0]/40 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                          title="Remove member"
                        >
                          <UserX className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Per-Member Individual Goal Progress Bar */}
                  <div className="mt-3.5 pt-3 border-t border-[#0D4347] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-[#F7F5F0]/70">Today's Progress</span>
                      <span className="font-mono text-[11px] font-bold text-[#E5B95C]">
                        {(memberActiveSecs / 3600).toFixed(1)} / {memberGoalHours}h
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#0D4347] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#E5B95C] transition-all duration-300"
                        style={{ width: `${memberPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Active Subject Status */}
                  <div className="mt-2.5 text-xs">
                    {member.is_studying && member.active_subject ? (
                      <div className="rounded-lg bg-[#0D4347]/60 border border-[#0D4347] px-2.5 py-1 text-xs text-[#E5B95C] flex items-center justify-between">
                        <span className="truncate">{subjectLabel(member.active_subject)}</span>
                        <span className="font-mono text-[10px] ml-1">
                          {formatFocusDuration(memberActiveSecs)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[#F7F5F0]/40 text-[11px]">Not studying right now</span>
                    )}
                  </div>

                  {/* Silent Cheers */}
                  {member.is_studying && !isMe && (
                    <div className="mt-2 flex items-center justify-end gap-1 pt-1.5 border-t border-[#0D4347]">
                      <span className="text-[10px] text-[#F7F5F0]/50 mr-1">Cheer:</span>
                      {["☕", "🔥", "💪"].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => cheerMutation.mutate({ recipientId: member.user_id, reaction: emoji })}
                          className="rounded hover:bg-[#0D4347] p-1 text-sm active:scale-90"
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

        {/* Ephemeral Realtime Group Chat Panel */}
        <div className="rounded-2xl border border-[#0D4347] bg-[#082428] p-4 shadow-xl flex flex-col h-[520px]">
          <div className="mb-2 pb-2 border-b border-[#0D4347] flex items-center justify-between">
            <h4 className="font-display font-semibold text-[#F7F5F0] text-sm">
              Room Live Chat
            </h4>
            <span className="text-[10px] text-[#F7F5F0]/50 font-mono bg-[#0D4347]/60 px-2 py-0.5 rounded">
              Ephemeral (No History)
            </span>
          </div>

          <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            {messages.length === 0 ? (
              <div className="py-20 text-center text-[#F7F5F0]/40 text-xs space-y-1">
                <p>No active messages in this session.</p>
                <p className="text-[11px] text-[#F7F5F0]/30">
                  Messages exist only while the room is open.
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
                      <span className="text-[10px] font-semibold text-[#E5B95C] mb-0.5">
                        {m.sender_handle ? `@${m.sender_handle}` : m.sender_name || "Doctor"}
                      </span>
                    )}
                    <div
                      className={`rounded-xl px-3 py-1.5 max-w-[85%] break-words ${
                        isMine
                          ? "bg-[#E5B95C] text-[#082428] font-medium rounded-br-none"
                          : "bg-[#0D4347] text-[#F7F5F0] rounded-bl-none"
                      }`}
                    >
                      <p>{m.message}</p>
                    </div>
                    <span className="text-[9px] text-[#F7F5F0]/40 mt-0.5">{timeStr}</span>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={sendEphemeralChat} className="mt-3 flex gap-2 pt-2 border-t border-[#0D4347]">
            <Input
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Live message to room..."
              className="h-8 text-xs bg-[#0D4347]/60 border-[#0D4347] text-[#F7F5F0] placeholder:text-[#F7F5F0]/40"
              maxLength={300}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!chatMessage.trim()}
              className="h-8 px-2.5 bg-[#E5B95C] text-[#082428] font-bold hover:bg-[#E5B95C]/90"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      </div>

      {/* Invite Homie Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="max-w-md bg-[#082428] border border-[#0D4347] text-[#F7F5F0] p-6 shadow-2xl">
          <DialogHeader className="text-left pb-3 border-b border-[#0D4347]">
            <DialogTitle className="text-[#E5B95C] font-display text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Invite Homies to Room
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            {availableHomiesToInvite.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#F7F5F0]/60 space-y-1">
                <p>All your accepted Homies are already in this room, or you have not added any Homies yet.</p>
                <p className="text-[11px] text-[#E5B95C]">Share your invite code with batchmates!</p>
              </div>
            ) : (
              availableHomiesToInvite.map((h) => {
                const friendId = h.requester_id === currentUserId ? h.addressee_id : h.requester_id;
                const friendProfile = h.profile;
                const friendName = friendProfile?.full_name || friendProfile?.handle || "Doctor";
                const isInvited = invitedHomies.has(friendId);

                return (
                  <div
                    key={h.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#0D4347]/40 border border-[#0D4347] p-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <UserAvatar src={friendProfile?.avatar_url} name={friendName} size={36} />
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-[#F7F5F0] truncate">{friendName}</p>
                        {friendProfile?.college && (
                          <p className="text-[10px] text-[#E5B95C] truncate">{friendProfile.college}</p>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      disabled={isInvited}
                      onClick={() => sendHomieInvite(friendId)}
                      className={`h-7 px-3 text-xs font-semibold ${
                        isInvited
                          ? "bg-[#082428] text-[#E5B95C] border border-[#E5B95C]/40"
                          : "bg-[#E5B95C] text-[#082428] font-bold hover:bg-[#E5B95C]/90"
                      }`}
                    >
                      {isInvited ? "Invited ✓" : "Invite"}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
