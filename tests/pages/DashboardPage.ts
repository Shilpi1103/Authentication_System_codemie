import type { Locator, Page } from '@playwright/test';

export class DashboardPage {
  readonly heading: Locator;
  readonly welcomeHeading: Locator;
  readonly logoutButton: Locator;
  readonly message: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Dashboard', exact: true });
    this.welcomeHeading = page.getByRole('heading', { name: /^Welcome, / });
    this.logoutButton = page.getByRole('button', { name: 'Logout', exact: true });
    this.message = page.locator('.message');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async logout() {
    await this.logoutButton.click();
  }
}
