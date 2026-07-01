import { expect, Page } from '@playwright/test';

export async function waitForAtlassianRedirect(page: Page): Promise<void> {
  await page.waitForURL(/.*\.atlassian\.net\/.*/, { timeout: 60_000 });
}

export async function gotoJiraBase(page: Page): Promise<void> {
  const baseUrl = process.env.APP_BASE_URL;
  if (!baseUrl) throw new Error('APP_BASE_URL env var is required');
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
}

export async function ensureLoggedOut(page: Page): Promise<void> {
  // Best-effort: if already logged in, logout using common Jira header user menu.
  // Jira UI may vary; this helper is intentionally tolerant.
  const avatarButton = page.getByRole('button', { name: /account|profile|avatar/i });
  if (await avatarButton.isVisible().catch(() => false)) {
    await avatarButton.click();
    const logout = page.getByRole('menuitem', { name: /log out/i }).or(page.getByRole('button', { name: /log out/i }));
    if (await logout.isVisible().catch(() => false)) {
      await logout.click();
    }
  }
}

export async function expectNotAuthenticated(page: Page): Promise<void> {
  // If not authenticated, we should remain on id.atlassian.com or see login prompt.
  await expect(page).toHaveURL(/id\.atlassian\.com\/login|login/i);
}

export async function openCreateIssueDialog(page: Page): Promise<void> {
  // Jira global create button is typically labelled "Create".
  const createButton = page.getByRole('button', { name: /^create$/i }).first();
  await expect(createButton).toBeVisible({ timeout: 30_000 });
  await createButton.click();

  // Wait for dialog heading.
  await expect(page.getByRole('heading', { name: /create/i })).toBeVisible({ timeout: 30_000 });
}

export async function openSomeIssueFromSearchOrList(page: Page): Promise<void> {
  // Best-effort navigation: go to "Issues" or "Filters" and open first issue link.
  // This avoids hardcoding a project key/issue key.
  const issuesNav = page.getByRole('link', { name: /^issues$/i }).first();
  if (await issuesNav.isVisible().catch(() => false)) {
    await issuesNav.click();
  }

  // Try to open Search for issues view.
  const searchLink = page.getByRole('link', { name: /search for issues|search issues|search/i }).first();
  if (await searchLink.isVisible().catch(() => false)) {
    await searchLink.click();
  }

  // Click first issue in list (issue key links usually have pattern ABC-123).
  const firstIssueLink = page.getByRole('link', { name: /[A-Z][A-Z0-9]+-\d+/ }).first();
  await expect(firstIssueLink).toBeVisible({ timeout: 60_000 });
  await firstIssueLink.click();

  // Issue view loaded (look for issue key in breadcrumb/title).
  await expect(page.getByRole('link', { name: /[A-Z][A-Z0-9]+-\d+/ }).first()).toBeVisible({ timeout: 60_000 });
}
