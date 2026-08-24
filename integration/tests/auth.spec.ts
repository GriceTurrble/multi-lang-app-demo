import { test, expect } from "@playwright/test";
import { makeUser, loginViaApi, registerViaApi } from "fixtures/users";

/**
 * Registration and login driven entirely through the browser.
 *
 * These deliberately avoid the API helpers: the point is to exercise the real
 * request against a real Postgres. A backend that mocks its database in unit
 * tests can pass every one of them and still fail here, which is exactly what
 * happened with the misspelled `password_hash` column.
 */

test("a new user can register through the UI", async ({ page }) => {
  const user = makeUser("reg");

  await page.goto("/auth/register");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Username").fill(user.username);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("main").getByRole("button", { name: "Register" }).click();

  // Success redirects to the login page.
  await expect(page).toHaveURL(/\/auth\/login$/);
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
});

test("a registered user can log in and is shown as signed in", async ({ page }) => {
  const user = makeUser("login");
  await registerViaApi(page.request, user);

  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("main").getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/\/posts$/);
  await expect(page.getByText(user.username)).toBeVisible();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
});

test("registering a duplicate email is reported, not swallowed", async ({ page }) => {
  const user = makeUser("dupe");
  await registerViaApi(page.request, user);

  await page.goto("/auth/register");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Username").fill(`${user.username}_other`);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("main").getByRole("button", { name: "Register" }).click();

  await expect(page.getByText(/already registered/i)).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/register$/);
});

test("logging in with a wrong password is rejected", async ({ page }) => {
  const user = makeUser("badpass");
  await registerViaApi(page.request, user);

  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("main").getByRole("button", { name: "Login" }).click();

  await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/login$/);
});

test("a signed-in user can log out", async ({ page }) => {
  const user = makeUser("logout");
  await registerViaApi(page.request, user);
  const token = await loginViaApi(page.request, user);
  await page.addInitScript((value) => {
    window.localStorage.setItem("mlad_token", value);
  }, token);

  await page.goto("/posts");
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await page.getByRole("button", { name: "Log out" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();

  // The token is cleared, so a reload stays logged out.
  await page.reload();
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
});

test("an invalid stored token is discarded on load", async ({ page }) => {
  // A token that is not even a UUID must be treated as logged out, not as a
  // server error.
  await page.addInitScript(() => {
    window.localStorage.setItem("mlad_token", "not-a-valid-token");
  });

  await page.goto("/posts");

  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem("mlad_token"))).toBeNull();
});

test("protected routes redirect anonymous users to login", async ({ page }) => {
  await page.goto("/posts/new");

  await expect(page).toHaveURL(/\/auth\/login$/);
});
