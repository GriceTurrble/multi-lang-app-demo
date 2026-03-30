import { test, expect } from "fixtures/HomePage";

test("home page controls are shown", async ({ homePage }) => {
  await expect(homePage.heading()).toBeVisible();
  await expect(homePage.loginLink()).toBeVisible();
  await expect(homePage.registerLink()).toBeVisible();
  await expect(homePage.browsePostsLink()).toBeVisible();
});
