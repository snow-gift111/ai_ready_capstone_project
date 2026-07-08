import { Page, expect } from '@playwright/test';

export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function uniqueSuffix(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
}

export async function waitForJiraApp(page: Page): Promise<void> {
  // Jira loads SPA content; wait for a stable authenticated shell.
  await page.waitForLoadState('domcontentloaded');
  // Prefer a url-based check because the authenticated landing page varies.
  await expect(page).not.toHaveURL(/id\.atlassian\.com\/login/);
}
