import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, LogOut, Smartphone, UserRound, Crown, ShieldCheck, Phone, Moon, Sun, Users } from "lucide-react";
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
import { useAppearance } from "@/components/AppearanceProvider";
import { ProControl } from "./ProControl";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AmbiencePopover } from "@/components/ambience/AmbiencePopover";

function AppearanceItem() {
  const { appearance, toggle } = useAppearance();
  const dark = appearance === "dark";
  return (
    <DropdownMenuItem onClick={toggle}>
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {dark ? "Light Mode" : "Dark Mode"}
    </DropdownMenuItem>
  );
}

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

/** Unified persistent AppHeader: Elixir Logo (left) and Headphones, Bell, Crown, Avatar (right) */
export function AppHeader({ onHome }: { onHome?: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const profile = useQuery({ queryKey: ["profile", user?.id], queryFn: () => user ? fetchProfile(user.id) : Promise.resolve(null), enabled: !!user });
  const access = useQuery({ queryKey: ["access", user?.id], queryFn: fetchAccess, enabled: !!user });
  const isApp = isNativeApp();
  const name = profile.data?.full_name || user?.email;

  async function signOut() {
    try { await supabase.rpc("release_account_device"); } catch { /* still sign out */ }
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut({ scope: "local" });
    void navigate({ to: "/", replace: true });
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-brand-foreground/15 bg-header pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:py-3">
          {/* Left: Elixir Logo */}
          <Link to="/" onClick={onHome} className="flex min-w-0 items-center gap-2.5">
            <img
              src="/elixir-header-latest.webp"
              alt="Elixir by Nirmaya Care"
              width={725}
              height={187}
              className="h-auto w-36 max-w-full object-contain sm:w-44"
            />
          </Link>

          {/* Right Action Icons: Headphones, Bell, Crown, Avatar */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            <AmbiencePopover compact />

            {!isApp && !user && (
              <Link to="/app" aria-label="Get the app" className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-foreground/10">
                <Smartphone className="h-4 w-4" /><span className="hidden sm:inline">Get the app</span>
              </Link>
            )}

            {user ? (
              <>
                <NotificationBell compact />
                <ProControl compact />

                <DropdownMenu>
                  <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring ml-0.5" aria-label="Account menu">
                    <UserAvatar src={profile.data?.avatar_url ?? (user.user_metadata?.["avatar_url"] as string | undefined)} name={name} size={34} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{name}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate({ to: "/homies" })}>
                      <Users className="h-4 w-4" /> Homies & study rooms
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate({ to: "/stats" })}>
                      <BarChart3 className="h-4 w-4" /> Progress & streak
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                      <UserRound className="h-4 w-4" /> Profile & Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate({ to: "/plans" })}>
                      <Crown className="h-4 w-4" /> Subscription plans
                    </DropdownMenuItem>
                    {access.data?.admin && (
                      <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                        <ShieldCheck className="h-4 w-4" /> Administration
                      </DropdownMenuItem>
                    )}
                    <GetHelpItem />
                    <AppearanceItem />
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                      <LogOut className="h-4 w-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to="/auth" className="rounded-md bg-primary px-3 py-1.5 text-xs sm:text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      {user && <BottomNav onHome={onHome} />}
    </>
  );
}
