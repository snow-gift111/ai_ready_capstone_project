import { expect, Page } from '@playwright/test';

export async function expectRedirectedToAtlassianNet(page: Page) {
  await expect(page, 'Expected redirect to *.atlassian.net after login').toHaveURL(/https:\/\/.*\.atlassian\.net\/.+/);
}

export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function uniqueSuffix(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}
