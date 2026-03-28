import { describe, it, expect, vi, beforeEach } from "vitest";
import * as client from "@/lib/api/client";
import { listPosts, getPost, createPost, updatePost, deletePost } from "@/lib/api/posts";

vi.mock("@/lib/api/client");

beforeEach(() => {
  vi.mocked(client.apiFetch).mockResolvedValue(undefined as never);
});

describe("listPosts", () => {
  it("calls apiFetch with no cursor", () => {
    listPosts();
    expect(client.apiFetch).toHaveBeenCalledWith("/posts", {}, undefined);
  });

  it("includes cursor in query string when provided", () => {
    listPosts("abc");
    expect(client.apiFetch).toHaveBeenCalledWith("/posts?cursor=abc", {}, undefined);
  });

  it("passes token to apiFetch", () => {
    listPosts(undefined, "tok");
    expect(client.apiFetch).toHaveBeenCalledWith("/posts", {}, "tok");
  });

  it("treats null token as undefined", () => {
    listPosts(undefined, null);
    expect(client.apiFetch).toHaveBeenCalledWith("/posts", {}, undefined);
  });
});

describe("getPost", () => {
  it("calls apiFetch with correct path", () => {
    getPost("post1");
    expect(client.apiFetch).toHaveBeenCalledWith("/posts/post1", {}, undefined);
  });

  it("passes token to apiFetch", () => {
    getPost("post1", "tok");
    expect(client.apiFetch).toHaveBeenCalledWith("/posts/post1", {}, "tok");
  });

  it("treats null token as undefined", () => {
    getPost("post1", null);
    expect(client.apiFetch).toHaveBeenCalledWith("/posts/post1", {}, undefined);
  });
});

describe("createPost", () => {
  it("posts to /posts with body and token", () => {
    createPost({ body: "hello" }, "tok");
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/posts",
      { method: "POST", body: JSON.stringify({ body: "hello" }) },
      "tok",
    );
  });

  it("includes title when provided", () => {
    createPost({ title: "My Post", body: "content" }, "tok");
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/posts",
      { method: "POST", body: JSON.stringify({ title: "My Post", body: "content" }) },
      "tok",
    );
  });
});

describe("updatePost", () => {
  it("patches the correct endpoint with body and token", () => {
    updatePost("post1", { body: "updated" }, "tok");
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/posts/post1",
      { method: "PATCH", body: JSON.stringify({ body: "updated" }) },
      "tok",
    );
  });
});

describe("deletePost", () => {
  it("deletes the correct endpoint with token", () => {
    deletePost("post1", "tok");
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/posts/post1",
      { method: "DELETE" },
      "tok",
    );
  });
});
