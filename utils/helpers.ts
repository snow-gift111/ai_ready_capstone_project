import { expect, Page } from '@playwright/test';

export async function expectRedirectedToAtlassianNet(page: Page) {
  await expect(page).toHaveURL(/https:\/\/.+\.atlassian\.net\/.+/);
}

export async function gotoJiraBase(page: Page) {
  const base = process.env.APP_URL;
  if (!base) throw new Error('APP_URL env var is required');
  await page.goto(base, { waitUntil: 'domcontentloaded' });
}

export function requireCredentials() {
  const email = process.env.APP_EMAIL;
  const password = process.env.APP_PASSWORD;
  if (!email) throw new Error('APP_EMAIL env var is required');
  if (!password) throw new Error('APP_PASSWORD env var is required');
  return { email, password };
}

export async function waitForAppReady(page: Page) {
  // Jira can be heavy; wait for network to settle after navigation.
  await page.waitForLoadState('domcontentloaded');
}
