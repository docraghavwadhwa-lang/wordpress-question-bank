import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { fetchProfile } from "@/lib/profile";
import { useLibraryTimer } from "@/contexts/LibraryTimerContext";
import { AppHeader } from "@/components/qbank/AppHeader";
import { BottomNav } from "@/components/qbank/BottomNav";
import { StudyTogetherView } from "@/components/library/StudyTogetherView";
import { StudyBuddiesTab } from "@/components/library/StudyBuddiesTab";
import { LibraryLeaderboards } from "@/components/library/LibraryLeaderboards";
import { Users, Flame, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/homies")({
  head: () => ({
    meta: [
      { title: "Homies & Study Together — Elixir" },
      { name: "description", content: "Connect with medical students, join study rooms and track your focus with Elixir." },
      { property: "og:title", content: "Homies & Study Together — Elixir" },
      { property: "og:description", content: "Connect with medical students, join study rooms and track your focus with Elixir." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomiesRouteComponent,
});

function HomiesRouteComponent() {
  const { user } = useAuth();
  const { openOverlay } = useLibraryTimer();
  const [activeTab, setActiveTab] = useState<"rooms" | "homies" | "leaderboard">("rooms");

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => (user ? fetchProfile(user.id) : Promise.resolve(null)),
    enabled: !!user,
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#082428] text-[#F7F5F0] flex flex-col pb-28">
      <AppHeader />

      <main className="mx-auto max-w-4xl w-full px-4 py-5 sm:py-8 space-y-6 flex-1">
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#0D4347] pb-4">
          <div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#E5B95C] tracking-tight">
              Homies & Study Together
            </h1>
            <p className="text-xs text-[#F7F5F0]/70 mt-1">
              Live accountability, peer study rooms, and medical college leaderboards.
            </p>
          </div>

          {/* Segmented Filter Control */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0D4347]/50 border border-[#0D4347]">
            <button
              type="button"
              onClick={() => setActiveTab("rooms")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "rooms"
                  ? "bg-[#E5B95C] text-[#082428] shadow-sm font-bold"
                  : "text-[#F7F5F0]/70 hover:text-[#F7F5F0] hover:bg-[#0D4347]"
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              <span>Study Rooms</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("homies")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "homies"
                  ? "bg-[#E5B95C] text-[#082428] shadow-sm font-bold"
                  : "text-[#F7F5F0]/70 hover:text-[#F7F5F0] hover:bg-[#0D4347]"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Homies</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("leaderboard")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "leaderboard"
                  ? "bg-[#E5B95C] text-[#082428] shadow-sm font-bold"
                  : "text-[#F7F5F0]/70 hover:text-[#F7F5F0] hover:bg-[#0D4347]"
              }`}
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>Leaderboards</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "rooms" && (
          <StudyTogetherView
            currentUserId={user.id}
            userCollege={profileQuery.data?.college ?? null}
            onBackToTimer={openOverlay}
          />
        )}

        {activeTab === "homies" && (
          <StudyBuddiesTab currentUserId={user.id} />
        )}

        {activeTab === "leaderboard" && (
          <LibraryLeaderboards currentUserId={user.id} currentUserProfile={profileQuery.data ?? null} />
        )}
      </main>

      <BottomNav />
    </div>
  );
}
