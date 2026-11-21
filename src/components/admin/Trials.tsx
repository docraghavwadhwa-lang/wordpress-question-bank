import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { fetchTrialRequests, fetchTrialEngagement } from "@/lib/trial-requests";
import { studentDetail } from "@/lib/admin";
import { dateLabel } from "@/lib/subscriptions";
import { TRIAL_PRESETS } from "@/lib/trials";
export function TrialEngagement({ user }: { user: string }) {
 const row = useQuery({ queryKey: ["admin", "trial-engagement", user], queryFn: () => fetchTrialEngagement(user) });
 return <section className="border-t pt-4"><h3 className="font-semibold text-primary">Trial engagement</h3>{row.error ? <p role="alert" className="text-sm text-destructive">Couldn't load trial activity.</p> : row.data ? <><p className="my-2 text-sm">{row.data.visits.length} active days · {row.data.questions} questions attempted · {row.data.correct} correct</p><ol className="max-h-48 overflow-y-auto text-sm text-muted-foreground">{row.data.visits.map(v => <li className="border-b py-2" key={v.day}>{dateLabel(v.day)} · last seen {new Date(v.last_seen_at).toLocaleTimeString()}</li>)}</ol></> : <p className="text-sm text-muted-foreground">Loading activity…</p>}</section>;
}
export function Trials({ onDetail }: { onDetail: (user: string) => void }) {
 const rows = useQuery({ queryKey: ["admin", "trials"], queryFn: fetchTrialRequests, refetchInterval: 30000 });
 return <section><h2 className="text-2xl text-primary">Trial requests</h2><p className="mb-4 mt-2 text-sm text-muted-foreground">Approve complete Panacea access for 14 days, or choose another duration. Edit approved trials in Subscriptions.</p>{rows.error ? <p role="alert" className="text-destructive">Couldn't load trial requests.</p> : rows.isPending ? <p>Loading…</p> : !rows.data.length ? <p className="text-muted-foreground">No trial requests yet.</p> : <div className="divide-y border-y">{rows.data.map(r => <TrialRow key={r.id} row={r} onDetail={onDetail} />)}</div>}</section>;
}
function TrialRow({ row, onDetail }: { row: Awaited<ReturnType<typeof fetchTrialRequests>>[number]; onDetail: (user: string) => void }) {
 const qc = useQueryClient(); const [days, setDays] = useState(row.days); const [busy, setBusy] = useState(false);
 const student = useQuery({ queryKey: ["admin", "detail", row.user_id], queryFn: () => studentDetail(row.user_id) });
 async function review(approve: boolean) { setBusy(true); try { const { error } = await supabase.rpc("admin_review_trial", { _request: row.id, _days: days, _approve: approve }); if (error) throw error; toast.success(approve ? `Full-access trial approved for ${days} days` : "Trial request declined"); await qc.invalidateQueries({ queryKey: ["admin"] }); } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't review the request"); } finally { setBusy(false); } }
 return <div className="flex flex-wrap items-center justify-between gap-4 py-5"><div className="min-w-0"><p className="break-words font-semibold text-primary">{student.data?.profile.full_name || student.data?.email || "Student"}</p><p className="break-words text-sm text-muted-foreground">{student.data?.email} · {row.status} · requested {dateLabel(row.created_at)}</p><Button variant="link" className="h-auto px-0 py-2" onClick={() => onDetail(row.user_id)}>View student & engagement</Button></div>{row.status === "pending" && <div className="flex flex-wrap items-center gap-2">{TRIAL_PRESETS.map(d => <Button key={d} variant={d === days ? "default" : "outline"} size="sm" onClick={() => setDays(d)}>{d} days</Button>)}<Input className="w-24" aria-label="Trial days" type="number" min={1} max={3650} value={days} onChange={e => setDays(Number(e.target.value))} /><Button disabled={busy || !Number.isInteger(days) || days < 1 || days > 3650} onClick={() => void review(true)}>Approve</Button><Button variant="outline" disabled={busy} onClick={() => void review(false)}>Decline</Button></div>}</div>;
}