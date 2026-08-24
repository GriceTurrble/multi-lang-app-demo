import {
  test,
  anonTest,
  expect,
  createPostViaApi,
  loginViaApi,
  makeUser,
  registerViaApi,
  waitForSignedIn,
} from "fixtures/users";

/**
 * A new post starts at a score of 1: the `trg_auto_upvote_post` trigger casts
 * the author's own upvote on insert. These tests lean on that, so they also
 * cover the trigger behaviour the data spec describes.
 */

test("an author's new post starts with their own upvote", async ({ page, authedUser }) => {
  const token = await loginViaApi(page.request, authedUser);
  const postId = await createPostViaApi(page.request, token, "A post to score");

  await page.goto(`/posts/${postId}`);
  await waitForSignedIn(page);

  await expect(page.getByText("1", { exact: true })).toBeVisible();
});

test("downvoting a post moves the score and persists", async ({ page, authedUser }) => {
  const token = await loginViaApi(page.request, authedUser);
  const postId = await createPostViaApi(page.request, token, "A post to downvote");

  await page.goto(`/posts/${postId}`);
  await waitForSignedIn(page);
  // Starts at 1 from the author's automatic upvote; switching to a downvote
  // moves it by two.
  const voted = page.waitForResponse(
    (r) => r.url().includes("/vote") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Downvote" }).click();
  const voteResp = await voted;
  expect((await voteResp.json()).vote_score).toBe(-1);
  await expect(page.getByText("-1", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("-1", { exact: true })).toBeVisible();
});

test("clicking an active vote again removes it", async ({ page, authedUser }) => {
  const token = await loginViaApi(page.request, authedUser);
  const postId = await createPostViaApi(page.request, token, "A post to unvote");

  await page.goto(`/posts/${postId}`);
  await waitForSignedIn(page);
  // The author's automatic upvote is already active, so one click clears it.
  await page.getByRole("button", { name: "Upvote" }).click();
  await expect(page.getByText("0", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("0", { exact: true })).toBeVisible();
});

test("a second user's upvote adds to the score", async ({ page, request, authedUser }) => {
  const authorToken = await loginViaApi(request, authedUser);
  const postId = await createPostViaApi(request, authorToken, "A post two people vote on");

  await page.goto(`/posts/${postId}`);
  await waitForSignedIn(page);
  await expect(page.getByText("1", { exact: true })).toBeVisible();

  // A different user upvotes through the API.
  const voter = makeUser("voter");
  await registerViaApi(request, voter);
  const voterToken = await loginViaApi(request, voter);
  const resp = await request.post(`/api/posts/${postId}/vote`, {
    headers: { Authorization: `Bearer ${voterToken}` },
    data: { value: 1 },
  });
  expect(resp.status()).toBe(200);
  expect((await resp.json()).vote_score).toBe(2);

  await page.reload();
  await expect(page.getByText("2", { exact: true })).toBeVisible();
});

anonTest("anonymous visitors cannot vote", async ({ page, request }) => {
  const author = makeUser("anonvote");
  await registerViaApi(request, author);
  const token = await loginViaApi(request, author);
  const postId = await createPostViaApi(request, token, "A post an anon cannot vote on");

  await page.goto(`/posts/${postId}`);

  await expect(page.getByRole("button", { name: "Upvote" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Downvote" })).toBeDisabled();
});
