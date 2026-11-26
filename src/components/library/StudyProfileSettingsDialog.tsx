import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProfile, type Profile } from "@/lib/profile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface StudyProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  profile: Profile | null;
}

export function StudyProfileSettingsDialog({
  open,
  onOpenChange,
  currentUserId,
  profile,
}: StudyProfileSettingsDialogProps) {
  const qc = useQueryClient();
  const [handle, setHandle] = useState(profile?.handle || "");
  const [mood, setMood] = useState(profile?.todays_mood || "");
  const [dreamSpec, setDreamSpec] = useState(profile?.dream_specialisation || "");
  const [goalHours, setGoalHours] = useState<number>(
    (profile?.daily_focus_goal_minutes || 240) / 60
  );
  const [visibility, setVisibility] = useState(
    profile?.study_hours_visibility || "all_buddies"
  );

  useEffect(() => {
    if (profile) {
      setHandle(profile.handle || "");
      setMood(profile.todays_mood || "");
      setDreamSpec(profile.dream_specialisation || "");
      setGoalHours((profile.daily_focus_goal_minutes || 240) / 60);
      setVisibility(profile.study_hours_visibility || "all_buddies");
    }
  }, [profile]);

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      await updateProfile(currentUserId, {
        handle: handle.trim().toLowerCase().replace(/^@/, ""),
        todays_mood: mood.trim() || null,
        dream_specialisation: dreamSpec.trim() || null,
        daily_focus_goal_minutes: Math.max(15, Math.round(Number(goalHours) * 60)),
        study_hours_visibility: visibility as any,
      });
    },
    onSuccess: () => {
      toast.success("Sanctuary profile & privacy updated!");
      onOpenChange(false);
      void qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to update settings"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-[#082428] border border-[#0D4347] text-[#F7F5F0]">
        <DialogHeader className="border-b border-[#0D4347] pb-3">
          <DialogTitle className="font-display text-xl text-[#E5B95C] flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Sanctuary Profile & Privacy
          </DialogTitle>
          <p className="text-xs text-[#F7F5F0]/70">
            Customize how other students find and see your study presence.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div>
            <Label className="text-xs font-semibold text-[#F7F5F0]">Unique Study Handle</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F7F5F0]/60 text-xs font-mono">
                @
              </span>
              <Input
                value={handle}
                onChange={(e) =>
                  setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                }
                placeholder="raghav_mbbs"
                className="pl-7 h-9 text-xs font-mono bg-[#0D4347]/40 border-[#0D4347] text-[#F7F5F0] placeholder:text-[#F7F5F0]/40"
              />
            </div>
            <p className="text-[11px] text-[#F7F5F0]/60 mt-1">
              Lowercase letters, numbers, and underscores. Batchmates can find you with this.
            </p>
          </div>

          <div>
            <Label className="text-xs font-semibold text-[#F7F5F0]">Today's Study Mood / Status</Label>
            <Input
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="e.g. Locked in 🔥, Caffeinated ☕, Revising Pathology"
              className="mt-1 h-9 text-xs bg-[#0D4347]/40 border-[#0D4347] text-[#F7F5F0] placeholder:text-[#F7F5F0]/40"
              maxLength={50}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-[#F7F5F0]">Dream Specialisation</Label>
            <Input
              value={dreamSpec}
              onChange={(e) => setDreamSpec(e.target.value)}
              placeholder="e.g. General Surgery, Radiology, Internal Medicine"
              className="mt-1 h-9 text-xs bg-[#0D4347]/40 border-[#0D4347] text-[#F7F5F0] placeholder:text-[#F7F5F0]/40"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-[#F7F5F0]">Daily Focus Target (Hours)</Label>
              <span className="text-xs font-bold text-[#E5B95C]">{goalHours} hrs / day</span>
            </div>
            <div className="flex gap-2 mt-1.5">
              {[2, 4, 6, 8].map((h) => (
                <Button
                  key={h}
                  type="button"
                  size="sm"
                  variant={goalHours === h ? "default" : "outline"}
                  className={`h-7 text-xs flex-1 ${
                    goalHours === h
                      ? "bg-[#E5B95C] text-[#082428] font-bold"
                      : "border-[#0D4347] text-[#F7F5F0] hover:bg-[#0D4347]"
                  }`}
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
                className="h-8 text-xs w-28 bg-[#0D4347]/40 border-[#0D4347] text-[#F7F5F0]"
              />
              <span className="text-xs text-[#F7F5F0]/60">hours per day</span>
            </div>
          </div>

          <div className="border-t border-[#0D4347] pt-3">
            <Label className="text-xs font-semibold flex items-center gap-1.5 text-[#F7F5F0]">
              <Shield className="h-3.5 w-3.5 text-[#E5B95C]" /> Study-Hours Visibility
            </Label>
            <p className="text-[11px] text-[#F7F5F0]/60 mb-2">
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
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    visibility === opt.id
                      ? "bg-[#0D4347] border-[#E5B95C] text-[#E5B95C]"
                      : "border-[#0D4347] hover:bg-[#0D4347]/40 text-[#F7F5F0]"
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.id}
                    checked={visibility === opt.id}
                    onChange={() => setVisibility(opt.id as any)}
                    className="accent-[#E5B95C]"
                  />
                  <span className="font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={() => saveSettingsMutation.mutate()}
            disabled={saveSettingsMutation.isPending}
            className="w-full mt-2 bg-[#E5B95C] text-[#082428] font-bold hover:bg-[#E5B95C]/90"
          >
            {saveSettingsMutation.isPending ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
