import { expect, type Locator, type Page } from '@playwright/test';

export async function waitForAtlassianRedirect(page: Page): Promise<void> {
  // Atlassian login redirects to <your-site>.atlassian.net after successful auth.
  await page.waitForURL(/https:\/\/.*\.atlassian\.net\/.*/, { timeout: 60_000 });
}

export async function expectVisible(locator: Locator, message?: string): Promise<void> {
  await expect(locator, message).toBeVisible();
}

export async function fillIfVisible(locator: Locator, value: string): Promise<void> {
  if (await locator.isVisible().catch(() => false)) {
    await locator.fill(value);
  }
}

export async function clickIfVisible(locator: Locator): Promise<void> {
  if (await locator.isVisible().catch(() => false)) {
    await locator.click();
  }
}

export async function ensureEnv(name: string, value: string): Promise<void> {
  expect(value, `Missing required env var: ${name}`).toBeTruthy();
}
