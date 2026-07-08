import { expect, Page } from '@playwright/test';

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function expectToBeOnLoginPage(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
}

export async function waitForToast(page: Page): Promise<void> {
  // OrangeHRM uses toast notifications for some actions.
  // Make it best-effort because some flows might not trigger a toast.
  const toast = page.locator('.oxd-toast');
  await toast.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
}
