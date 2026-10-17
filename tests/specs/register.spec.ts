import { test, expect } from '../fixtures/test';
import { mockAuthResponse } from '../fixtures/mockApi';
import { registrationDetails, testCredentials, testUser } from '../data/users';

test.describe('Registration', () => {
  test.beforeEach(async ({ registerPage }) => {
    await registerPage.goto();
  });

  test('validates required fields', async ({ registerPage }) => {
    await registerPage.registerButton.click();
    await expect(registerPage.message).toHaveText('Please fill in all required fields.');
  });

  test('rejects mismatched passwords', async ({ registerPage }) => {
    await registerPage.register({
      ...registrationDetails,
      confirmPassword: 'different-password',
    });
    await expect(registerPage.message).toHaveText('Passwords do not match.');
  });

  test('registers and redirects to login', async ({ page, registerPage, loginPage }) => {
    await mockAuthResponse(page, 'register', { message: 'User registered successfully' }, 201);
    const requestPromise = page.waitForRequest(
      (request) => request.url().endsWith('/auth/register') && request.method() === 'POST',
    );

    await registerPage.register(registrationDetails);

    expect((await requestPromise).postDataJSON()).toEqual({
      name: testUser.name,
      ...testCredentials,
    });
    await expect(registerPage.message).toHaveText(
      'Registration successful! Redirecting to login...',
    );
    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.heading).toBeVisible();
  });

  test('displays a duplicate user error', async ({ page, registerPage }) => {
    await mockAuthResponse(page, 'register', { message: 'User already exists' }, 400);
    await registerPage.register(registrationDetails);
    await expect(registerPage.message).toHaveText('User already exists');
    await expect(page).toHaveURL(/\/register$/);
  });
});
