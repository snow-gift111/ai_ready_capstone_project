import { expect, Page } from '@playwright/test';

export function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function getAppUrl(): string {
  return getEnvOrThrow('APP_URL');
}

export async function waitForAtlassianNetRedirect(page: Page): Promise<void> {
  await page.waitForURL(/https:\/\/.*\.atlassian\.net\/.*/, { timeout: 60_000 });
}

export async function expectSignedOut(page: Page): Promise<void> {
  // Jira frequently redirects to id.atlassian.com when signed out.
  await expect(page).toHaveURL(/id\.atlassian\.com\/login|login/);
}

export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function ensureOnJiraSite(page: Page): Promise<void> {
  // If we are still on id.atlassian.com after auth, go to APP_URL.
  if (/id\.atlassian\.com/.test(page.url())) {
    await page.goto(getAppUrl(), { waitUntil: 'domcontentloaded' });
  }
}
