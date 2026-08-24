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

test("a signed-in user can create a post and see it in the list", async ({
  page,
  authedUser,
}) => {
  const title = `Post title ${Date.now()}`;
  const body = "The body of a brand new post.";

  await page.goto("/posts/new");
  await page.getByPlaceholder("Post title...").fill(title);
  await page.getByPlaceholder("What's on your mind?").fill(body);
  await page.getByRole("button", { name: "Create Post" }).click();

  // Redirects to the new post's detail page.
  await expect(page).toHaveURL(/\/posts\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText(body)).toBeVisible();
  // Scoped to main: the header also shows the signed-in username.
  await expect(page.getByRole("main").getByText(authedUser.username)).toBeVisible();

  // And appears at the top of the list, which is ordered newest first.
  await page.goto("/posts");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});

test("the posts list shows the newest post first", async ({ page, authedUser }) => {
  const token = await loginViaApi(page.request, authedUser);
  const older = `Older post ${Date.now()}`;
  const newer = `Newer post ${Date.now()}`;
  await createPostViaApi(page.request, token, "older body", older);
  await createPostViaApi(page.request, token, "newer body", newer);

  await page.goto("/posts");

  const headings = page.getByRole("heading", { level: 2 });
  await expect(headings.first()).toHaveText(newer);
  // The older of the two sits below it.
  const titles = await headings.allTextContents();
  expect(titles.indexOf(newer)).toBeLessThan(titles.indexOf(older));
});

test("a post can be created without a title", async ({ page, authedUser }) => {
  const body = `Untitled post body ${Date.now()}`;

  await page.goto("/posts/new");
  await page.getByPlaceholder("What's on your mind?").fill(body);
  await page.getByRole("button", { name: "Create Post" }).click();

  await expect(page).toHaveURL(/\/posts\/[0-9a-f-]{36}$/);
  await expect(page.getByText(body)).toBeVisible();
});

test("an author can edit their own post", async ({ page, authedUser }) => {
  const token = await loginViaApi(page.request, authedUser);
  const postId = await createPostViaApi(page.request, token, "Original body", "Original title");

  await page.goto(`/posts/${postId}`);
  await waitForSignedIn(page);
  await page.getByRole("link", { name: "Edit" }).click();

  await expect(page).toHaveURL(new RegExp(`/posts/${postId}/edit$`));
  await page.getByPlaceholder("What's on your mind?").fill("Edited body");
  await page.getByRole("button", { name: "Save Changes" }).click();

  await expect(page).toHaveURL(new RegExp(`/posts/${postId}$`));
  await expect(page.getByText("Edited body")).toBeVisible();
  await expect(page.getByText("Original body")).toHaveCount(0);
  // An edited post is marked as such.
  await expect(page.getByText(/^edited /)).toBeVisible();
});

test("an author can delete their own post", async ({ page, authedUser }) => {
  const token = await loginViaApi(page.request, authedUser);
  const body = `Doomed post ${Date.now()}`;
  const postId = await createPostViaApi(page.request, token, body);

  await page.goto(`/posts/${postId}`);
  await waitForSignedIn(page);
  await page.getByRole("button", { name: "Delete" }).click();
  // Confirm in the modal.
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();

  await expect(page).toHaveURL(/\/posts$/);
  await expect(page.getByText(body)).toHaveCount(0);

  // The post is really gone, not just removed from the list.
  const resp = await page.request.get(`/api/posts/${postId}`);
  expect(resp.status()).toBe(404);
});

anonTest("anonymous visitors can browse posts but not create them", async ({ page, request }) => {
  const author = makeUser("browse");
  await registerViaApi(request, author);
  const token = await loginViaApi(request, author);
  const body = `Publicly visible post ${Date.now()}`;
  const id = await createPostViaApi(request, token, body);

  // Reading a post needs no account.
  await page.goto(`/posts/${id}`);
  await expect(page.getByText(body)).toBeVisible();
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();

  // Neither does browsing the list, where the new post is now on top.
  await page.goto("/posts");
  await expect(page.getByText(body)).toBeVisible();

  // Creating does, so the protected route bounces to login.
  await page.goto("/posts/new");
  await expect(page).toHaveURL(/\/auth\/login$/);
});
