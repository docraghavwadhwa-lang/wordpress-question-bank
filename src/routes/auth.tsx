import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/elixir-logo-light.asset.json";
import { GoogleSignInButton } from "@/components/qbank/GoogleSignInButton";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | Elixir" },
      { name: "description", content: "Sign in to save your Q-Bank scores and bookmarks." },
      { property: "og:title", content: "Sign in | Elixir by Nirmaya Care" },
      { property: "og:description", content: "Sign in to save your Q-Bank scores and bookmarks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) void navigate({ to: "/" });
  }, [user, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm">
        <Link to="/" className="block"><img src={logo.url} alt="Elixir by Nirmaya Care" width={1254} height={1254} className="mx-auto h-auto w-48 object-contain" /></Link>
        <h1 className="mt-10 text-3xl">Welcome</h1>
        <p className="mt-1 text-sm text-muted-foreground">Save your scores and bookmark questions.</p>

        <GoogleSignInButton className="mt-6 w-full justify-center rounded-md" />

      </div>
    </div>
  );
}
