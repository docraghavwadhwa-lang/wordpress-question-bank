import { createFileRoute } from "@tanstack/react-router";
import { subjectForDay } from "@/lib/daily";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

/** Daily Question-of-the-Day push. Safe to call publicly: it sends at most once per India day. */
export const Route = createFileRoute("/api/public/push-qotd")({
  server: {
    handlers: {
      POST: async () => {
        const lovableKey = process.env["LOVABLE_API_KEY"];
        const fcmKey = process.env["FIREBASE_MESSAGING_API_KEY"];
        if (!lovableKey || !fcmKey) return new Response("Not configured", { status: 500 });

        // Date in India (UTC+5:30), matching what users see on the home page.
        const ist = new Date(Date.now() + 330 * 60_000);
        const day = ist.toISOString().slice(0, 10);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: flags, error: flagsError } = await supabaseAdmin.from("feature_settings").select("key,enabled").in("key", ["qotd", "reminders"]);
        if (flagsError) return Response.json({ error: "Settings unavailable" }, { status: 503 });
        if (flags?.some(f => !f.enabled)) return Response.json({ skipped: true });
        const { error: logErr } = await supabaseAdmin.from("push_log").insert({ day });
        if (logErr) return Response.json({ skipped: true });

        const raw = subjectForDay(day);
        const subject = raw === "Obstetrics & Gyenacology" ? "Obstetrics & Gynaecology" : raw;
        const { data: rows } = await supabaseAdmin.from("push_tokens").select("token");
        let sent = 0;
        for (const { token } of rows ?? []) {
          const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
            method: "POST",
            headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": fcmKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              message: {
                token,
                notification: { title: "Question of the Day is live 🩺", body: `Today's topic: ${subject}. Can you solve it?` },
                webpush: { fcm_options: { link: "/" } },
              },
            }),
          });
          if (res.ok) sent++;
          else {
            const body = await res.text();
            console.error(`FCM send failed [${res.status}]: ${body}`);
            if (res.status === 404 || res.status === 400) await supabaseAdmin.from("push_tokens").delete().eq("token", token);
          }
        }
        return Response.json({ sent });
      },
    },
  },
});
