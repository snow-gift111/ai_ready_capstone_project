import { expect, Page } from '@playwright/test';

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in CI secrets or locally before running tests.`
    );
  }
  return value;
}

export async function waitForAtlassianRedirect(page: Page): Promise<void> {
  // Atlassian redirects to a *.atlassian.net page after successful login.
  await page.waitForURL(/https:\/\/.*\.atlassian\.net\/.*/, {
    timeout: 60_000
  });
}

export async function assertLoggedOut(page: Page): Promise<void> {
  // Common logged-out signal is being at id.atlassian.com/login or seeing the login form.
  await expect(
    page.locator('body')
  ).toContainText(/Log in|Continue|Atlassian/i);
}

export function uniqueSummary(prefix: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix} ${stamp}`;
}