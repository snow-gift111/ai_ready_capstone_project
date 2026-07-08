import { expect, Page } from '@playwright/test';

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function dismissIfVisible(page: Page, locatorCandidates: Array<() => ReturnType<Page['locator']>>): Promise<void> {
  for (const candidate of locatorCandidates) {
    const loc = candidate();
    if (await loc.first().isVisible().catch(() => false)) {
      await loc.first().click().catch(() => undefined);
    }
  }
}

export async function expectUrlToContain(page: Page, fragment: string | RegExp): Promise<void> {
  if (fragment instanceof RegExp) {
    await expect(page).toHaveURL(fragment);
  } else {
    await expect(page).toHaveURL(new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
}

export function jiraJqlUrl(baseUrl: string, jql: string): string {
  const encoded = encodeURIComponent(jql);
  return `${baseUrl.replace(/\/$/, '')}/issues/?jql=${encoded}`;
}
