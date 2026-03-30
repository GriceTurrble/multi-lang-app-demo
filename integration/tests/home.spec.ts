import { test, expect } from "fixtures/HomePage";

test("home page is shown", async ({ homePage }) => {
  await expect(homePage.heading()).toBeVisible();
});

test("login and register controls are present", async ({ homePage }) => {
  await expect(homePage.loginLink()).toBeVisible();
  await expect(homePage.registerLink()).toBeVisible();
});

test("browse posts button shown", async ({ homePage }) => {
  await expect(homePage.browsePostsLink()).toBeVisible();
});
