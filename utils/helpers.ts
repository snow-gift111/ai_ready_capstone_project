import { expect, Page } from '@playwright/test';

export async function waitForAtlassianRedirectToProduct(page: Page): Promise<void> {
  await page.waitForURL(/https:\/\/.+\.atlassian\.net\/.+/, { timeout: 60_000 });
}

export async function ensureLoggedOut(page: Page): Promise<void> {
  // Best-effort logout state check. If already on id.atlassian.com login, we're logged out.
  if (/id\.atlassian\.com\/login/.test(page.url())) return;

  // If on *.atlassian.net, attempt to open profile menu and log out when available.
  // Jira UI varies by instance; this is resilient/best-effort.
  const avatar = page.getByRole('button', { name: /account|profile|avatar/i });
  if (await avatar.first().isVisible().catch(() => false)) {
    await avatar.first().click();
    const logout = page.getByRole('menuitem', { name: /log out|logout/i }).or(page.getByRole('button', { name: /log out|logout/i }));
    if (await logout.first().isVisible().catch(() => false)) {
      await logout.first().click();
      await page.waitForLoadState('networkidle');
    }
  }
}

export async function softExpectVisible(locator: ReturnType<Page['locator']>): Promise<void> {
  await expect(locator).toBeVisible();
}
