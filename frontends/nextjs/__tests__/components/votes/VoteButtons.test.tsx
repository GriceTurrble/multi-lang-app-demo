import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

  it("optimistically updates score before onVote resolves", () => {
    let resolve!: () => void;
    const onVote = vi.fn().mockReturnValue(new Promise<void>((res) => { resolve = res; }));
    render(<VoteButtons score={3} userVote={0} onVote={onVote} />);
    fireEvent.click(screen.getByRole("button", { name: "Upvote" }));
    expect(screen.getByText("+4")).toBeInTheDocument();
    resolve();
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

  it("applies flex-col class when vertical prop is set", () => {
    const { container } = render(<VoteButtons score={0} onVote={makeOnVote()} vertical />);
    expect(container.firstChild).toHaveClass("flex-col");
  });
});
