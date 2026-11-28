import { StudyTogetherRequestsSection } from "./StudyTogetherRequestsSection";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUserGroups,
  createStudyGroup,
  joinStudyGroupByCode,
  fetchUserBuddies,
  fetchSameCollegeStudents,
  sendBuddyRequest,
  type StudyGroup,
  type LeaderboardEntry,
} from "@/lib/library";
import { UserAvatar } from "@/components/common/UserAvatar";
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
  Users,
  Plus,
  KeyRound,
  GraduationCap,
  Sparkles,
  ArrowLeft,
  UserPlus,
  Flame,
  ArrowRight,
  School,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { StudyGroupsTab } from "./StudyGroupsTab";

interface StudyTogetherViewProps {
  currentUserId: string;
  userCollege?: string | null;
  onBackToTimer: () => void;
  onOpenSettings?: () => void;
}

export function StudyTogetherView({
  currentUserId,
  userCollege,
  onBackToTimer,
  onOpenSettings,
}: StudyTogetherViewProps) {
  const qc = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);

  // Modals
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupGoalHours, setNewGroupGoalHours] = useState(4);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());

  // Existing Groups
  const groupsQuery = useQuery({
    queryKey: ["user_study_groups", currentUserId],
    queryFn: () => fetchUserGroups(currentUserId),
    enabled: !!currentUserId,
  });

  // Existing Buddies (to filter suggestions)
  const buddiesQuery = useQuery({
    queryKey: ["study_buddies", currentUserId],
    queryFn: () => fetchUserBuddies(currentUserId),
    enabled: !!currentUserId,
  });

  const buddyIds = new Set(
    (buddiesQuery.data ?? []).map((b) =>
      b.requester_id === currentUserId ? b.addressee_id : b.requester_id
    )
  );

  // College Suggestions Query
  const collegeSuggestionsQuery = useQuery({
    queryKey: ["college_suggestions", currentUserId, userCollege],
    queryFn: () =>
      userCollege ? fetchSameCollegeStudents(currentUserId, userCollege) : Promise.resolve([]),
    enabled: !!currentUserId && !!userCollege && userCollege.trim().length > 0,
  });

  // Join Group Mutation
  const joinMutation = useMutation({
    mutationFn: () => joinStudyGroupByCode(joinCode.trim(), currentUserId),
    onSuccess: (joinedGroup) => {
      toast.success(`Joined "${joinedGroup.name}"!`);
      setJoinModalOpen(false);
      setJoinCode("");
      void qc.invalidateQueries({ queryKey: ["user_study_groups"] });
      setSelectedGroup(joinedGroup);
    },
    onError: (err: any) => {
      toast.error(err.message || "Invalid or expired room code");
    },
  });

  // Create Group Mutation
  const createMutation = useMutation({
    mutationFn: () =>
      createStudyGroup(
        newGroupName.trim(),
        "Study Together Room",
        newGroupGoalHours * 60,
        currentUserId
      ),
    onSuccess: (newGroup) => {
      toast.success(`Study Room "${newGroup.name}" created! Code: ${newGroup.invite_code}`);
      setCreateModalOpen(false);
      setNewGroupName("");
      void qc.invalidateQueries({ queryKey: ["user_study_groups"] });
      setSelectedGroup(newGroup);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create study room");
    },
  });

  // Send Buddy Request Mutation
  const sendBuddyMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      await sendBuddyRequest(targetUserId);
      return targetUserId;
    },
    onSuccess: (targetUserId) => {
      setPendingRequests((prev) => new Set([...prev, targetUserId]));
      toast.success("Homie request sent!");
      void qc.invalidateQueries({ queryKey: ["study_buddies"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send homie request");
    },
  });

  // If a group/room is active, render the dedicated room session via StudyGroupsTab
  if (selectedGroup) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedGroup(null)}
          className="text-[#F7F5F0]/80 hover:text-[#E5B95C] hover:bg-[#0D4347] gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Study Together
        </Button>
        <StudyGroupsTab currentUserId={currentUserId} />
      </div>
    );
  }

  // Filter college students to remove existing buddies and current user
  const suggestedStudents = (collegeSuggestionsQuery.data ?? []).filter(
    (student) => student.user_id !== currentUserId && !buddyIds.has(student.user_id)
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#0D4347] pb-4">
        <div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-[#E5B95C] flex items-center gap-2">
            <Users className="h-6 w-6" /> Study Together
          </h2>
          <p className="text-xs text-[#F7F5F0]/70 mt-0.5">
            Create real-time study rooms with friends or discover batchmates from your college.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onBackToTimer}
          className="h-8 text-xs font-semibold text-[#0D4347] border-[#0D4347]/30 bg-[#F4F1EA] hover:bg-[#E8E2D5] shadow-sm gap-1.5 shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Timer
        </Button>
      </div>

      {/* Action Row: Create Room / Join Room */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Create Room Button / Dialog */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogTrigger asChild>
            <div className="group cursor-pointer rounded-2xl border border-[#0D4347] bg-[#082428]/80 p-5 hover:border-[#E5B95C]/60 transition-all hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-[#E5B95C]/20 border border-[#E5B95C]/30 flex items-center justify-center text-[#E5B95C]">
                  <Plus className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-[#F7F5F0]/40 group-hover:text-[#E5B95C] transition-colors" />
              </div>
              <h3 className="mt-3 font-display font-bold text-base text-[#F7F5F0]">Create a Study Room</h3>
              <p className="text-xs text-[#F7F5F0]/65 mt-1 leading-relaxed">
                Generate a shareable 6-character room code to study together with friends in real time.
              </p>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-[#082428] border border-[#0D4347] text-[#F7F5F0] p-6 shadow-2xl">
            <DialogHeader className="text-left pb-3 border-b border-[#0D4347]">
              <DialogTitle className="text-[#E5B95C] font-display text-lg flex items-center gap-2">
                <Users className="h-5 w-5" /> Create Study Room
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-semibold text-[#F7F5F0]">Room Name</Label>
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. AIIMS Batch 2021 or Surgery PYQ Squad"
                  className="mt-1 h-9 text-xs bg-[#0D4347]/60 border-[#0D4347] text-[#F7F5F0]"
                  maxLength={50}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#F7F5F0]">Member Daily Goal (Hours/Day)</Label>
                <div className="flex gap-2 mt-1.5">
                  {[2, 3, 4, 6].map((h) => (
                    <Button
                      key={h}
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setNewGroupGoalHours(h)}
                      className={`h-7 text-xs flex-1 font-semibold ${
                        newGroupGoalHours === h
                          ? "bg-[#E5B95C] text-[#082428] font-bold shadow-sm"
                          : "bg-[#0D4347] text-[#F4F1EA] border border-[#4BA09F]/30 hover:bg-[#165E63]"
                      }`}
                    >
                      {h}h
                    </Button>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !newGroupName.trim()}
                className="w-full mt-3 bg-[#E5B95C] text-[#082428] font-bold hover:bg-[#E5B95C]/90 shadow-lg"
              >
                Create Room & Get Code
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Join Room Button / Dialog */}
        <Dialog open={joinModalOpen} onOpenChange={setJoinModalOpen}>
          <DialogTrigger asChild>
            <div className="group cursor-pointer rounded-2xl border border-[#0D4347] bg-[#082428]/80 p-5 hover:border-[#4BA09F]/60 transition-all hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-[#4BA09F]/20 border border-[#4BA09F]/30 flex items-center justify-center text-[#4BA09F]">
                  <KeyRound className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-[#F7F5F0]/40 group-hover:text-[#4BA09F] transition-colors" />
              </div>
              <h3 className="mt-3 font-display font-bold text-base text-[#F7F5F0]">Join a Room with Code</h3>
              <p className="text-xs text-[#F7F5F0]/65 mt-1 leading-relaxed">
                Enter an invite code provided by a friend or homie to join their room.
              </p>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-sm bg-[#082428] border border-[#0D4347] text-[#F7F5F0] p-6 shadow-2xl">
            <DialogHeader className="text-left pb-3 border-b border-[#0D4347]">
              <DialogTitle className="text-[#E5B95C] font-display text-lg flex items-center gap-2">
                <KeyRound className="h-5 w-5" /> Join Study Room
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-semibold text-[#F7F5F0]">6-Character Room Code</Label>
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. 8K2M9P"
                  className="mt-1 font-mono text-center tracking-widest text-base uppercase bg-[#0D4347]/60 border-[#0D4347] text-[#E5B95C]"
                  maxLength={10}
                />
              </div>
              <Button
                onClick={() => joinMutation.mutate()}
                disabled={joinMutation.isPending || !joinCode.trim()}
                className="w-full bg-[#E5B95C] text-[#082428] font-bold hover:bg-[#E5B95C]/90 shadow-lg"
              >
                Join Room
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

            {/* Incoming Study Together Requests */}
      <StudyTogetherRequestsSection
        currentUserId={currentUserId}
        onJoinRoomSuccess={(code) => {
          void qc.invalidateQueries({ queryKey: ["user_study_groups"] });
        }}
      />

      {/* Active User Study Rooms Grid */}
      {(groupsQuery.data ?? []).length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-xs text-[#F4F1EA]/90 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-[#E5B95C]" /> Your Active Rooms ({(groupsQuery.data ?? []).length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(groupsQuery.data ?? []).map((grp) => (
              <div
                key={grp.id}
                onClick={() => setSelectedGroup(grp)}
                className="cursor-pointer rounded-xl border border-[#0D4347] bg-[#082428]/90 p-4 hover:border-[#E5B95C]/60 transition-all flex items-center justify-between gap-3 shadow-md"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="font-display font-bold text-sm text-[#F7F5F0] truncate">{grp.name}</h4>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[#F7F5F0]/65">
                    <span>{grp.members_count || 1} members</span>
                    <span>•</span>
                    <span className="font-mono text-[#E5B95C]">Code: {grp.invite_code}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="h-7 px-2.5 text-xs font-semibold text-[#0D4347] border border-[#0D4347]/30 bg-[#F4F1EA] hover:bg-[#E8E2D5] shadow-sm shrink-0"
                >
                  Enter Room
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Buddies from Your Medical College */}
      <div className="rounded-2xl border border-[#0D4347] bg-[#082428]/90 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#0D4347] pb-3">
          <div>
            <h3 className="font-display font-bold text-base text-[#F7F5F0] flex items-center gap-2">
              <School className="h-4.5 w-4.5 text-[#E5B95C]" /> Suggested Homies from Your College
            </h3>
            <p className="text-xs text-[#F7F5F0]/65 mt-0.5">
              {userCollege ? (
                <>Students studying at <span className="text-[#E5B95C] font-semibold">{userCollege}</span></>
              ) : (
                "Connect with batchmates and peer doctors from your medical college"
              )}
            </p>
          </div>

          {!userCollege && onOpenSettings && (
            <Button
              size="sm"
              onClick={onOpenSettings}
              className="h-7 text-xs font-semibold text-[#0D4347] border border-[#0D4347]/30 bg-[#F4F1EA] hover:bg-[#E8E2D5] shrink-0"
            >
              Add College in Settings
            </Button>
          )}
        </div>

        {!userCollege ? (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-[#0D4347] space-y-2">
            <School className="h-8 w-8 text-[#E5B95C]/60 mx-auto" />
            <p className="text-xs text-[#F7F5F0]/80 font-medium">
              You haven't set your medical college in your study profile yet.
            </p>
            <p className="text-[11px] text-[#F7F5F0]/50 max-w-sm mx-auto">
              Add your college name in Sanctuary Settings to see batchmates and study partners.
            </p>
            {onOpenSettings && (
              <Button
                size="sm"
                onClick={onOpenSettings}
                className="mt-2 h-7 text-xs font-bold bg-[#E5B95C] text-[#082428] hover:bg-[#E5B95C]/90 shadow-sm"
              >
                Set Medical College
              </Button>
            )}
          </div>
        ) : collegeSuggestionsQuery.isLoading ? (
          <div className="text-center py-6 text-xs text-[#F7F5F0]/60">
            Finding batchmates from {userCollege}...
          </div>
        ) : suggestedStudents.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-[#0D4347] space-y-1.5">
            <GraduationCap className="h-7 w-7 text-[#E5B95C]/60 mx-auto" />
            <p className="text-xs text-[#F7F5F0]/80 font-medium">
              No new batchmates found yet from {userCollege}.
            </p>
            <p className="text-[11px] text-[#F7F5F0]/50">
              Share your room code or invite friends to join Elixir Sanctuary!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {suggestedStudents.map((student) => {
              const isPending = pendingRequests.has(student.user_id);
              return (
                <div
                  key={student.user_id}
                  className="rounded-xl border border-[#0D4347] bg-[#0D4347]/30 p-3 flex items-center justify-between gap-3 hover:bg-[#0D4347]/50 transition-colors"
                >
                  <QuickPeekProfileCard userId={student.user_id}>
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer">
                      <UserAvatar
                        src={student.avatar_url}
                        name={student.full_name || student.handle || "Doctor"}
                        size={36}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-semibold text-xs text-[#F7F5F0] truncate">
                          {student.full_name || "Doctor"}
                        </p>
                        <p className="text-[10px] text-[#E5B95C] truncate">
                          {student.handle ? `@${student.handle}` : student.study_year || "MBBS Student"}
                        </p>
                        {student.dream_specialisation && (
                          <p className="text-[10px] text-[#F7F5F0]/50 truncate">
                            {student.dream_specialisation}
                          </p>
                        )}
                      </div>
                    </div>
                  </QuickPeekProfileCard>

                  <div className="shrink-0">
                    {isPending ? (
                      <span className="text-[11px] font-semibold text-[#E5B95C] px-2.5 py-1 bg-[#082428] rounded-full border border-[#E5B95C]/40">
                        Pending
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        disabled={sendBuddyMutation.isPending}
                        onClick={() => sendBuddyMutation.mutate(student.user_id)}
                        className="h-7 px-2.5 text-xs font-semibold text-[#0D4347] border border-[#0D4347]/30 bg-[#F4F1EA] hover:bg-[#E8E2D5] shadow-sm"
                      >
                        <UserPlus className="h-3 w-3 mr-1" /> Add Homie
                      </Button>
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
