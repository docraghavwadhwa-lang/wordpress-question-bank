import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserAvatar } from "@/components/qbank/AppHeader";
import { subjectLabel } from "@/lib/subjects";
import { formatFocusDuration } from "@/lib/apothecary";
import { Stethoscope, GraduationCap, Sparkles, Clock, UserPlus, Check, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface QuickPeekUser {
  id: string;
  full_name: string | null;
  handle: string | null;
  college: string | null;
  study_year: string | null;
  avatar_url: string | null;
  dream_specialisation?: string | null | undefined;
  todays_mood?: string | null | undefined;
  is_studying?: boolean | undefined;
  active_subject?: string | null | undefined;
  active_seconds?: number | undefined;
  today_seconds?: number | null | undefined;
  buddy_status?: "none" | "pending_sent" | "pending_received" | "accepted" | undefined;
}

interface QuickPeekProfileCardProps {
  user: QuickPeekUser;
  children: React.ReactNode;
  onAddBuddy?: (userId: string) => void;
  isCurrentViewer?: boolean;
}

export function QuickPeekProfileCard({
  user,
  children,
  onAddBuddy,
  isCurrentViewer = false,
}: QuickPeekProfileCardProps) {
  const name = user.full_name || user.handle || "Medical Student";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span className="inline-flex cursor-pointer transition-transform hover:scale-105">
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-4 shadow-xl border-border/60">
        <div className="flex items-start gap-3">
          <UserAvatar src={user.avatar_url} name={name} size={48} />
          <div className="min-w-0 flex-1">
            <h4 className="font-display font-semibold text-foreground text-base truncate">
              {name}
            </h4>
            {user.handle && (
              <p className="font-mono text-xs text-muted-foreground truncate">
                @{user.handle.replace(/^@/, "")}
              </p>
            )}
            {user.todays_mood && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                <Sparkles className="h-3 w-3" />
                {user.todays_mood}
              </span>
            )}
          </div>
        </div>

        {/* Details list */}
        <div className="mt-3.5 space-y-2 border-t border-border/50 pt-3 text-xs text-muted-foreground">
          {user.college && (
            <div className="flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{user.college}</span>
              {user.study_year && <span className="shrink-0 text-muted-foreground/60">• {user.study_year}</span>}
            </div>
          )}

          {user.dream_specialisation && (
            <div className="flex items-center gap-2">
              <Stethoscope className="h-3.5 w-3.5 shrink-0 text-accent" />
              <span className="truncate">Aspiring {user.dream_specialisation}</span>
            </div>
          )}

          {/* Active study presence */}
          {user.is_studying && user.active_subject ? (
            <div className="flex items-center gap-2 rounded-md bg-accent/10 px-2 py-1.5 font-medium text-accent">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              <span>Studying {subjectLabel(user.active_subject)}</span>
              {user.active_seconds !== undefined && (
                <span className="font-mono text-[11px] ml-auto">
                  ({formatFocusDuration(user.active_seconds)})
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground/75">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
              <span>Currently taking a break</span>
            </div>
          )}

          {/* Hours studied today if visible */}
          {user.today_seconds !== undefined && user.today_seconds !== null && (
            <div className="flex items-center justify-between pt-1">
              <span className="flex items-center gap-1.5 text-foreground/80">
                <Clock className="h-3.5 w-3.5 text-primary" /> Today's focus:
              </span>
              <span className="font-mono font-bold text-foreground">
                {formatFocusDuration(user.today_seconds)}
              </span>
            </div>
          )}
        </div>

        {/* Action Button: Add Buddy */}
        {!isCurrentViewer && onAddBuddy && (
          <div className="mt-3.5 pt-2 border-t border-border/50">
            {user.buddy_status === "accepted" ? (
              <Button size="sm" variant="outline" disabled className="w-full h-8 text-xs gap-1.5 text-emerald-600 border-emerald-500/30">
                <UserCheck className="h-3.5 w-3.5" /> Study Buddy
              </Button>
            ) : user.buddy_status === "pending_sent" ? (
              <Button size="sm" variant="outline" disabled className="w-full h-8 text-xs gap-1.5 text-amber-600">
                <Check className="h-3.5 w-3.5" /> Request Sent
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => onAddBuddy(user.id)}
                className="w-full h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <UserPlus className="h-3.5 w-3.5" /> Add as Study Buddy
              </Button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
