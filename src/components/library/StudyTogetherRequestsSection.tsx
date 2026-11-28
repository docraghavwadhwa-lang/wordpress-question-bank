import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchStudyTogetherInvites,
  respondToStudyTogetherInvite,
  type StudyTogetherInvite,
} from "@/lib/library";
import { UserAvatar } from "@/components/qbank/AppHeader";
import { Button } from "@/components/ui/button";
import { Users, Check, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface StudyTogetherRequestsSectionProps {
  currentUserId: string;
  onJoinRoomSuccess?: (groupCode: string) => void;
}

export function StudyTogetherRequestsSection({
  currentUserId,
  onJoinRoomSuccess,
}: StudyTogetherRequestsSectionProps) {
  const qc = useQueryClient();

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ["study_together_invites", currentUserId],
    queryFn: () => fetchStudyTogetherInvites(currentUserId),
    enabled: !!currentUserId,
    refetchInterval: 15000,
  });

  const respondMutation = useMutation({
    mutationFn: async ({
      invite,
      action,
    }: {
      invite: StudyTogetherInvite;
      action: "accepted" | "declined";
    }) => {
      await respondToStudyTogetherInvite(
        invite.id,
        action,
        invite.group_code,
        currentUserId
      );
      return { invite, action };
    },
    onSuccess: ({ invite, action }) => {
      if (action === "accepted") {
        toast.success(`Joined room "${invite.group_name}"!`);
        void qc.invalidateQueries({ queryKey: ["user_study_groups"] });
        onJoinRoomSuccess?.(invite.group_code);
      } else {
        toast.info("Invitation declined");
      }
      void qc.invalidateQueries({ queryKey: ["study_together_invites"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Could not respond to invitation");
    },
  });

  if (isLoading || invites.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#E5B95C]/40 bg-[#082428] p-4 sm:p-5 shadow-xl space-y-3">
      <div className="flex items-center justify-between border-b border-[#0D4347] pb-2.5">
        <h3 className="font-display font-bold text-sm sm:text-base text-[#E5B95C] flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-[#E5B95C]" />
          Study Together Requests ({invites.length})
        </h3>
        <span className="text-[11px] text-[#F7F5F0]/60">
          Incoming Room Invites
        </span>
      </div>

      <div className="space-y-2.5">
        {invites.map((inv) => {
          const inviter = inv.inviter_profile;
          const senderName = inviter?.full_name || inviter?.handle || "A Homie";

          return (
            <div
              key={inv.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#0D4347]/40 border border-[#0D4347] p-3.5 hover:bg-[#0D4347]/60 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <UserAvatar src={inviter?.avatar_url} name={senderName} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs text-[#F7F5F0]">
                    <span className="text-[#E5B95C]">{senderName}</span> invited you to study together in{" "}
                    <strong className="text-white">"{inv.group_name}"</strong>
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#F7F5F0]/60">
                    <span className="font-mono text-[#E5B95C]">Code: {inv.group_code}</span>
                    {inviter?.college && (
                      <>
                        <span>•</span>
                        <span className="truncate">{inviter.college}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Button
                  size="sm"
                  disabled={respondMutation.isPending}
                  onClick={() => respondMutation.mutate({ invite: inv, action: "accepted" })}
                  className="h-7 px-3 text-xs bg-[#E5B95C] text-[#082428] font-bold hover:bg-[#E5B95C]/90 shadow-sm gap-1"
                >
                  <Check className="h-3.5 w-3.5" /> Accept & Join
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={respondMutation.isPending}
                  onClick={() => respondMutation.mutate({ invite: inv, action: "declined" })}
                  className="h-7 px-2.5 text-xs text-[#F7F5F0]/60 hover:text-red-400 hover:bg-red-950/20 gap-1"
                >
                  <X className="h-3.5 w-3.5" /> Decline
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
