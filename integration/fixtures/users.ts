import { test as base, expect, type APIRequestContext, type Page } from "@playwright/test";

export type TestUser = {
  email: string;
  username: string;
  password: string;
};

/**
 * Build a user unique to this test run.
 *
 * The test stack migrates but never truncates between specs, so every test
 * that registers needs its own credentials to avoid colliding with rows left
 * behind by an earlier run.
 */
export function makeUser(prefix = "user"): TestUser {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return {
    email: `${prefix}_${suffix}@example.com`,
    username: `${prefix}_${suffix}`,
    password: "testpassword123",
  };
}

/** Register a user straight through the API, bypassing the UI. */
export async function registerViaApi(request: APIRequestContext, user: TestUser) {
  const resp = await request.post("/api/auth/register", {
    data: { email: user.email, username: user.username, password: user.password },
  });
  expect(resp.status(), await resp.text()).toBe(201);
  return resp.json();
}

/** Log in through the API and return the session token. */
export async function loginViaApi(request: APIRequestContext, user: TestUser): Promise<string> {
  const resp = await request.post("/api/auth/login", {
    data: { email: user.email, password: user.password },
  });
  expect(resp.status(), await resp.text()).toBe(200);
  const body = await resp.json();
  return body.access_token;
}

/**
 * Seed the browser so the app boots already authenticated.
 *
 * AuthProvider reads this key on mount and validates it against GET /auth/me,
 * so the token has to be in place before the first navigation.
 */
export async function seedToken(page: Page, token: string) {
  await page.addInitScript((value) => {
    window.localStorage.setItem("mlad_token", value);
  }, token);
}

/** Register a fresh user and hand back a page already logged in as them. */
export async function signInAsNewUser(
  page: Page,
  request: APIRequestContext,
  prefix?: string,
): Promise<TestUser> {
  const user = makeUser(prefix);
  await registerViaApi(request, user);
  const token = await loginViaApi(request, user);
  await seedToken(page, token);
  return user;
}

/** Create a post through the API and return its id. */
export async function createPostViaApi(
  request: APIRequestContext,
  token: string,
  body: string,
  title?: string,
): Promise<string> {
  const resp = await request.post("/api/posts", {
    headers: { Authorization: `Bearer ${token}` },
    data: title === undefined ? { body } : { body, title },
  });
  expect(resp.status(), await resp.text()).toBe(201);
  return (await resp.json()).id;
}

/** Create a comment through the API and return its id. */
export async function createCommentViaApi(
  request: APIRequestContext,
  token: string,
  postId: string,
  body: string,
  parentCommentId?: string,
): Promise<string> {
  const resp = await request.post(`/api/posts/${postId}/comments`, {
    headers: { Authorization: `Bearer ${token}` },
    data: parentCommentId ? { body, parent_comment_id: parentCommentId } : { body },
  });
  expect(resp.status(), await resp.text()).toBe(201);
  return (await resp.json()).id;
}

/**
 * Wait until the app has finished resolving the stored token.
 *
 * AuthProvider validates the token against GET /auth/me on mount, and pages
 * refetch once it lands. Interacting before that settles races the refetch,
 * which can overwrite an optimistic update with a stale response.
 */
export async function waitForSignedIn(page: Page) {
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
}

/**
 * A page that is already signed in as a freshly registered user.
 *
 * Specs that are not themselves testing the login flow use this so a failure
 * points at the behaviour under test rather than at sign-in.
 */
export const test = base.extend<{ authedUser: TestUser }>({
  authedUser: async ({ page, request }, use) => {
    const user = await signInAsNewUser(page, request);
    await use(user);
  },
});

/**
 * A plain, never-authenticated page.
 *
 * `seedToken` installs an init script, which re-runs on every navigation, so a
 * signed-in page cannot be made anonymous by clearing storage and reloading.
 * Anonymous cases get their own page and set their fixtures up through
 * `request`, which carries no browser state.
 */
export const anonTest = base;

export { expect } from "@playwright/test";
