import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Megaphone, User, AlertCircle, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  checkPeriodicSameCollegeNotification,
  checkTrialEndingNotification,
  type NotificationItem,
} from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export function NotificationBell({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["user_notifications", user?.id],
    queryFn: () => (user ? fetchUserNotifications(user.id) : Promise.resolve([])),
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Automated background notifications (Homie same-college & Trial ending)
  useState(() => {
    if (user?.id) {
      void checkPeriodicSameCollegeNotification(user.id);
      void checkTrialEndingNotification(user.id);
    }
  });

  const unreadList = notifications.filter((n) => !n.is_read);
  const unreadCount = unreadList.length;

  const markReadMutation = useMutation({
    mutationFn: (notifId: string) => {
      if (!user) throw new Error("Not logged in");
      return markNotificationAsRead(notifId, user.id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["user_notifications"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Not logged in");
      return markAllNotificationsAsRead(
        unreadList.map((n) => n.id),
        user.id
      );
    },
    onSuccess: () => {
      toast.success("All notifications marked as read");
      void qc.invalidateQueries({ queryKey: ["user_notifications"] });
    },
  });

  function formatTimestamp(isoStr: string) {
    try {
      const d = new Date(isoStr);
      return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }).format(d);
    } catch {
      return "";
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={compact ? "outline" : "secondary"}
          size="icon"
          className="relative h-9 w-9 shrink-0 text-foreground dark:text-foreground border border-input/80 bg-background hover:bg-accent hover:text-accent-foreground shadow-xs"
          aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
        >
          <Bell className="h-4 w-4 text-foreground dark:text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground shadow-sm animate-in zoom-in">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h4 className="font-display text-sm font-semibold text-foreground">Notifications</h4>
            {unreadCount > 0 && (
              <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <Bell className="mx-auto h-7 w-7 text-muted-foreground/30 mb-2" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((n: NotificationItem) => (
              <div
                key={n.id}
                className={`p-3.5 text-xs transition-colors ${
                  n.is_read ? "bg-background opacity-85" : "bg-accent/5 font-medium"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {n.type === "direct" ? (
                      <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary">
                        <User className="h-2.5 w-2.5" /> Direct
                      </span>
                    ) : n.type === "alert" ? (
                      <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-destructive/15 text-destructive">
                        <AlertCircle className="h-2.5 w-2.5" /> Alert
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-secondary text-secondary-foreground">
                        <Megaphone className="h-2.5 w-2.5" /> Announcement
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {formatTimestamp(n.created_at)}
                    </span>
                  </div>
                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                      onClick={() => markReadMutation.mutate(n.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
                <h5 className="mt-1 font-semibold text-foreground text-xs">{n.title}</h5>
                <p className="mt-1 text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {n.message}
                </p>
                {n.link && (
                  <div className="mt-2">
                    <Link
                      to={n.link as any}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                      onClick={() => {
                        if (!n.is_read) markReadMutation.mutate(n.id);
                        setOpen(false);
                      }}
                    >
                      Open link <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
