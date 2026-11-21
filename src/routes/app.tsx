import { createFileRoute } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Download, Smartphone } from "lucide-react";
import { AppHeader } from "@/components/qbank/AppHeader";
import { Button } from "@/components/ui/button";
import homeScreen from "@/assets/elixir-home-screen.asset.json";

/** Always points at the newest APK published by the GitHub Actions build. */
export const APK_URL = "https://github.com/docraghavwadhwa-lang/wordpress-question-bank/releases/download/android-latest/MedQuiz.apk";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Get the Android app | Elixir" },
      { name: "description", content: "Download the Elixir by Nirmaya Care Android app and practise medical MCQs even without internet." },
      { property: "og:title", content: "Get the Elixir app — Android download" },
      { property: "og:description", content: "Download the Elixir by Nirmaya Care Android app. iOS app coming soon." },
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
        <h1 className="text-5xl leading-none text-primary sm:text-6xl">Elixir on your <em>phone</em></h1>
        <p className="mt-4 max-w-xl text-muted-foreground">Take Elixir with you. Save free samples and your subscribed subjects for offline practice.</p>
        <div className="mt-10 grid items-center gap-8 border-y py-6 sm:grid-cols-[auto_1fr] sm:py-8">
          <div className="mx-auto rounded-xl border bg-background p-4">
            <QRCodeSVG value={APK_URL} size={180} bgColor="transparent" fgColor="currentColor" className="text-primary" />
          </div>
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-primary"><Smartphone className="h-4 w-4" /> Android</span>
            <p className="mt-3 text-muted-foreground">Scan the code with your phone camera, or tap the button on your Android phone.</p>
            <Button asChild size="lg" className="mt-5">
              <a href={APK_URL}><Download className="h-4 w-4" /> Download for Android</a>
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">Google Play · Coming soon<br />App Store · Coming soon</p>
          </div>
        </div>
        <ol className="mt-8 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Download the file and open it.</li>
          <li>If asked, allow installing apps from this source.</li>
          <li>Tap Install, then open Elixir and sign in with Google.</li>
        </ol>
        <section className="mt-10 border-t pt-8"><h2 className="text-3xl text-primary">Add Elixir to your Home Screen</h2><p className="mt-3 text-sm text-muted-foreground">On iPhone or iPad, open elixir.nirmayacare.com in Safari. Tap Share, choose Add to Home Screen, then tap Add. Open the Elixir icon to study.</p><img src={homeScreen.url} alt="Three steps to add Elixir on iPhone: Share in Safari, Add to Home Screen, then open the Elixir icon" width={1536} height={1024} className="mt-5 h-auto w-full rounded-lg" /><p className="mt-4 text-sm text-muted-foreground">On Android Chrome, open the menu (⋮) and choose Add to Home screen or Install app. This adds a website shortcut; the Android download above is the separate Elixir app.</p></section>
      </main>
    </div>
  );
}
