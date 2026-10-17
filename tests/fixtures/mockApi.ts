import type { Page } from '@playwright/test';

type AuthEndpoint = 'login' | 'register' | 'profile' | 'otp/send' | 'otp/verify';

export async function mockAuthResponse(
  page: Page,
  endpoint: AuthEndpoint,
  body: object,
  status = 200,
) {
  await page.route(`**/auth/${endpoint}`, async (route) => {
    await route.fulfill({ status, json: body });
  });
}
