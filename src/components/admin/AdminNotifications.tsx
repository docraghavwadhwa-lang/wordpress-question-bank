import { useState, useDeferredValue, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Megaphone,
  Send,
  User,
  Search,
  RefreshCw,
  Clock,
  Sparkles,
  Users,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  adminSendNotification,
  fetchAdminDispatchedNotifications,
  getHomieRecommendationIntervalDays,
  setHomieRecommendationIntervalDays,
  fetchUsersExpiringWithinThreeDays,
} from "@/lib/notifications";
import { consoleUsers } from "@/lib/admin";

export function AdminNotifications({ onDetail }: { onDetail?: (id: string) => void }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"broadcast" | "direct">("broadcast");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"announcement" | "direct" | "alert">("announcement");
  const [link, setLink] = useState("");

  // Homie recommendation interval setting (in days, default 2)
  const [intervalDays, setIntervalDays] = useState<number>(2);
  const [intervalSaving, setIntervalSaving] = useState(false);

  useEffect(() => {
    void getHomieRecommendationIntervalDays().then((days) => setIntervalDays(days));
  }, []);

  const handleSaveInterval = async () => {
    setIntervalSaving(true);
    try {
      await setHomieRecommendationIntervalDays(intervalDays);
      toast.success(`Homie recommendation notification interval set to every ${intervalDays} days`);
    } catch {
      toast.error("Failed to update notification interval");
    } finally {
      setIntervalSaving(false);
    }
  };

  // Direct student search
  const [studentSearch, setStudentSearch] = useState("");
  const deferredStudentSearch = useDeferredValue(studentSearch);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string; email: string } | null>(null);

  const studentsQuery = useQuery({
    queryKey: ["admin", "users", deferredStudentSearch, 0, false],
    queryFn: () => consoleUsers(deferredStudentSearch, 0, false),
    enabled: mode === "direct" && deferredStudentSearch.length >= 2,
  });

  const expiringUsersQuery = useQuery({
    queryKey: ["admin", "expiring_trials"],
    queryFn: fetchUsersExpiringWithinThreeDays,
  });

  const historyQuery = useQuery({
    queryKey: ["admin_notifications_history"],
    queryFn: fetchAdminDispatchedNotifications,
    refetchInterval: 15000,
  });

  // Presets
  const handleApplyTrialEndingPreset = () => {
    setTitle("⏳ Your Elixir Trial is Ending Soon");
    setMessage(
      "Don't break your streak! Your trial is almost over—get in touch with our team today to keep your Q-bank and Sanctuary access uninterrupted 🚀"
    );
    setType("alert");
    setLink("/plans");
    toast.info("Applied 'Trial Ending Reminder' preset");
  };

  const handleApplyBatchmatesPreset = () => {
    setTitle("🎓 Your Batchmates Are Locked In!");
    setMessage(
      "Students from your college are studying in Elixir Sanctuary right now. Tap to add your Homies and crush your daily goals together 🔥"
    );
    setType("direct");
    setLink("/library?tab=buddies");
    toast.info("Applied 'Batchmates Locked In' preset");
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Please enter a title");
      if (!message.trim()) throw new Error("Please enter a message");
      if (mode === "direct" && !selectedStudent) throw new Error("Please select a target student");

      return adminSendNotification({
        title,
        message,
        recipient_id: mode === "direct" && selectedStudent ? selectedStudent.id : null,
        type,
        link: link.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success(
        mode === "broadcast"
          ? "Broadcast announcement dispatched to all students!"
          : `Direct notification sent to ${selectedStudent?.name || "student"}!`
      );
      setTitle("");
      setMessage("");
      setLink("");
      setSelectedStudent(null);
      setStudentSearch("");
      void qc.invalidateQueries({ queryKey: ["admin_notifications_history"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to dispatch notification");
    },
  });

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-2xl text-primary font-display">Notifications & Broadcasts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send announcements to all students or target individual doctors directly with custom alerts, presets, and links.
        </p>
      </div>

      {/* Admin Setting: Same-College Recommendation Notification Interval */}
      <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm text-foreground">
              College Homies Recommendation Frequency
            </h4>
          </div>
          <p className="text-xs text-muted-foreground">
            How often (in days) the app checks and notifies students about unadded batchmates from their medical college.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Every</span>
            <Input
              type="number"
              min={1}
              max={30}
              value={intervalDays}
              onChange={(e) => setIntervalDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="h-8 w-16 text-center text-xs"
            />
            <span className="text-xs text-muted-foreground">days</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveInterval}
            disabled={intervalSaving}
            className="h-8 text-xs"
          >
            {intervalSaving ? "Saving..." : "Save Interval"}
          </Button>
        </div>
      </div>

      {/* Composer Card */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-accent" /> Dispatch New Notification
          </h3>

          {/* Quick-Fill Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-[#E5B95C]" /> Quick Presets:
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleApplyTrialEndingPreset}
              className="h-7 text-xs bg-muted/40 hover:bg-muted"
            >
              <Clock className="mr-1 h-3 w-3 text-amber-500" /> Trial Ending Reminder
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleApplyBatchmatesPreset}
              className="h-7 text-xs bg-muted/40 hover:bg-muted"
            >
              <Users className="mr-1 h-3 w-3 text-teal-600" /> Batchmates Locked In
            </Button>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "broadcast" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setMode("broadcast");
              setType("announcement");
            }}
          >
            <Megaphone className="mr-1.5 h-3.5 w-3.5" /> Broadcast to All Students
          </Button>
          <Button
            type="button"
            variant={mode === "direct" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setMode("direct");
              setType("direct");
            }}
          >
            <User className="mr-1.5 h-3.5 w-3.5" /> Direct Message (Single Student)
          </Button>
        </div>

        {/* Direct student picker */}
        {mode === "direct" && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Select Target Student</Label>
              {expiringUsersQuery.data && expiringUsersQuery.data.length > 0 && (
                <span className="text-[11px] text-amber-600 font-medium">
                  {expiringUsersQuery.data.length} student(s) expiring within 3 days
                </span>
              )}
            </div>

            {selectedStudent ? (
              <div className="flex items-center justify-between rounded-md border bg-background p-2.5 text-xs">
                <div>
                  <p className="font-semibold text-primary">{selectedStudent.name}</p>
                  <p className="text-muted-foreground font-mono text-[11px]">{selectedStudent.email}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setSelectedStudent(null)}
                >
                  Change student
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or college..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                {/* Quick picker for expiring trial users */}
                {expiringUsersQuery.data && expiringUsersQuery.data.length > 0 && !studentSearch && (
                  <div className="space-y-1 pt-1">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      Trials Expiring Soon (Within 3 Days)
                    </p>
                    <div className="max-h-32 overflow-y-auto rounded-md border bg-background divide-y">
                      {expiringUsersQuery.data.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className="w-full text-left p-2 hover:bg-secondary flex items-center justify-between text-xs"
                          onClick={() => {
                            setSelectedStudent({
                              id: u.id,
                              name: u.name,
                              email: u.email,
                            });
                          }}
                        >
                          <div>
                            <p className="font-semibold text-foreground">{u.name}</p>
                            <p className="text-muted-foreground text-[11px]">{u.email}</p>
                          </div>
                          <span className="text-[10px] text-amber-600 font-medium">
                            Expires {new Date(u.ends_at).toLocaleDateString("en-IN")}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {studentsQuery.data && studentsQuery.data.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-md border bg-background divide-y">
                    {studentsQuery.data.slice(0, 5).map((s) => (
                      <button
                        key={s.user_id}
                        type="button"
                        className="w-full text-left p-2 hover:bg-secondary flex items-center justify-between text-xs"
                        onClick={() => {
                          setSelectedStudent({
                            id: s.user_id,
                            name: s.full_name || s.email,
                            email: s.email,
                          });
                        }}
                      >
                        <div>
                          <p className="font-semibold text-foreground">{s.full_name || "Student"}</p>
                          <p className="text-muted-foreground text-[11px]">{s.email}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{s.college || s.study_year || ""}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Notification Title</Label>
            <Input
              placeholder="e.g. Grand Test 04 is now live"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 text-xs"
              maxLength={150}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Category / Priority</Label>
            <Select value={type} onValueChange={(val: any) => setType(val)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="announcement">Announcement (Normal)</SelectItem>
                <SelectItem value="direct">Direct Message</SelectItem>
                <SelectItem value="alert">High Priority Alert</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Message Body</Label>
          <Textarea
            placeholder="Type the message to be displayed to students..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="text-xs min-h-[90px]"
            maxLength={1500}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Action Link (Optional)</Label>
          <Input
            placeholder="e.g. /qbank or /library or /plans"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            disabled={sendMutation.isPending || !title.trim() || !message.trim()}
            onClick={() => sendMutation.mutate()}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {sendMutation.isPending ? "Dispatching..." : "Send Notification"}
          </Button>
        </div>
      </div>

      {/* Dispatched History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg text-primary">Dispatched Messages</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void qc.invalidateQueries({ queryKey: ["admin_notifications_history"] })}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        {historyQuery.data && historyQuery.data.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-secondary">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title & Message</th>
                  <th className="px-4 py-3 font-semibold">Recipient</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Dispatched (IST)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {historyQuery.data.map((n: any) => {
                  const dateStr = new Intl.DateTimeFormat("en-IN", {
                    timeZone: "Asia/Kolkata",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "numeric",
                    hour12: true,
                  }).format(new Date(n.created_at));

                  return (
                    <tr key={n.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 max-w-sm">
                        <p className="font-semibold text-foreground">{n.title}</p>
                        <p className="text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {n.recipient_id ? (
                          <div>
                            <span className="font-medium text-primary">Direct student</span>
                            {onDetail && (
                              <button
                                type="button"
                                className="block text-[11px] text-accent hover:underline"
                                onClick={() => onDetail(n.recipient_id)}
                              >
                                View ID
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-secondary-foreground">
                            All students (Broadcast)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            n.type === "alert"
                              ? "bg-destructive/15 text-destructive"
                              : n.type === "direct"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {n.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{dateStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground border rounded-lg bg-card">
            No dispatched notifications yet.
          </p>
        )}
      </div>
    </section>
  );
}
