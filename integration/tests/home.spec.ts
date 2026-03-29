import { test, expect } from "@playwright/test";

test("home page is shown", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome to MLAD Forum" }),
  ).toBeVisible();
});
