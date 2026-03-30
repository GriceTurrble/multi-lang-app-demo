import { test, expect } from "@playwright/test";

test("home page is shown", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome to MLAD Forum" })
  ).toBeVisible();
});

test("login and register controls are present", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Register" })).toBeVisible();
});

test("browse posts button shown", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Browse Posts" })).toBeVisible();
});
