import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/feedback", () => ({ answerFeedback: vi.fn() }));
vi.mock("@/lib/qbank", () => ({ recordAttempt: vi.fn(async () => {}), setBookmark: vi.fn(), formatAverage: () => "0 s" }));
import { Quiz } from "./Quiz";

afterEach(cleanup);
const questions = [1, 2].map(id => ({ id, deck_path: "Anatomy > Bones", stem: `Question ${id}`, options: ["First", "Second"], answer: "A", explanation: "Solution" }));
describe("completed attempt capture", () => {
  it("saves all choices in order only when the final question is completed", () => {
    const onFinish = vi.fn();
    render(<Quiz questions={questions} timer={0} userId={null} bookmarks={new Set()} onFinish={onFinish} onExit={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "B. Second" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "A. First" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ score: 1, answered: 2, choices: { 1: "B", 2: "A" }, completed: true }));
  });
  it("does not qualify an unfinished bank for a completed-attempt review", () => {
    const onFinish = vi.fn();
    render(<Quiz questions={questions} timer={0} userId={null} bookmarks={new Set()} onFinish={onFinish} onExit={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "A. First" }));
    fireEvent.click(screen.getByRole("button", { name: "End session" }));
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ completed: false }));
  });
  it("lets students revisit skipped questions before submitting without scoring skips", () => {
    const onFinish = vi.fn();
    render(<Quiz questions={questions} timer={0} userId={null} bookmarks={new Set()} onFinish={onFinish} onExit={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    fireEvent.click(screen.getByRole("button", { name: "A. First" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(onFinish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Revisit skipped questions" }));
    fireEvent.click(screen.getByRole("button", { name: "B. Second" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ score: 1, answered: 2, choices: { 1: "B", 2: "A" }, completed: true }));
  });
  it("submits with skipped questions only after the student chooses Submit", () => {
    const onFinish = vi.fn();
    render(<Quiz questions={questions} timer={0} userId={null} bookmarks={new Set()} onFinish={onFinish} onExit={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onFinish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Submit", exact: true }));
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ score: 0, answered: 0, choices: {}, completed: true }));
  });
});