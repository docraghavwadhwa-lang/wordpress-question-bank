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
  it("submits with skipped questions without forcing a revisit", () => {
    const onFinish = vi.fn();
    render(<Quiz questions={questions} timer={0} userId={null} bookmarks={new Set()} onFinish={onFinish} onExit={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    fireEvent.click(screen.getByRole("button", { name: "A. First" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(onFinish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^Submit$/ }));
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ score: 1, answered: 1, choices: { 2: "A" }, completed: true }));
  });
  it("submits with skipped questions only after the student chooses Submit", () => {
    const onFinish = vi.fn();
    render(<Quiz questions={questions} timer={0} userId={null} bookmarks={new Set()} onFinish={onFinish} onExit={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onFinish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^Submit$/ }));
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ score: 0, answered: 0, choices: {}, completed: true }));
  });
});
describe("test mode", () => {
  it("hides solutions, allows changing answers and scores only on submit", () => {
    const onFinish = vi.fn();
    render(<Quiz test questions={questions} timer={0} userId={null} bookmarks={new Set()} onFinish={onFinish} onExit={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "B. Second" }));
    expect(screen.queryByText("Solution")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "A. First" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "B. Second" }));
    expect(onFinish).not.toHaveBeenCalled();
    const openSubmit = screen.getAllByRole("button", { name: "Submit test" })[0];
    if (!openSubmit) throw new Error("Submit test button missing");
    fireEvent.click(openSubmit);
    const confirmSubmit = screen.getAllByRole("button", { name: "Submit test" }).at(-1);
    if (!confirmSubmit) throw new Error("Submit confirmation missing");
    fireEvent.click(confirmSubmit);
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ score: 1, answered: 2, choices: { 1: "A", 2: "B" }, completed: true }));
  });
});
it("submitting with skipped questions records completed state upon user confirmation", () => {
  const onFinish = vi.fn();
  render(<Quiz questions={questions} timer={0} userId={null} bookmarks={new Set()} onFinish={onFinish} onExit={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Skip" }));
  fireEvent.click(screen.getByRole("button", { name: "A. First" }));
  fireEvent.click(screen.getByRole("button", { name: "Finish" }));
  fireEvent.click(screen.getByRole("button", { name: /^Submit$/ }));
  expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ completed: true, answered: 1, score: 1, choices: { 2: "A" } }));
});
it("jumping to an answered quiz question does not score it again", () => {
  const onFinish = vi.fn();
  render(<Quiz questions={questions} timer={0} userId={null} bookmarks={new Set()} onFinish={onFinish} onExit={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "A. First" }));
  fireEvent.click(screen.getByRole("button", { name: "Go to question 2" }));
  fireEvent.click(screen.getByRole("button", { name: "Go to question 1" }));
  fireEvent.click(screen.getByRole("button", { name: "B. Second" }));
  fireEvent.click(screen.getByRole("button", { name: "Go to question 2" }));
  fireEvent.click(screen.getByRole("button", { name: "A. First" }));
  fireEvent.click(screen.getByRole("button", { name: "Finish" }));
  expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ score: 2, answered: 2, choices: { 1: "A", 2: "A" } }));
});

describe("blitz mode timer", () => {
  it("uses the total 200s session finish timer across questions rather than per-question reset", () => {
    const onFinish = vi.fn();
    render(<Quiz mode="blitz" timer={200} questions={questions} userId={null} bookmarks={new Set()} onFinish={onFinish} onExit={() => {}} />);
    expect(screen.getByText("3:20")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "A. First" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    // Still displays countdown (not reset)
    expect(screen.queryByText("200s")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "B. Second" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ score: 1, answered: 2, completed: true }));
  });
});
