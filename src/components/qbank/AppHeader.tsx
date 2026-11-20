import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, LogOut, Smartphone, UserRound, Crown, ShieldCheck, Phone } from "lucide-react";
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
import { fetchAccess } from "@/lib/subscriptions";
import { Button } from "@/components/ui/button";

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

export const HELP_PHONE_DISPLAY = "+91 63607-59145";
export const HELP_PHONE_TEL = "tel:+916360759145";

function GetHelpItem() {
  return (
    <DropdownMenuItem asChild>
      <a href={HELP_PHONE_TEL} aria-label={`Call help line ${HELP_PHONE_DISPLAY}`}>
        <Phone className="h-4 w-4" /> Get help here
      </a>
    </DropdownMenuItem>
  );
}

export function AppHeader({ onHome }: { onHome?: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const profile = useQuery({ queryKey: ["profile", user?.id], queryFn: () => user ? fetchProfile(user.id) : Promise.resolve(null), enabled: !!user });
  const access = useQuery({ queryKey: ["access", user?.id], queryFn: fetchAccess, enabled: !!user });
  const isApp = isNativeApp();
  const name = profile.data?.full_name || user?.email;
  const loc = useLocation();
  // Native screens have no website logo bar; Home gets a personal study toolbar.
  const hideTop = isApp;

  async function signOut() {
    try { await supabase.rpc("release_account_device"); } catch { /* still sign out */ }
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut({ scope: "local" });
    void navigate({ to: "/", replace: true });
  }

  return (
    <>
    {isApp && user && loc.pathname === "/" && loc.hash !== "qbanks" && <section aria-label="Your study dashboard" className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pb-2 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="flex min-w-0 items-center gap-3">
      <img src="/icon-512.png" alt="Elixir" width={44} height={44} className="h-11 w-11 shrink-0 rounded-[14px] object-cover" />
      <div className="min-w-0">
        <h1 className="truncate font-display text-2xl text-primary">Hello, {((profile.data?.full_name || user.user_metadata?.["full_name"] || "doctor") as string).split(" ")[0]}</h1>
      </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Button asChild size="icon" variant="outline"><a href={HELP_PHONE_TEL} aria-label={`Call help line ${HELP_PHONE_DISPLAY}`} title={`Call help line ${HELP_PHONE_DISPLAY}`}><Phone /></a></Button>
        <Button asChild size="icon" variant="outline"><Link to="/plans" aria-label="Pro subscription plans" title="Pro subscription plans"><Crown /></Link></Button>
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
            <UserAvatar src={profile.data?.avatar_url ?? (user.user_metadata?.["avatar_url"] as string | undefined)} name={name} size={40} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}><UserRound className="h-4 w-4" /> Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/plans" })}><Crown className="h-4 w-4" /> Subscription plans</DropdownMenuItem>
            {access.data?.admin && <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}><ShieldCheck className="h-4 w-4" /> Administration</DropdownMenuItem>}
            <GetHelpItem />
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
            <Button asChild size="sm" variant="secondary"><Link to="/plans"><Crown />Pro</Link></Button>
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
                <DropdownMenuItem onClick={() => navigate({ to: "/plans" })}><Crown className="h-4 w-4" /> Subscription plans</DropdownMenuItem>
                {access.data?.admin && <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}><ShieldCheck className="h-4 w-4" /> Administration</DropdownMenuItem>}
                <GetHelpItem />
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
