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
    await expect(loginPage.message).toHaveText('OTP must be exactly 4 digits.');
  });

  test('displays an unregistered email error', async ({ page, loginPage }) => {
    await mockAuthResponse(page, 'otp/send', { message: 'User not found' }, 404);
    await loginPage.requestOtp(testUser.email);
    await expect(loginPage.message).toHaveText('This email is not registered.');
    await expect(loginPage.sendOtpButton).toBeVisible();
  });
});
