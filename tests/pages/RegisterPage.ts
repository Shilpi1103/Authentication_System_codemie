import type { Locator, Page } from '@playwright/test';

export interface RegistrationDetails {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export class RegisterPage {
  readonly heading: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly registerButton: Locator;
  readonly loginLink: Locator;
  readonly message: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Create Account' });
    this.nameInput = page.getByLabel('Name', { exact: true });
    this.emailInput = page.getByLabel('Email', { exact: true });
    this.passwordInput = page.getByLabel('Password', { exact: true });
    this.confirmPasswordInput = page.getByLabel('Confirm Password', { exact: true });
    this.registerButton = page.getByRole('button', { name: 'Register', exact: true });
    this.loginLink = page.getByRole('link', { name: 'Login', exact: true });
    this.message = page.locator('.message');
  }

  async goto() {
    await this.page.goto('/register');
  }

  async register(details: RegistrationDetails) {
    await this.nameInput.fill(details.name);
    await this.emailInput.fill(details.email);
    await this.passwordInput.fill(details.password);
    await this.confirmPasswordInput.fill(details.confirmPassword);
    await this.registerButton.click();
  }
}
