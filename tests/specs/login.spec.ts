import { test, expect } from '../fixtures/test';
import { mockAuthResponse } from '../fixtures/mockApi';
import { testCredentials, testSession, testUser } from '../data/users';

test.describe('Password login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('validates required fields', async ({ loginPage }) => {
    await loginPage.loginButton.click();
    await expect(loginPage.message).toHaveText('Please fill in all required fields.');
  });

  test('logs in and displays the profile', async ({ page, loginPage, dashboardPage }) => {
    await mockAuthResponse(page, 'login', testSession);
    await mockAuthResponse(page, 'profile', testUser);
    const requestPromise = page.waitForRequest(
      (request) => request.url().endsWith('/auth/login') && request.method() === 'POST',
    );

    await loginPage.login(testCredentials.email, testCredentials.password);

    expect((await requestPromise).postDataJSON()).toEqual(testCredentials);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(dashboardPage.welcomeHeading).toHaveText(`Welcome, ${testUser.name}!`);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('token')))
      .toBe(testSession.token);
  });

  test('displays an API error without logging in', async ({ page, loginPage }) => {
    await mockAuthResponse(page, 'login', { message: 'Invalid credentials' }, 401);
    await loginPage.login(testCredentials.email, 'incorrect-password');

    await expect(loginPage.message).toHaveText('Invalid credentials');
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  });

  test('opens registration', async ({ page, loginPage, registerPage }) => {
    await loginPage.registerLink.click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(registerPage.heading).toBeVisible();
  });
});
