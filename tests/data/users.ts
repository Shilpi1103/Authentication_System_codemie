export const testUser = {
  id: 'playwright-user-001',
  name: 'Playwright User',
  email: 'playwright@example.test',
};

export const testCredentials = {
  email: testUser.email,
  password: 'Test-only-password-123!',
};

export const registrationDetails = {
  ...testCredentials,
  name: testUser.name,
  confirmPassword: testCredentials.password,
};

// Synthetic values used only by browser-intercepted API responses.
export const testSession = {
  token: 'playwright-mock-token',
  user: testUser,
};

export const testOtp = '1234';
