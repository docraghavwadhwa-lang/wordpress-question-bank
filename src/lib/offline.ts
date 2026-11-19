import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Writes made while offline wait here (localStorage) and are replayed once the device reconnects. */
export type QueuedWrite =
  | { kind: "insert"; table: "attempts" | "bookmarks" | "blitz_results" | "quiz_reviews"; row: Record<string, unknown> }
  | { kind: "unbookmark"; user_id: string; question_id: number };

const KEY = "qb_offline_queue";

export function readQueue(): QueuedWrite[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
function writeQueue(q: QueuedWrite[]) {
  localStorage.setItem(KEY, JSON.stringify(q));
  window.dispatchEvent(new Event("qb-queue"));
}
export function enqueue(w: QueuedWrite) {
  writeQueue([...readQueue(), w]);
}

async function run(w: QueuedWrite) {
  const res =
    w.kind === "insert"
      ? await supabase.from(w.table).insert(w.row as never)
      : await supabase.from("bookmarks").delete().eq("user_id", w.user_id).eq("question_id", w.question_id);
  // Duplicate rows (already synced) count as done.
  if (res.error && res.error.code !== "23505") throw res.error;
}

/** Try the write now; if the device is offline or the request fails on the network, queue it. */
export async function writeOrQueue(w: QueuedWrite) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return enqueue(w);
  try {
    await run(w);
  } catch (e) {
    if (e instanceof TypeError || !navigator.onLine) enqueue(w);
    else throw e;
  }
}

let flushing = false;
export async function flushQueue(): Promise<number> {
  if (flushing || !navigator.onLine) return 0;
  flushing = true;
  let done = 0;
  try {
    let q = readQueue();
    while (q.length) {
      try {
        await run(q[0]!);
      } catch (e) {
        if (e instanceof TypeError) break; // still offline
        // permanent error: drop it so the queue never gets stuck
      }
      q = q.slice(1);
      writeQueue(q);
      done++;
    }
  } finally {
    flushing = false;
  }
  return done;
}

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
