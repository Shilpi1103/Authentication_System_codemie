import type { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly registerLink: Locator;
  readonly message: Locator;
  readonly otpLoginButton: Locator;
  readonly sendOtpButton: Locator;
  readonly otpInput: Locator;
  readonly verifyOtpButton: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Welcome Back' });
    this.emailInput = page.getByLabel('Email', { exact: true });
    this.passwordInput = page.getByLabel('Password', { exact: true });
    this.loginButton = page.getByRole('button', { name: 'Login', exact: true });
    this.registerLink = page.getByRole('link', { name: 'Register', exact: true });
    this.message = page.locator('.message');
    this.otpLoginButton = page.getByRole('button', { name: 'Login with OTP' });
    this.sendOtpButton = page.getByRole('button', { name: 'Send OTP', exact: true });
    this.otpInput = page.getByLabel('Enter OTP', { exact: true });
    this.verifyOtpButton = page.getByRole('button', { name: 'Verify OTP', exact: true });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async requestOtp(email: string) {
    await this.otpLoginButton.click();
    await this.emailInput.fill(email);
    await this.sendOtpButton.click();
  }

  async verifyOtp(otp: string) {
    await this.otpInput.fill(otp);
    await this.verifyOtpButton.click();
  }
}
