import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PostForm } from "@/components/posts/PostForm";

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

describe("PostForm", () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    onSubmit.mockClear();
  });

  it("submit button is disabled when body is empty", () => {
    render(<PostForm onSubmit={onSubmit} />);
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
  });

  it("submit button is enabled after typing in body", () => {
    render(<PostForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText("What's on your mind?"), {
      target: { value: "Some body text" },
    });
    expect(screen.getByRole("button", { name: /submit/i })).not.toBeDisabled();
  });

  it("pre-fills title and body from initialValues", () => {
    render(<PostForm onSubmit={onSubmit} initialValues={{ title: "My Title", body: "My Body" }} />);
    expect(screen.getByPlaceholderText("Post title...")).toHaveValue("My Title");
    expect(screen.getByPlaceholderText("What's on your mind?")).toHaveValue("My Body");
  });

  it("calls onSubmit with trimmed title and body", async () => {
    render(<PostForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText("Post title..."), {
      target: { value: "  Hello  " },
    });
    fireEvent.change(screen.getByPlaceholderText("What's on your mind?"), {
      target: { value: "  World  " },
    });
    fireEvent.submit(screen.getByPlaceholderText("What's on your mind?").closest("form")!);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ title: "Hello", body: "World" }));
  });

  it("omits title from submission when title is empty", async () => {
    render(<PostForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText("What's on your mind?"), {
      target: { value: "Just a body" },
    });
    fireEvent.submit(screen.getByPlaceholderText("What's on your mind?").closest("form")!);
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ title: undefined, body: "Just a body" })
    );
  });

  it("shows an error message when onSubmit rejects", async () => {
    const failingSubmit = vi.fn().mockRejectedValue(new Error("Server error"));
    render(<PostForm onSubmit={failingSubmit} />);
    fireEvent.change(screen.getByPlaceholderText("What's on your mind?"), {
      target: { value: "body" },
    });
    fireEvent.submit(screen.getByPlaceholderText("What's on your mind?").closest("form")!);
    await waitFor(() => expect(screen.getByText("Server error")).toBeInTheDocument());
  });

  it("shows Saving... and disables button while submitting", async () => {
    let resolve!: () => void;
    const slowSubmit = vi.fn().mockReturnValue(new Promise<void>((res) => { resolve = res; }));
    render(<PostForm onSubmit={slowSubmit} />);
    fireEvent.change(screen.getByPlaceholderText("What's on your mind?"), {
      target: { value: "body" },
    });
    fireEvent.submit(screen.getByPlaceholderText("What's on your mind?").closest("form")!);
    expect(await screen.findByText("Saving...")).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: "Saving..." });
    expect(btn).toBeDisabled();
    resolve();
  });

  it("uses a custom submitLabel", () => {
    render(<PostForm onSubmit={onSubmit} submitLabel="Publish" />);
    expect(screen.getByRole("button", { name: "Publish" })).toBeInTheDocument();
  });

  it("cancel link points to /posts", () => {
    render(<PostForm onSubmit={onSubmit} />);
    const cancel = screen.getByRole("link", { name: "Cancel" });
    expect(cancel).toHaveAttribute("href", "/posts");
  });
});
