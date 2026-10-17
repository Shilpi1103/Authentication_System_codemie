import { test, expect } from '../fixtures/test';
import { mockAuthResponse } from '../fixtures/mockApi';
import { testSession, testUser } from '../data/users';

test.describe('Dashboard', () => {
  test('redirects unauthenticated visitors to login', async ({ page, dashboardPage, loginPage }) => {
    await dashboardPage.goto();
    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.heading).toBeVisible();
  });

  test('logs out and clears the stored session', async ({ page, dashboardPage, loginPage }) => {
    await page.addInitScript((session) => {
      localStorage.setItem('token', session.token);
      localStorage.setItem('user', JSON.stringify(session.user));
    }, testSession);
    await mockAuthResponse(page, 'profile', testUser);
    await dashboardPage.goto();
    await expect(dashboardPage.welcomeHeading).toHaveText(`Welcome, ${testUser.name}!`);

    await dashboardPage.logout();

    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.heading).toBeVisible();
    expect(await page.evaluate(() => ({
      token: localStorage.getItem('token'),
      user: localStorage.getItem('user'),
    }))).toEqual({ token: null, user: null });

    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.heading).toBeVisible();
  });
});
