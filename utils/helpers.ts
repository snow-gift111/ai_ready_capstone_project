import { expect, Page } from '@playwright/test';

export async function waitForAtlassianRedirect(page: Page): Promise<void> {
  await page.waitForURL(/https:\/\/.*\.atlassian\.net\/.+/, { timeout: 60_000 });
}

export async function ensureEnv(name: string): Promise<string> {
  const v = process.env[name];
  expect(v, `Missing required env var ${name}`).toBeTruthy();
  return v as string;
}

export function uniqueSummary(prefix: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix} ${stamp}`;
}

export async function expectNotVisibleIfPresent(page: Page, text: string): Promise<void> {
  const loc = page.getByText(text, { exact: false });
  if (await loc.count()) {
    await expect(loc.first()).toBeHidden();
  }
}
