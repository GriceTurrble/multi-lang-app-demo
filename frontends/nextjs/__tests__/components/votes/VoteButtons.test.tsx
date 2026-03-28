import React from "react";
import { describe, it, expect, vi } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VoteButtons } from "@/components/votes/VoteButtons";

function makeOnVote(rejectWith?: Error) {
  return rejectWith
    ? vi.fn().mockRejectedValue(rejectWith)
    : vi.fn().mockResolvedValue(undefined);
}

describe("VoteButtons", () => {
  it("renders the current score", () => {
    render(<VoteButtons score={0} onVote={makeOnVote()} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("prefixes positive score with +", () => {
    render(<VoteButtons score={5} onVote={makeOnVote()} />);
    expect(screen.getByText("+5")).toBeInTheDocument();
  });

  it("upvote button has active (orange) styling when userVote is 1", () => {
    render(<VoteButtons score={1} userVote={1} onVote={makeOnVote()} />);
    const upBtn = screen.getByRole("button", { name: "Upvote" });
    expect(upBtn.className).toMatch(/orange/);
  });

  it("downvote button has active (blue) styling when userVote is -1", () => {
    render(<VoteButtons score={-1} userVote={-1} onVote={makeOnVote()} />);
    const downBtn = screen.getByRole("button", { name: "Downvote" });
    expect(downBtn.className).toMatch(/blue/);
  });

  it("neither button has active styling when userVote is 0", () => {
    render(<VoteButtons score={0} userVote={0} onVote={makeOnVote()} />);
    const upBtn = screen.getByRole("button", { name: "Upvote" });
    const downBtn = screen.getByRole("button", { name: "Downvote" });
    expect(upBtn.className).not.toMatch(/orange/);
    expect(downBtn.className).not.toMatch(/blue/);
  });

  it("clicking upvote calls onVote(1)", async () => {
    const onVote = makeOnVote();
    render(<VoteButtons score={0} userVote={0} onVote={onVote} />);
    fireEvent.click(screen.getByRole("button", { name: "Upvote" }));
    await waitFor(() => expect(onVote).toHaveBeenCalledWith(1));
  });

  it("clicking upvote when already upvoted calls onVote(0) to toggle off", async () => {
    const onVote = makeOnVote();
    render(<VoteButtons score={1} userVote={1} onVote={onVote} />);
    fireEvent.click(screen.getByRole("button", { name: "Upvote" }));
    await waitFor(() => expect(onVote).toHaveBeenCalledWith(0));
  });

  it("clicking downvote calls onVote(-1)", async () => {
    const onVote = makeOnVote();
    render(<VoteButtons score={0} userVote={0} onVote={onVote} />);
    fireEvent.click(screen.getByRole("button", { name: "Downvote" }));
    await waitFor(() => expect(onVote).toHaveBeenCalledWith(-1));
  });

  it("optimistically updates score before onVote resolves", async () => {
    let resolve!: () => void;
    const onVote = vi.fn().mockReturnValue(new Promise<void>((res) => { resolve = res; }));
    render(<VoteButtons score={3} userVote={0} onVote={onVote} />);
    fireEvent.click(screen.getByRole("button", { name: "Upvote" }));
    expect(screen.getByText("+4")).toBeInTheDocument();
    await act(async () => { resolve(); });
  });

  it("reverts score on failure", async () => {
    const onVote = makeOnVote(new Error("Network error"));
    render(<VoteButtons score={3} userVote={0} onVote={onVote} />);
    fireEvent.click(screen.getByRole("button", { name: "Upvote" }));
    await waitFor(() => expect(screen.getByText("+3")).toBeInTheDocument());
  });

  it("does not call onVote and both buttons are disabled when disabled prop is set", () => {
    const onVote = makeOnVote();
    render(<VoteButtons score={0} onVote={onVote} disabled />);
    const upBtn = screen.getByRole("button", { name: "Upvote" });
    const downBtn = screen.getByRole("button", { name: "Downvote" });
    expect(upBtn).toBeDisabled();
    expect(downBtn).toBeDisabled();
    fireEvent.click(upBtn);
    expect(onVote).not.toHaveBeenCalled();
  });

  it("syncs userVote from updated props when not pending", async () => {
    const onVote = makeOnVote();
    const { rerender } = render(<VoteButtons score={0} userVote={0} onVote={onVote} />);
    expect(screen.getByRole("button", { name: "Upvote" }).className).not.toMatch(/orange/);
    rerender(<VoteButtons score={1} userVote={1} onVote={onVote} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Upvote" }).className).toMatch(/orange/)
    );
  });

  it("ignores further clicks while a vote is already pending", async () => {
    let resolve!: () => void;
    const onVote = vi.fn().mockReturnValue(new Promise<void>((res) => { resolve = res; }));
    render(<VoteButtons score={0} userVote={0} onVote={onVote} />);
    fireEvent.click(screen.getByRole("button", { name: "Upvote" }));   // sets pending=true
    fireEvent.click(screen.getByRole("button", { name: "Downvote" })); // should be ignored
    await act(async () => { resolve(); });
    expect(onVote).toHaveBeenCalledTimes(1);
  });

  it("does not reset optimistic vote when userVote prop changes while pending", async () => {
    let resolve!: () => void;
    const onVote = vi.fn().mockReturnValue(new Promise<void>((res) => { resolve = res; }));
    const { rerender } = render(<VoteButtons score={0} userVote={0} onVote={onVote} />);
    fireEvent.click(screen.getByRole("button", { name: "Upvote" })); // pending=true, optimistic upvote
    // Rerender with a different external userVote while pending — should NOT override optimistic state
    rerender(<VoteButtons score={0} userVote={-1} onVote={onVote} />);
    expect(screen.getByRole("button", { name: "Upvote" }).className).toMatch(/orange/);
    await act(async () => { resolve(); });
  });

  it("applies flex-col class when vertical prop is set", () => {
    const { container } = render(<VoteButtons score={0} onVote={makeOnVote()} vertical />);
    expect(container.firstChild).toHaveClass("flex-col");
  });
});
