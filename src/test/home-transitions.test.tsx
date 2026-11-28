import { createElement, useState, type ComponentType } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  ready: false,
  user: null as { id: string; user_metadata: Record<string, string> } | null,
  native: false,
  decks: vi.fn(async (): Promise<unknown[]> => []),
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: state.user, ready: state.ready }) }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  useLocation: () => ({ hash: "" }),
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/contexts/LibraryTimerContext", () => ({
  useLibraryTimer: () => {
    const [, setOpen] = useState(false);
    return { openOverlay: () => setOpen(true) };
  },
}));
vi.mock("@/hooks/use-streak", () => ({
  useStreak: () => ({ goal: 20, streak: { today: 0, current: 0 }, celebrate: null }),
}));
vi.mock("@/lib/native-auth", () => ({ isNativeApp: () => state.native }));
vi.mock("@/lib/library", () => ({
  fetchDailyFocusTime: async () => 0,
  fetchStudyTodos: async () => [],
  fetchUserBuddies: async () => [],
}));
vi.mock("@/lib/profile", () => ({ fetchProfile: async () => ({ full_name: "Student" }) }));
vi.mock("@/lib/qbank", () => ({
  fetchDecks: state.decks,
  fetchStats: async () => ({}),
  fetchMarked: async () => ({ bookmarks: [], mistakes: [] }),
  loadSession: () => null,
}));
vi.mock("@/lib/subscriptions", () => ({
  fetchAccess: async () => ({ subscriptions: [] }),
  fetchPlanSubjects: async () => [],
  lockedSubjects: () => new Set(),
}));
vi.mock("@/lib/quiz-reviews", () => ({ fetchQuizReviews: async () => [], availableReviews: () => [] }));
vi.mock("@/lib/blitz", () => ({}));
vi.mock("@/lib/offline-data", () => ({ offlineErrorMessage: () => "Error" }));
vi.mock("@/components/qbank/FeatureGate", () => ({ useFeatures: () => ({ enabled: () => false }), Feature: () => null }));
vi.mock("@/components/qbank/OpeningScreen", () => ({ OpeningScreen: () => <p>Opening Elixir</p> }));
vi.mock("@/components/qbank/GoogleSignInButton", () => ({ GoogleSignInButton: () => <span>Continue with Google</span> }));
vi.mock("@/components/library/TodayTodoListSheet", () => ({ TodayTodoListSheet: () => null }));
vi.mock("@/components/qbank/AppHeader", () => ({ AppHeader: () => null }));
vi.mock("@/components/qbank/Blitz", () => ({ BlitzCard: () => null, BlitzRankLine: () => null }));
vi.mock("@/components/qbank/Celebration", () => ({ Celebration: () => null }));
vi.mock("@/components/qbank/Daily", () => ({ QuestionOfTheDay: () => null, QuoteOfTheDay: () => null }));
vi.mock("@/components/qbank/SubjectGrid", () => ({ SubjectGrid: () => null }));
vi.mock("@/components/qbank/QuizSettings", () => ({ QuizSettings: () => null }));
vi.mock("@/components/qbank/Quiz", () => ({ Quiz: () => null }));
vi.mock("@/components/qbank/PushToggle", () => ({ PushToggle: () => null }));
vi.mock("@/components/qbank/OfflineDownload", () => ({ OfflineDownload: () => null }));
vi.mock("@/components/qbank/Bookmarks", () => ({ Bookmarks: () => null }));
vi.mock("@/components/qbank/TrialRequest", () => ({ TrialCountdown: () => null }));

import { Route } from "@/routes/index";

function home(client: QueryClient) {
  const component = Route.options.component;
  if (!component) throw new Error("Home component missing");
  return <QueryClientProvider client={client}>{createElement(component as ComponentType)}</QueryClientProvider>;
}

afterEach(() => {
  cleanup();
  state.ready = false;
  state.user = null;
  state.native = false;
  state.decks.mockReset();
  state.decks.mockResolvedValue([]);
});

describe("Home hook order", () => {
  it("keeps the same hooks through loading, sign-in, sign-out and signing in again", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(home(client));
    expect(screen.getByText("Opening Elixir")).toBeInTheDocument();
    state.ready = true;
    view.rerender(home(client));
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    state.user = { id: "student", user_metadata: {} };
    view.rerender(home(client));
    await screen.findByRole("heading", { name: "Hi, Student" });
    state.user = null;
    view.rerender(home(client));
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    state.user = { id: "student", user_metadata: {} };
    view.rerender(home(client));
    expect(screen.getByRole("heading", { name: "Hi, Student" })).toBeInTheDocument();
    client.clear();
  });

  it("keeps the same hooks when native deck loading finishes", async () => {
    let finish: ((rows: unknown[]) => void) | undefined;
    state.native = true;
    state.ready = true;
    state.user = { id: "student", user_metadata: {} };
    state.decks.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(home(client));
    expect(screen.getByText("Opening Elixir")).toBeInTheDocument();
    await waitFor(() => expect(state.decks).toHaveBeenCalled());
    if (!finish) throw new Error("Deck request did not start");
    finish([]);
    await screen.findByRole("heading", { name: "Hi, Student" });
    client.clear();
  });
});