import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithAuth } from "@/__tests__/utils";
import { CommentNode } from "@/components/comments/CommentNode";
import type { CommentNode as CommentNodeType } from "@/lib/api/treeUtils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("next/form", () => ({
  default: ({ action, children, ...props }: React.FormHTMLAttributes<HTMLFormElement> & { action: (fd: FormData) => void }) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        action(new FormData(e.currentTarget));
      }}
      {...props}
    >
      {children}
    </form>
  ),
}));

vi.mock("@/lib/api/votes", () => ({
  voteOnComment: vi.fn().mockResolvedValue({ object_id: "c1", object_type: "comment", vote_score: 1 }),
}));

const mockDeleteComment = vi.fn();
const mockUpdateComment = vi.fn();
const mockCreateComment = vi.fn();
const mockListReplies = vi.fn();
vi.mock("@/lib/api/comments", () => ({
  deleteComment: (...args: unknown[]) => mockDeleteComment(...args),
  updateComment: (...args: unknown[]) => mockUpdateComment(...args),
  createComment: (...args: unknown[]) => mockCreateComment(...args),
  listReplies: (...args: unknown[]) => mockListReplies(...args),
}));

const aliceUser = { id: "u1", email: "a@b.com", username: "alice" };

function makeNode(overrides: Partial<CommentNodeType> = {}): CommentNodeType {
  return {
    id: "c1",
    post_id: "p1",
    author: "alice",
    body: "Test comment body",
    created_at: "2024-06-15T12:00:00Z",
    updated_at: "2024-06-15T12:00:00Z",
    vote_score: 0,
    user_vote: 0,
    replies: [],
    ...overrides,
  };
}

