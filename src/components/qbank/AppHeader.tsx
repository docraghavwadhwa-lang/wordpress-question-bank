import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Flame, LogOut, Smartphone, UserRound } from "lucide-react";
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
  // Native screens have no website logo bar; Home gets a personal study toolbar.
  const hideTop = isApp;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/", replace: true });
  }

  return (
    <>
    {isApp && user && loc.pathname === "/" && loc.hash !== "qbanks" && <section aria-label="Your study dashboard" className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pb-2 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="flex min-w-0 items-center gap-3">
      <img src="/icon-512.png" alt="Elixir" width={44} height={44} className="h-11 w-11 shrink-0 rounded-2xl object-cover" />
      <div className="min-w-0">
        <h1 className="truncate font-display text-2xl text-primary">Hello, {((profile.data?.full_name || user.user_metadata?.["full_name"] || "doctor") as string).split(" ")[0]}</h1>
      </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link to="/stats" aria-label="Your streak and progress" title="Your streak and progress" className="grid h-10 w-10 place-items-center rounded-full border bg-card text-gold"><Flame className="h-5 w-5" /></Link>
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
            <UserAvatar src={profile.data?.avatar_url ?? (user.user_metadata?.["avatar_url"] as string | undefined)} name={name} size={40} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}><UserRound className="h-4 w-4" /> Profile</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>}
    {!hideTop && <header className="sticky top-0 z-30 border-b border-brand-foreground/15 bg-header">
      <div className={`mx-auto grid max-w-5xl items-center gap-2 px-4 py-2 ${isApp ? "grid-cols-[1fr_auto_1fr]" : "grid-cols-[minmax(0,1fr)_auto]"}`}>
        {isApp && <span />}
        <Link to="/" onClick={onHome} className={`flex min-w-0 items-center gap-2.5 ${isApp ? "justify-center" : "text-left"}`}>
          <img src="/elixir-header-latest.webp" alt="Elixir by Nirmaya Care" width={725} height={187} className="h-auto w-40 max-w-full object-contain sm:w-48" />
        </Link>
        <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-3">
        {!isApp && (
          <Link to="/app" aria-label="Get the app" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-brand-foreground hover:bg-brand-foreground/10" activeProps={{ className: "bg-brand-foreground/15" }}>
            <Smartphone className="h-4 w-4" /><span className="hidden sm:inline">Get the app</span>
          </Link>
        )}
        {user ? (
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <Link to="/stats" className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-brand-foreground hover:bg-brand-foreground/10 sm:flex" activeProps={{ className: "bg-brand-foreground/15" }}>
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
