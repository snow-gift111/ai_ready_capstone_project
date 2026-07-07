// Reusable helpers

import { expect, type Locator, type Page } from '@playwright/test';

export async function waitForAtlassianRedirect(page: Page): Promise<void> {
  // Wait until redirected to *.atlassian.net (as required)
  await page.waitForURL(/https:\/\/.*\.atlassian\.net\/.*/, { timeout: 60_000 });
}

export async function safeClick(locator: Locator, options?: { timeout?: number }): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout: options?.timeout ?? 15_000 });
  await locator.click();
}

export async function fillIfVisible(locator: Locator, value: string): Promise<void> {
  if (await locator.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await locator.fill(value);
  }
}

export async function pressEscape(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
}

export async function expectLozengeText(container: Locator, text: string | RegExp): Promise<void> {
  // Jira status lozenges commonly rendered as text within a span.
  await expect(container).toContainText(text);
}

export async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

export async function ensureEnv(name: string): Promise<string> {
  const val = process.env[name];
  expect(val, `Missing required environment variable: ${name}`).toBeTruthy();
  return val as string;
}
