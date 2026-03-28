import { describe, it, expect, vi, beforeEach } from "vitest";
import * as client from "@/lib/api/client";
import { voteOnPost, voteOnComment } from "@/lib/api/votes";

vi.mock("@/lib/api/client");

beforeEach(() => {
  vi.mocked(client.apiFetch).mockResolvedValue(undefined as never);
});

describe("voteOnPost", () => {
  it("posts to the correct endpoint with vote body and token", () => {
    voteOnPost("post1", { vote: 1 }, "tok");
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/posts/post1/vote",
      { method: "POST", body: JSON.stringify({ vote: 1 }) },
      "tok",
    );
  });
});

describe("voteOnComment", () => {
  it("posts to the correct endpoint with vote body and token", () => {
    voteOnComment("post1", "c1", { vote: -1 }, "tok");
    expect(client.apiFetch).toHaveBeenCalledWith(
      "/posts/post1/comments/c1/vote",
      { method: "POST", body: JSON.stringify({ vote: -1 }) },
      "tok",
    );
  });
});
