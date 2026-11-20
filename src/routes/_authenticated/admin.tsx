import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/qbank/AppHeader";
import { AdminConsole } from "@/components/admin/AdminConsole";
import { fetchAccess } from "@/lib/subscriptions";

export const Route = createFileRoute("/_authenticated/admin")({ head: () => ({ meta: [{ title: "Administration | Elixir" }, { name: "description", content: "Manage students, purchase progress, plans, features and subscriptions in Elixir." }, { property: "og:title", content: "Elixir subscription administration" }, { property: "og:description", content: "Student subscriptions and payment approvals." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }), component: AdminPage });
function AdminPage() {
  const { user } = useAuth(); const access = useQuery({ queryKey: ["access", user?.id], queryFn: fetchAccess, enabled: !!user });
  return <div className="min-h-screen bg-background text-foreground"><AppHeader />{access.isPending ? <main className="p-8">Checking administrator access…</main> : access.error ? <main role="alert" className="p-8 text-destructive">Unable to verify administrator access. Please reconnect.</main> : !access.data?.admin ? <main className="p-8"><h1 className="text-3xl text-primary">Administrator access required</h1></main> : <AdminConsole />}</div>;
}
