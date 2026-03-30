import { test, expect } from "fixtures/HomePage";

test("home page controls are shown", async ({ homePage }) => {
  await expect(homePage.heading()).toBeVisible();
  await expect(homePage.loginButton()).toBeVisible();
  await expect(homePage.registerButton()).toBeVisible();
  await expect(homePage.browsePostsButton()).toBeVisible();
});
