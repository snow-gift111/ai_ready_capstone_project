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
