import { describe, it, expect, vi, beforeEach } from "vitest";
import * as client from "@/lib/api/client";
import {
  listComments,
  createComment,
  updateComment,
  deleteComment,
  listReplies,
} from "@/lib/api/comments";

vi.mock("@/lib/api/client");

beforeEach(() => {
  vi.mocked(client.apiFetch).mockResolvedValue(undefined as never);
});

describe("listComments", () => {
  it("calls apiFetch with no query string when no params", () => {
    listComments("post1");
    expect(client.apiFetch).toHaveBeenCalledWith("/posts/post1/comments", {}, undefined);
  });

  it("passes token to apiFetch", () => {
    listComments("post1", undefined, "tok");
    expect(client.apiFetch).toHaveBeenCalledWith("/posts/post1/comments", {}, "tok");
  });

  it("treats null token as undefined", () => {
    listComments("post1", undefined, null);
    expect(client.apiFetch).toHaveBeenCalledWith("/posts/post1/comments", {}, undefined);
  });

  it("includes cursor in query string", () => {
    listComments("post1", { cursor: "abc" });
    expect(client.apiFetch).toHaveBeenCalledWith("/posts/post1/comments?cursor=abc", {}, undefined);
  });

  it("includes max_depth in query string", () => {
    listComments("post1", { max_depth: 3 });
    expect(client.apiFetch).toHaveBeenCalledWith("/posts/post1/comments?max_depth=3", {}, undefined);
  });

  it("includes replies_per_page in query string", () => {
    listComments("post1", { replies_per_page: 10 });
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/posts/post1/comments?replies_per_page=10",
      {},
      undefined,
    );
  });

  it("includes all params in query string", () => {
    listComments("post1", { cursor: "abc", max_depth: 2, replies_per_page: 5 });
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/posts/post1/comments?cursor=abc&max_depth=2&replies_per_page=5",
      {},
      undefined,
    );
  });
});

describe("createComment", () => {
  it("posts to the correct endpoint with body and token", () => {
    createComment("post1", { body: "hello" }, "tok");
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/posts/post1/comments",
      { method: "POST", body: JSON.stringify({ body: "hello" }) },
      "tok",
    );
  });

  it("includes parent_comment_id when provided", () => {
    createComment("post1", { body: "reply", parent_comment_id: "c1" }, "tok");
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/posts/post1/comments",
      { method: "POST", body: JSON.stringify({ body: "reply", parent_comment_id: "c1" }) },
      "tok",
    );
  });
});

describe("updateComment", () => {
  it("patches the correct endpoint with body and token", () => {
    updateComment("post1", "c1", { body: "edited" }, "tok");
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/posts/post1/comments/c1",
      { method: "PATCH", body: JSON.stringify({ body: "edited" }) },
      "tok",
    );
  });
});

describe("deleteComment", () => {
  it("deletes the correct endpoint with token", () => {
    deleteComment("post1", "c1", "tok");
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/posts/post1/comments/c1",
      { method: "DELETE" },
      "tok",
    );
  });
});

describe("listReplies", () => {
  it("calls apiFetch with no query string when no params", () => {
    listReplies("post1", "c1");
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/posts/post1/comments/c1/replies",
      {},
      undefined,
    );
  });

  it("passes token to apiFetch", () => {
    listReplies("post1", "c1", undefined, "tok");
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/posts/post1/comments/c1/replies",
      {},
      "tok",
    );
  });

  it("treats null token as undefined", () => {
    listReplies("post1", "c1", undefined, null);
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/posts/post1/comments/c1/replies",
      {},
      undefined,
    );
  });

  it("includes cursor in query string", () => {
    listReplies("post1", "c1", { cursor: "xyz" });
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/posts/post1/comments/c1/replies?cursor=xyz",
      {},
      undefined,
    );
  });

  it("includes max_depth in query string", () => {
    listReplies("post1", "c1", { max_depth: 2 });
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/posts/post1/comments/c1/replies?max_depth=2",
      {},
      undefined,
    );
  });

  it("includes replies_per_page in query string", () => {
    listReplies("post1", "c1", { replies_per_page: 5 });
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/posts/post1/comments/c1/replies?replies_per_page=5",
      {},
      undefined,
    );
  });

  it("includes all params in query string", () => {
    listReplies("post1", "c1", { cursor: "xyz", max_depth: 1, replies_per_page: 3 });
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/posts/post1/comments/c1/replies?cursor=xyz&max_depth=1&replies_per_page=3",
      {},
      undefined,
    );
  });
});
