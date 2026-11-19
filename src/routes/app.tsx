import { createFileRoute } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Download, Smartphone } from "lucide-react";
import { AppHeader } from "@/components/qbank/AppHeader";
import { Button } from "@/components/ui/button";

/** Always points at the newest APK published by the GitHub Actions build. */
export const APK_URL = "https://github.com/docraghavwadhwa-lang/wordpress-question-bank/releases/download/android-latest/MedQuiz.apk";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Get the MedQuiz app — Android download" },
      { name: "description", content: "Download the MedQuiz by Nirmaya Care Android app and practise medical MCQs even without internet." },
      { property: "og:title", content: "Get the MedQuiz app — Android download" },
      { property: "og:description", content: "Download the MedQuiz by Nirmaya Care Android app. iOS app coming soon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GetApp,
});

function GetApp() {
  return (
    <div className="min-h-screen pb-24">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">Get the app</p>
        <h1 className="text-5xl leading-none text-primary sm:text-6xl">MedQuiz on your <em>phone</em></h1>
        <p className="mt-4 max-w-xl text-muted-foreground">Practise every question bank anywhere — even with no internet once you've downloaded the questions.</p>
        <div className="mt-10 grid items-center gap-8 rounded-2xl border bg-card p-6 sm:grid-cols-[auto_1fr] sm:p-8">
          <div className="mx-auto rounded-xl border bg-background p-4">
            <QRCodeSVG value={APK_URL} size={180} bgColor="transparent" fgColor="currentColor" className="text-primary" />
          </div>
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-primary"><Smartphone className="h-4 w-4" /> Android</span>
            <p className="mt-3 text-muted-foreground">Scan the code with your phone camera, or tap the button on your Android phone.</p>
            <Button asChild size="lg" className="mt-5">
              <a href={APK_URL}><Download className="h-4 w-4" /> Download for Android</a>
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">Available for Android for now — our iOS app is on the way.</p>
          </div>
        </div>
        <ol className="mt-8 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Download the file and open it.</li>
          <li>If asked, allow installing apps from this source.</li>
          <li>Tap Install, then open MedQuiz and sign in with Google.</li>
        </ol>
      </main>
    </div>
  );
}
