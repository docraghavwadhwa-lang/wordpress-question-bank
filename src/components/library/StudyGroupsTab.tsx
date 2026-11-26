import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUserGroups,
  createStudyGroup,
  joinStudyGroupByCode,
  fetchGroupMembers,
  fetchGroupMessages,
  sendGroupMessage,
  sendStudyCheer,
  type StudyGroup,
  type StudyGroupMember,
  type StudyGroupMessage,
} from "@/lib/library";
import { UserAvatar } from "@/components/qbank/AppHeader";
import { QuickPeekProfileCard } from "./QuickPeekProfileCard";
import { subjectLabel } from "@/lib/subjects";
import { formatFocusDuration } from "@/lib/apothecary";
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
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface StudyGroupsTabProps {
  currentUserId: string;
}

export function StudyGroupsTab({ currentUserId }: StudyGroupsTabProps) {
  const qc = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupGoalHours, setGroupGoalHours] = useState(20);
  const [joinCode, setJoinCode] = useState("");

  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["user_study_groups", currentUserId],
    queryFn: () => fetchUserGroups(currentUserId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createStudyGroup({
        userId: currentUserId,
        name: groupName,
        description: groupDesc,
        dailyGoalMinutes: groupGoalHours * 60,
      }),
    onSuccess: (newGroup) => {
      toast.success(`Study group "${newGroup.name}" created!`);
      setCreateModalOpen(false);
      setGroupName("");
      setGroupDesc("");
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
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 flex-1 sm:flex-initial">
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
              <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground flex-1 sm:flex-initial">
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
                    placeholder="Our daily goal is 200 PYQs + 4h deep focus on Surgery & Med."
                    className="mt-1 text-xs"
                    rows={2}
                    maxLength={200}
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Daily Collective Goal (Hours)</Label>
                  <div className="flex gap-2 mt-1">
                    {[10, 20, 30, 50].map((h) => (
                      <Button
                        key={h}
                        type="button"
                        size="sm"
                        variant={groupGoalHours === h ? "default" : "outline"}
                        className="h-7 text-xs flex-1"
                        onClick={() => setGroupGoalHours(h)}
                      >
                        {h}h / day
                      </Button>
                    ))}
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
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {group.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <KeyRound className="h-3 w-3 text-accent" /> Code: {group.invite_code}
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <Target className="h-3 w-3 text-primary" /> Goal: {group.daily_goal_minutes / 60}h
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const { data: members = [] } = useQuery({
    queryKey: ["group_members", group.id],
    queryFn: () => fetchGroupMembers(group.id),
    refetchInterval: 15000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["group_messages", group.id],
    queryFn: () => fetchGroupMessages(group.id),
    refetchInterval: 5000,
  });

  // Listen for Supabase Realtime broadcast or inserts for group messages
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const channel = client
      .channel(`group-chat-${group.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "study_group_messages",
          filter: `group_id=eq.${group.id}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["group_messages", group.id] });
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [group.id, qc]);

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

  const sendMessageMutation = useMutation({
    mutationFn: () => sendGroupMessage(group.id, currentUserId, chatMessage),
    onSuccess: () => {
      setChatMessage("");
      void qc.invalidateQueries({ queryKey: ["group_messages", group.id] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to post message"),
  });

  const cheerMutation = useMutation({
    mutationFn: ({ recipientId, reaction }: { recipientId: string; reaction: string }) =>
      sendStudyCheer(recipientId, reaction),
    onSuccess: () => toast.success("Silent cheer sent to groupmate!"),
    onError: () => toast.error("Could not send cheer"),
  });

  // Calculate live collective hours from active + today's members
  const activelyStudyingMembers = members.filter((m) => m.is_studying);
  const activeFocusSeconds = members.reduce((sum, m) => sum + (m.active_seconds || 0), 0);
  const goalSeconds = group.daily_goal_minutes * 60;
  const progressPercent = Math.min(100, Math.round((activeFocusSeconds / goalSeconds) * 100));

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/60 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h3 className="font-display font-bold text-foreground text-base">{group.name}</h3>
            {group.description && <p className="text-xs text-muted-foreground">{group.description}</p>}
          </div>
        </div>

        {/* Invite Code Badge */}
        <Button
          variant="outline"
          size="sm"
          onClick={copyInvite}
          className="h-8 gap-1.5 font-mono text-xs border-accent/40 text-accent"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          Invite Code: {group.invite_code}
        </Button>
      </div>

      {/* Shared Group Goal Progress Bar */}
      <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-accent" />
            Group Goal: {group.daily_goal_minutes / 60} hrs today
          </span>
          <span className="font-mono font-bold text-accent">
            {formatFocusDuration(activeFocusSeconds)} logged ({progressPercent}%)
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Two Column Grid: Active Study Chamber + Group Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Active Members Grid (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Study Chamber ({members.length} members • {activelyStudyingMembers.length} studying right now)
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
                        <UserAvatar src={p?.avatar_url} name={name} size={38} />
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-foreground truncate">
                            {name} {isMe && <span className="text-[10px] text-accent font-bold">(You)</span>}
                          </p>
                          {p?.handle && <p className="font-mono text-[11px] text-muted-foreground">@{p.handle}</p>}
                        </div>
                      </div>
                    </QuickPeekProfileCard>

                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-border/40 text-muted-foreground">
                      {member.role}
                    </span>
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
                      <span className="text-muted-foreground/70 text-[11px] italic">Not studying right now</span>
                    )}
                  </div>

                  {/* Silent Cheers on active members */}
                  {member.is_studying && !isMe && (
                    <div className="mt-2 flex items-center justify-end gap-1 pt-2 border-t border-border/30">
                      <span className="text-[10px] text-muted-foreground mr-1">Cheer:</span>
                      <button
                        type="button"
                        onClick={() => cheerMutation.mutate({ recipientId: member.user_id, reaction: "☕" })}
                        className="rounded hover:bg-muted p-1 text-sm active:scale-90"
                        title="Keep going! ☕"
                      >
                        ☕
                      </button>
                      <button
                        type="button"
                        onClick={() => cheerMutation.mutate({ recipientId: member.user_id, reaction: "🔥" })}
                        className="rounded hover:bg-muted p-1 text-sm active:scale-90"
                        title="Locked in! 🔥"
                      >
                        🔥
                      </button>
                      <button
                        type="button"
                        onClick={() => cheerMutation.mutate({ recipientId: member.user_id, reaction: "💪" })}
                        className="rounded hover:bg-muted p-1 text-sm active:scale-90"
                        title="You got this! 💪"
                      >
                        💪
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Realtime Group Chat Panel (1 Col) */}
        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm flex flex-col h-[520px]">
          <h4 className="font-display font-semibold text-foreground text-sm mb-2 pb-2 border-b border-border/40">
            Group Chat
          </h4>

          {/* Messages list */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            {messages.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground text-xs italic">
                No messages yet. Send a note to cheer your squad!
              </div>
            ) : (
              messages.map((m) => {
                const isMine = m.user_id === currentUserId;
                const timeStr = new Intl.DateTimeFormat("en-IN", {
                  timeZone: "Asia/Kolkata",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(m.created_at));

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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (chatMessage.trim()) sendMessageMutation.mutate();
            }}
            className="mt-3 flex gap-2 pt-2 border-t border-border/40"
          >
            <Input
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Send message to group..."
              className="h-8 text-xs"
              maxLength={300}
            />
            <Button
              type="submit"
              size="sm"
              disabled={sendMessageMutation.isPending || !chatMessage.trim()}
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
