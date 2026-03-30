import { test as base, type Page } from "@playwright/test";

class HomePage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto("/");
  }

  heading() {
    return this.page.getByRole("heading", { name: "Welcome to MLAD Forum" });
  }

  loginLink() {
    return this.page.getByRole("link", { name: "Login" });
  }

  registerLink() {
    return this.page.getByRole("link", { name: "Register" });
  }

  browsePostsLink() {
    return this.page.getByRole("link", { name: "Browse Posts" });
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
