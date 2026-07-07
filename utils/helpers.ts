import { expect, Page, TestInfo } from '@playwright/test';

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export async function expectRedirectedToAtlassianNet(page: Page): Promise<void> {
  await page.waitForURL(/https:\/\/.*\.atlassian\.net\//, { timeout: 60_000 });
  await expect(page).toHaveURL(/\.atlassian\.net\//);
}

export function uniqueText(prefix: string): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  return `${prefix} ${stamp}`;
}

export async function attachScreenshotOnFailure(page: Page, testInfo: TestInfo): Promise<void> {
  if (testInfo.status !== testInfo.expectedStatus) {
    const buf = await page.screenshot({ fullPage: true });
    await testInfo.attach('failure-screenshot', { body: buf, contentType: 'image/png' });
  }
}
