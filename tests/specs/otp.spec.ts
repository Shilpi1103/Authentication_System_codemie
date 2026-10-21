import { test, expect } from '../fixtures/test';
import { mockAuthResponse } from '../fixtures/mockApi';
import { testOtp, testSession, testUser } from '../data/users';

test.describe('OTP login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('requests and verifies an OTP', async ({ page, loginPage, dashboardPage }) => {
    await mockAuthResponse(page, 'otp/send', { message: 'OTP sent successfully' });
    await mockAuthResponse(page, 'otp/verify', testSession);
    await mockAuthResponse(page, 'profile', testUser);
    const sendRequest = page.waitForRequest(
      (request) => request.url().endsWith('/auth/otp/send') && request.method() === 'POST',
    );

    await loginPage.requestOtp(testUser.email);
    expect((await sendRequest).postDataJSON()).toEqual({ email: testUser.email });
    await expect(loginPage.otpInput).toBeVisible();

    const verifyRequest = page.waitForRequest(
      (request) => request.url().endsWith('/auth/otp/verify') && request.method() === 'POST',
    );
    await loginPage.verifyOtp(testOtp);

    expect((await verifyRequest).postDataJSON()).toEqual({
      email: testUser.email,
      otp: testOtp,
    });
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(dashboardPage.welcomeHeading).toHaveText(`Welcome, ${testUser.name}!`);
  });

  test('rejects an OTP that is not four digits', async ({ page, loginPage }) => {
    await mockAuthResponse(page, 'otp/send', { message: 'OTP sent successfully' });
    await loginPage.requestOtp(testUser.email);
    await loginPage.verifyOtp('12');
    await expect(loginPage.otpInlineError).toHaveText('OTP must be exactly 4 digits.');
  });

  test('displays an unregistered email error', async ({ page, loginPage }) => {
    await mockAuthResponse(page, 'otp/send', { message: 'User not found' }, 404);
    await loginPage.requestOtp(testUser.email);
    await expect(loginPage.message).toHaveText('This email is not registered.');
    await expect(loginPage.sendOtpButton).toBeVisible();
  });

  test('shows an inline error and focuses the email field when Send OTP is clicked with no email (KAN-142)', async ({
    page,
    loginPage,
  }) => {
    await loginPage.otpLoginButton.click();
    await loginPage.sendOtpButton.click();

    await expect(loginPage.emailInlineError).toHaveText('Email is required.');
    await expect(loginPage.emailInput).toHaveAttribute('aria-invalid', 'true');
    await expect(loginPage.emailInput).toBeFocused();
  });

  test('focuses the OTP input automatically when the verify step is reached (KAN-142)', async ({ page, loginPage }) => {
    await mockAuthResponse(page, 'otp/send', { message: 'OTP sent successfully' });
    await loginPage.requestOtp(testUser.email);

    await expect(loginPage.otpInput).toBeFocused();
  });

  test('Resend OTP button is disabled while the countdown is running (KAN-142)', async ({ page, loginPage }) => {
    await mockAuthResponse(page, 'otp/send', { message: 'OTP sent successfully' });
    await loginPage.requestOtp(testUser.email);

    await expect(loginPage.resendOtpButton).toBeDisabled();
  });

  test('Resend OTP button is enabled once the countdown finishes and resends the OTP (KAN-142)', async ({
    page,
    loginPage,
  }) => {
    await mockAuthResponse(page, 'otp/send', { message: 'OTP sent successfully' });
    // Fake the browser clock so the 60s countdown completes instantly instead of
    // the test waiting in real time.
    await page.clock.install();
    await loginPage.requestOtp(testUser.email);

    await expect(loginPage.resendOtpButton).toBeDisabled();
    await page.clock.runFor('01:00');
    await expect(loginPage.resendOtpButton).toBeEnabled();

    const resendRequest = page.waitForRequest(
      (request) => request.url().endsWith('/auth/otp/send') && request.method() === 'POST',
    );
    await loginPage.resendOtp();
    await resendRequest;

    await expect(page.getByText('Time remaining: 60s')).toBeVisible();
    await expect(loginPage.resendOtpButton).toBeDisabled();
  });

  test('countdown is announced to screen readers via aria-live="polite" (KAN-142)', async ({ page, loginPage }) => {
    await mockAuthResponse(page, 'otp/send', { message: 'OTP sent successfully' });
    await loginPage.requestOtp(testUser.email);

    await expect(loginPage.countdown).toBeVisible();
    await expect(loginPage.countdown).toContainText('Time remaining');
    await expect(loginPage.countdown).toHaveAttribute('aria-atomic', 'true');
  });
});
