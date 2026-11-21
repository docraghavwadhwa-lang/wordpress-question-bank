import { createFileRoute } from "@tanstack/react-router";

// Retired provider: keep a clear response for old callbacks without activating access.
export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: { handlers: { POST: () => new Response("This payment provider has been retired", { status: 410 }) } },
});