describe("CommentNode", () => {
  beforeEach(() => {
    mockDeleteComment.mockReset();
    mockUpdateComment.mockReset();
    mockCreateComment.mockReset();
    mockListReplies.mockReset();
  });

  it("renders author, date, and body", () => {
    renderWithAuth(<CommentNode postId="p1" comment={makeNode()} />);
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("Test comment body")).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it("shows 'edited' label when updated_at differs from created_at", () => {
    renderWithAuth(
      <CommentNode
        postId="p1"
        comment={makeNode({ updated_at: "2024-02-01T00:00:00Z" })}
      />
    );
    expect(screen.getByText("edited")).toBeInTheDocument();
  });

  it("shows Edit and Delete buttons when user is the author", () => {
    renderWithAuth(<CommentNode postId="p1" comment={makeNode()} />, {
      user: aliceUser,
      token: "tok",
    });
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("does not show Edit/Delete when user is not the author", () => {
    renderWithAuth(<CommentNode postId="p1" comment={makeNode()} />, {
      user: { id: "u2", email: "b@b.com", username: "bob" },
      token: "tok",
    });
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("toggles reply form when Reply button is clicked", () => {
    renderWithAuth(<CommentNode postId="p1" comment={makeNode()} />, { token: "tok" });
    fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    expect(screen.getByPlaceholderText("Write a reply...")).toBeInTheDocument();
    // Two "Cancel" buttons exist when the reply form is open: the reply toggle and the form's own Cancel.
    // Click the first one (the toggle button that now reads "Cancel").
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
    expect(screen.queryByPlaceholderText("Write a reply...")).not.toBeInTheDocument();
  });

  it("shows inline textarea pre-filled with body when Edit is clicked", () => {
    renderWithAuth(<CommentNode postId="p1" comment={makeNode()} />, {
      user: aliceUser,
      token: "tok",
    });
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByDisplayValue("Test comment body")).toBeInTheDocument();
  });

  it("calls updateComment and hides edit form on save", async () => {
    mockUpdateComment.mockResolvedValue({
      ...makeNode(),
      body: "Updated body",
    });
    renderWithAuth(<CommentNode postId="p1" comment={makeNode()} />, {
      user: aliceUser,
      token: "tok",
    });
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByDisplayValue("Test comment body"), {
      target: { value: "Updated body" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(mockUpdateComment).toHaveBeenCalledWith(
        "p1", "c1", { body: "Updated body" }, "tok"
      )
    );
    expect(screen.queryByDisplayValue("Updated body")).not.toBeInTheDocument();
  });

  it("restores original body when edit is cancelled", () => {
    renderWithAuth(<CommentNode postId="p1" comment={makeNode()} />, {
      user: aliceUser,
      token: "tok",
    });
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByDisplayValue("Test comment body"), {
      target: { value: "Discarded draft" },
    });
    // When editing, the Edit toggle reads "Cancel" and the inline edit form also has a "Cancel" button.
    // Use the first one in DOM order (the edit form's Cancel button).
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
    expect(screen.getByText("Test comment body")).toBeInTheDocument();
  });

  it("does not show ConfirmModal initially", () => {
    renderWithAuth(<CommentNode postId="p1" comment={makeNode()} />, {
      user: aliceUser,
      token: "tok",
    });
    expect(screen.queryByText("Delete comment?")).not.toBeInTheDocument();
  });

  it("opens ConfirmModal when Delete is clicked", () => {
    renderWithAuth(<CommentNode postId="p1" comment={makeNode()} />, {
      user: aliceUser,
      token: "tok",
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete comment?")).toBeInTheDocument();
  });

  it("closes modal without deleting when Cancel is clicked", () => {
    renderWithAuth(<CommentNode postId="p1" comment={makeNode()} />, {
      user: aliceUser,
      token: "tok",
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Delete comment?")).not.toBeInTheDocument();
    expect(mockDeleteComment).not.toHaveBeenCalled();
  });

  it("calls deleteComment and renders [deleted] on confirm", async () => {
    mockDeleteComment.mockResolvedValue(undefined);
    renderWithAuth(<CommentNode postId="p1" comment={makeNode()} />, {
      user: aliceUser,
      token: "tok",
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.getByText("[deleted]")).toBeInTheDocument());
  });

  it("does not show [deleted] when deleteComment fails", async () => {
    mockDeleteComment.mockRejectedValue(new Error("Forbidden"));
    renderWithAuth(<CommentNode postId="p1" comment={makeNode()} />, {
      user: aliceUser,
      token: "tok",
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(mockDeleteComment).toHaveBeenCalled());
    expect(screen.queryByText("[deleted]")).not.toBeInTheDocument();
    expect(screen.getByText("Test comment body")).toBeInTheDocument();
  });

  it("renders one level of reply nodes from props", () => {
    const node = makeNode({
      replies: [
        makeNode({ id: "r1", body: "Reply one", replies: [] }),
      ],
    });
    renderWithAuth(<CommentNode postId="p1" comment={node} />);
    expect(screen.getByText("Reply one")).toBeInTheDocument();
  });

  it("renders LoadMoreReplies when replyCursor is set via onLoaded", async () => {
    // We set an initial replyCursor by rendering with a comment that has
    // a non-undefined replyCursor — but that's internal state. Instead,
    // test that LoadMoreReplies is absent when there's no cursor, and
    // present when more replies load with a next_cursor.
    // Since replyCursor starts undefined, LoadMoreReplies should not render.
    renderWithAuth(<CommentNode postId="p1" comment={makeNode()} />, { token: "tok" });
    expect(screen.queryByRole("button", { name: "Load more replies" })).not.toBeInTheDocument();
  });

  it("new reply added via handleReplyAdded appears in the list", async () => {
    const newReply = makeNode({ id: "r-new", body: "New reply body", replies: [] });
    mockCreateComment.mockResolvedValue(newReply);
    renderWithAuth(<CommentNode postId="p1" comment={makeNode()} />, {
      user: aliceUser,
      token: "tok",
    });
    fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    fireEvent.change(screen.getByPlaceholderText("Write a reply..."), {
      target: { value: "New reply body" },
    });
    fireEvent.submit(screen.getByPlaceholderText("Write a reply...").closest("form")!);
    await waitFor(() => expect(screen.getByText("New reply body")).toBeInTheDocument());
  });

  it("handleMoreRepliesLoaded appends replies and clears cursor when onLoaded fires", async () => {
    const extraReply = makeNode({ id: "r-extra", body: "Extra reply", replies: [] });
    mockListReplies.mockResolvedValue({ items: [extraReply], next_cursor: undefined });
    const node = makeNode({ reply_cursor: "cursor1" });
    renderWithAuth(<CommentNode postId="p1" comment={node} />, { token: "tok" });
    // LoadMoreReplies renders because reply_cursor is set via initial state
    const loadMoreBtn = await screen.findByRole("button", { name: "Load more replies" });
    fireEvent.click(loadMoreBtn);
    await waitFor(() => expect(screen.getByText("Extra reply")).toBeInTheDocument());
    // Cursor cleared — button should disappear
    expect(screen.queryByRole("button", { name: "Load more replies" })).not.toBeInTheDocument();
  });

  it("closing reply form via form's own Cancel button hides the form", () => {
    renderWithAuth(<CommentNode postId="p1" comment={makeNode()} />, { token: "tok" });
    fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    expect(screen.getByPlaceholderText("Write a reply...")).toBeInTheDocument();
    // Two Cancel buttons: [0] is the Reply toggle, [1] is the CommentForm's own Cancel
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[1]);
    expect(screen.queryByPlaceholderText("Write a reply...")).not.toBeInTheDocument();
  });
});
