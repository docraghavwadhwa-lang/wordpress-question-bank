import { cleanup, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { completionKey } from "@/lib/onboarding";

const mocks = vi.hoisted(() => ({ single: vi.fn(), user: { id: "new-student" } }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: mocks.user, ready: true }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ single: mocks.single }) }) }) } }));
vi.mock("./OnboardingWizard", () => ({ OnboardingWizard: ({ onComplete }: { onComplete: () => void }) => <button onClick={onComplete}>Complete setup</button> }));
import { OnboardingGate } from "./OnboardingGate";

function open() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><OnboardingGate><div>Study dashboard</div></OnboardingGate></QueryClientProvider>);
}
describe("First sign-in persistence", () => {
  beforeEach(() => { localStorage.clear(); mocks.single.mockReset(); mocks.user = { id: "new-student" }; });
  afterEach(cleanup);
  it("requires new users to complete setup before entering the dashboard", async () => {
    mocks.single.mockResolvedValue({ data: { onboarding_completed_at: null }, error: null });
    open();
    expect(await screen.findByText("Complete setup")).toBeInTheDocument();
    expect(screen.queryByText("Study dashboard")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Complete setup"));
    expect(await screen.findByText("Study dashboard")).toBeInTheDocument();
    expect(localStorage.getItem(completionKey("new-student"))).toBe("true");
    cleanup();
    open();
    expect(await screen.findByText("Study dashboard")).toBeInTheDocument();
    expect(mocks.single).toHaveBeenCalledTimes(1);
  });
  it("skips the form when completion exists on another device", async () => {
    mocks.single.mockResolvedValue({ data: { onboarding_completed_at: "2026-11-20T06:02:00Z" }, error: null });
    open();
    expect(await screen.findByText("Study dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Complete setup")).not.toBeInTheDocument();
  });
  it("does not reuse a different student's completion", async () => {
    localStorage.setItem(completionKey("another-student"), "true");
    mocks.single.mockResolvedValue({ data: { onboarding_completed_at: null }, error: null });
    open();
    await waitFor(() => expect(screen.getByText("Complete setup")).toBeInTheDocument());
  });
});