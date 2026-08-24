import {
  test,
  anonTest,
  expect,
  createCommentViaApi,
  createPostViaApi,
  loginViaApi,
  makeUser,
  registerViaApi,
  waitForSignedIn,
} from "fixtures/users";

/**
 * CommentNode renders each comment in a wrapper carrying the comment's id, so
 * scoping to it keeps "Edit" and "Delete" from colliding with the post's own
 * controls further up the page.
 */
function comment(page: Parameters<typeof waitForSignedIn>[0], commentId: string) {
  return page.locator(`[id="${commentId}"]`);
}

test("a signed-in user can comment on a post", async ({ page, authedUser }) => {
  const token = await loginViaApi(page.request, authedUser);
  const postId = await createPostViaApi(page.request, token, "A post to comment on");
  const body = `First comment ${Date.now()}`;

  await page.goto(`/posts/${postId}`);
  await waitForSignedIn(page);
  await page.getByPlaceholder("Write a comment...").fill(body);
  await page.getByRole("button", { name: "Post", exact: true }).click();

  await expect(page.getByText(body)).toBeVisible();

  // It survives a reload, so it really persisted.
  await page.reload();
  await expect(page.getByText(body)).toBeVisible();
});

test("a comment can be replied to, building a tree", async ({ page, authedUser }) => {
  const token = await loginViaApi(page.request, authedUser);
  const postId = await createPostViaApi(page.request, token, "A post with a thread");
  const parentBody = `Parent comment ${Date.now()}`;
  const parentId = await createCommentViaApi(page.request, token, postId, parentBody);
  const replyBody = `A reply ${Date.now()}`;

  await page.goto(`/posts/${postId}`);
  await waitForSignedIn(page);
  await expect(page.getByText(parentBody)).toBeVisible();

  await comment(page, parentId).getByRole("button", { name: "Reply" }).click();
  await page.getByPlaceholder("Write a reply...").fill(replyBody);
  await comment(page, parentId).getByRole("button", { name: "Post", exact: true }).click();

  await expect(page.getByText(replyBody)).toBeVisible();

  await page.reload();
  await expect(page.getByText(parentBody)).toBeVisible();
  await expect(page.getByText(replyBody)).toBeVisible();
});

test("an author can edit their own comment", async ({ page, authedUser }) => {
  const token = await loginViaApi(page.request, authedUser);
  const postId = await createPostViaApi(page.request, token, "A post to edit comments on");
  const original = `Original comment ${Date.now()}`;
  const commentId = await createCommentViaApi(page.request, token, postId, original);

  await page.goto(`/posts/${postId}`);
  await waitForSignedIn(page);
  await comment(page, commentId).getByRole("button", { name: "Edit" }).click();
  await comment(page, commentId).getByRole("textbox").fill("Edited comment");
  await comment(page, commentId).getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Edited comment")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Edited comment")).toBeVisible();
  await expect(page.getByText(original)).toHaveCount(0);
  // Exact, because getByText is case-insensitive by default and would also
  // match the "Edited comment" body.
  await expect(comment(page, commentId).getByText("edited", { exact: true })).toBeVisible();
});

test("an author can delete their own comment", async ({ page, authedUser }) => {
  const token = await loginViaApi(page.request, authedUser);
  const postId = await createPostViaApi(page.request, token, "A post to delete comments on");
  const body = `Doomed comment ${Date.now()}`;
  const commentId = await createCommentViaApi(page.request, token, postId, body);

  await page.goto(`/posts/${postId}`);
  await waitForSignedIn(page);
  await comment(page, commentId).getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();

  await expect(page.getByText("[deleted]")).toBeVisible();

  await page.reload();
  await expect(page.getByText(body)).toHaveCount(0);
});

test("a reply is nested under its parent after a reload", async ({ page, authedUser }) => {
  const token = await loginViaApi(page.request, authedUser);
  const postId = await createPostViaApi(page.request, token, "A post with nesting");
  const parentId = await createCommentViaApi(page.request, token, postId, "Top level");
  const replyBody = `Nested reply ${Date.now()}`;
  const replyId = await createCommentViaApi(
    page.request,
    token,
    postId,
    replyBody,
    parentId,
  );

  await page.goto(`/posts/${postId}`);

  // The reply is rendered inside its parent's subtree, not as a sibling.
  await expect(comment(page, parentId).locator(`[id="${replyId}"]`)).toHaveCount(1);
  await expect(page.getByText(replyBody)).toBeVisible();
});

anonTest("anonymous visitors see comments but are prompted to log in", async ({
  page,
  request,
}) => {
  const author = makeUser("anoncomment");
  await registerViaApi(request, author);
  const token = await loginViaApi(request, author);
  const postId = await createPostViaApi(request, token, "A publicly readable post");
  const body = `Readable comment ${Date.now()}`;
  await createCommentViaApi(request, token, postId, body);

  await page.goto(`/posts/${postId}`);

  await expect(page.getByText(body)).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
  await expect(page.getByPlaceholder("Write a comment...")).toHaveCount(0);
});
