import { test, expect } from "@playwright/test";
import {
  createPostViaApi,
  loginViaApi,
  makeUser,
  registerViaApi,
  seedToken,
} from "fixtures/users";

/**
 * Ownership is enforced by the backend, not by hiding buttons.
 *
 * The UI already declines to render Edit and Delete for a post you did not
 * write, so a browser-only test would pass against a backend with no
 * authorization at all. These drive the API directly to prove the server
 * refuses, and check the UI separately.
 */

async function twoUsers(request: Parameters<typeof registerViaApi>[0]) {
  const author = makeUser("owner");
  const intruder = makeUser("intruder");
  await registerViaApi(request, author);
  await registerViaApi(request, intruder);
  return {
    author,
    intruder,
    authorToken: await loginViaApi(request, author),
    intruderToken: await loginViaApi(request, intruder),
  };
}

test("another user cannot edit your post", async ({ request }) => {
  const { authorToken, intruderToken } = await twoUsers(request);
  const postId = await createPostViaApi(request, authorToken, "Only I may edit this");

  const resp = await request.patch(`/api/posts/${postId}`, {
    headers: { Authorization: `Bearer ${intruderToken}` },
    data: { body: "Hijacked" },
  });

  expect(resp.status()).toBe(403);

  // The post is untouched.
  const after = await request.get(`/api/posts/${postId}`);
  expect((await after.json()).body).toBe("Only I may edit this");
});

test("another user cannot delete your post", async ({ request }) => {
  const { authorToken, intruderToken } = await twoUsers(request);
  const postId = await createPostViaApi(request, authorToken, "Only I may delete this");

  const resp = await request.delete(`/api/posts/${postId}`, {
    headers: { Authorization: `Bearer ${intruderToken}` },
  });

  expect(resp.status()).toBe(403);

  const after = await request.get(`/api/posts/${postId}`);
  expect(after.status()).toBe(200);
});

test("another user cannot edit or delete your comment", async ({ request }) => {
  const { authorToken, intruderToken } = await twoUsers(request);
  const postId = await createPostViaApi(request, authorToken, "A post with a comment");

  const created = await request.post(`/api/posts/${postId}/comments`, {
    headers: { Authorization: `Bearer ${authorToken}` },
    data: { body: "Only I may edit this comment" },
  });
  expect(created.status()).toBe(201);
  const commentId = (await created.json()).id;

  const patched = await request.patch(`/api/posts/${postId}/comments/${commentId}`, {
    headers: { Authorization: `Bearer ${intruderToken}` },
    data: { body: "Hijacked" },
  });
  expect(patched.status()).toBe(403);

  const deleted = await request.delete(`/api/posts/${postId}/comments/${commentId}`, {
    headers: { Authorization: `Bearer ${intruderToken}` },
  });
  expect(deleted.status()).toBe(403);

  const after = await request.get(`/api/posts/${postId}/comments/${commentId}`);
  expect((await after.json()).body).toBe("Only I may edit this comment");
});

test("editing requires authentication at all", async ({ request }) => {
  const { authorToken } = await twoUsers(request);
  const postId = await createPostViaApi(request, authorToken, "Needs a token to change");

  const resp = await request.patch(`/api/posts/${postId}`, {
    data: { body: "Anonymous edit" },
  });

  expect(resp.status()).toBe(401);
});

test("a malformed bearer token is rejected as unauthorized, not a server error", async ({
  request,
}) => {
  const resp = await request.get("/api/auth/me", {
    headers: { Authorization: "Bearer not-a-uuid" },
  });

  expect(resp.status()).toBe(401);
});

test("a reply cannot be attached to a comment on a different post", async ({ request }) => {
  const { authorToken } = await twoUsers(request);
  const postA = await createPostViaApi(request, authorToken, "Post A");
  const postB = await createPostViaApi(request, authorToken, "Post B");

  const onA = await request.post(`/api/posts/${postA}/comments`, {
    headers: { Authorization: `Bearer ${authorToken}` },
    data: { body: "A comment on post A" },
  });
  const commentOnA = (await onA.json()).id;

  // Try to hang a reply off post A's comment while posting to post B.
  const resp = await request.post(`/api/posts/${postB}/comments`, {
    headers: { Authorization: `Bearer ${authorToken}` },
    data: { body: "Orphan reply", parent_comment_id: commentOnA },
  });

  expect(resp.status()).toBe(404);
});

test("the UI hides edit and delete on someone else's post", async ({ page, request }) => {
  const { authorToken, intruder } = await twoUsers(request);
  const postId = await createPostViaApi(request, authorToken, "Someone else's post");
  const intruderToken = await loginViaApi(request, intruder);
  await seedToken(page, intruderToken);

  await page.goto(`/posts/${postId}`);

  await expect(page.getByText("Someone else's post")).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
});

test("visiting the edit page for someone else's post is refused", async ({ page, request }) => {
  const { authorToken, intruder } = await twoUsers(request);
  const postId = await createPostViaApi(request, authorToken, "Not yours to edit");
  const intruderToken = await loginViaApi(request, intruder);
  await seedToken(page, intruderToken);

  await page.goto(`/posts/${postId}/edit`);

  await expect(page.getByText(/only edit your own posts/i)).toBeVisible();
});
