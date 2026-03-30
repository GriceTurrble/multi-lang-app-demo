import { test as base, type Page } from "@playwright/test";

class HomePage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto("/");
  }

  heading() {
    return this.page.getByRole("heading", { name: "Welcome to MLAD Forum" });
  }

  loginButton() {
    return this.page.getByRole("button", { name: "Login" });
  }

  registerButton() {
    return this.page.getByRole("button", { name: "Register" });
  }

  browsePostsButton() {
    return this.page.getByRole("button", { name: "Browse Posts" });
  }
}

export const test = base.extend<{ homePage: HomePage }>({
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await use(homePage);
  },
});

export { expect } from "@playwright/test";
