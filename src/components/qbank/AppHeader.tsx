import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, LogOut, Smartphone, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfile } from "@/lib/profile";
import { isNativeApp } from "@/lib/native-auth";
import mark from "@/assets/elixir-mark.asset.json";
import { BottomNav } from "@/components/qbank/BottomNav";

export function UserAvatar({ src, name, size = 36 }: { src?: string | null | undefined; name?: string | null | undefined; size?: number }) {
  const initials = (name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return src ? (
    <img src={src} alt="" referrerPolicy="no-referrer" style={{ width: size, height: size }} className="rounded-full object-cover ring-2 ring-accent/60" />
  ) : (
    <span style={{ width: size, height: size }} className="grid place-items-center rounded-full bg-primary font-display text-primary-foreground ring-2 ring-accent/60">
      {initials}
    </span>
  );
}

export function AppHeader({ onHome }: { onHome?: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const profile = useQuery({ queryKey: ["profile", user?.id], queryFn: () => user ? fetchProfile(user.id) : Promise.resolve(null), enabled: !!user });
  const isApp = isNativeApp();
  const name = profile.data?.full_name || user?.email;
  const loc = useLocation();
  // Inside the Android app the Q-Banks and Progress screens go edge-to-edge (bottom nav stays).
  const hideTop = isApp && !!user && (loc.pathname === "/stats" || loc.hash === "qbanks");

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <>
    {!hideTop && <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-4">
        <Link to="/" onClick={onHome} className="flex min-w-0 items-center gap-2.5 text-left">
          <img src={mark.url} alt="" width={270} height={243} className="h-9 w-auto shrink-0 object-contain" />
          <span className="min-w-0 leading-none">
            <span className="block font-display text-2xl tracking-[0.14em] text-primary">ELIXIR</span>
            <span className="mt-1 block text-[10px] font-semibold tracking-[0.22em] text-accent">BY NIRMAYA CARE</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        {!isApp && (
          <Link to="/app" aria-label="Get the app" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-primary hover:bg-secondary" activeProps={{ className: "bg-secondary" }}>
            <Smartphone className="h-4 w-4" /><span className="hidden sm:inline">Get the app</span>
          </Link>
        )}
        {user ? (
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <Link to="/stats" className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-primary hover:bg-secondary sm:flex" activeProps={{ className: "bg-secondary" }}>
              <BarChart3 className="h-4 w-4" /> Progress
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
                <UserAvatar src={profile.data?.avatar_url ?? (user.user_metadata?.["avatar_url"] as string | undefined)} name={name} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/stats" })}><BarChart3 className="h-4 w-4" /> Progress & streak</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}><UserRound className="h-4 w-4" /> Profile</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Link to="/auth" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Sign in</Link>
        )}
        </div>
      </div>
    </header>}
    {user && <BottomNav onHome={onHome} />}
    </>
  );
}
