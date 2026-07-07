import { expect, type Locator, type Page } from '@playwright/test';

import type { IssueTypeOption, PriorityOption } from '../data/testData';
import { pressEscape, retryWithBackoff, safeClick } from '../utils/helpers';

export class TaskPage {
  constructor(private readonly page: Page) {}

  // ---------- Common navigation ----------
  async gotoHome(): Promise<void> {
    // Uses baseURL from Playwright config
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    await this.page.waitForURL(/https:\/\/.*\.atlassian\.net\/.*/);
  }

  async openIssueByKey(issueKey: string): Promise<void> {
    await this.page.goto(`/browse/${issueKey}`, { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(new RegExp(`/browse/${issueKey}(/.*)?$`));
  }

  // ---------- Header / account ----------
  private accountMenuTrigger(): Locator {
    return this.page
      .getByRole('button', { name: /account|profile|user|avatar/i })
      .or(this.page.getByLabel(/account|profile|user|avatar/i));
  }

  async logout(): Promise<void> {
    // Jira header varies; we try multiple strategies.
    await retryWithBackoff(async () => {
      await safeClick(this.accountMenuTrigger());
    }, 3);

    const logoutOption = this.page.getByRole('menuitem', { name: /log out/i }).or(this.page.getByRole('button', { name: /log out/i })).or(this.page.getByRole('link', { name: /log out/i }));
    await safeClick(logoutOption);

    // After logout, user should be in logged-out state.
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page).toHaveURL(/(id\.atlassian\.com\/login|.*atlassian\.net\/login|.*atlassian\.net\/logout)/i);
  }

  // ---------- Create issue ----------
  private createButton(): Locator {
    return this.page.getByRole('button', { name: /^create$/i }).or(this.page.getByRole('button', { name: /create/i }));
  }

  private createDialog(): Locator {
    // Jira create issue can be a dialog with role=dialog.
    return this.page.getByRole('dialog').filter({ hasText: /create/i }).or(this.page.getByRole('dialog'));
  }

  private issueTypeField(): Locator {
    return this.page.getByLabel(/issue type/i).or(this.page.getByRole('combobox', { name: /issue type/i }));
  }

  private projectField(): Locator {
    return this.page.getByLabel(/project/i).or(this.page.getByRole('combobox', { name: /project/i }));
  }

  private summaryField(): Locator {
    return this.page.getByLabel(/summary/i).or(this.page.getByPlaceholder(/summary/i)).or(this.page.getByRole('textbox', { name: /summary/i }));
  }

  private descriptionField(): Locator {
    // Jira description may be a textarea, or an editor.
    return this.page.getByLabel(/description/i).or(this.page.getByRole('textbox', { name: /description/i })).or(this.page.getByPlaceholder(/description/i));
  }

  private createSubmitButton(): Locator {
    return this.createDialog().getByRole('button', { name: /^create$/i }).or(this.page.getByRole('button', { name: /^create$/i }));
  }

  private toastRegion(): Locator {
    // Jira toast notifications often render in a region/alert
    return this.page.getByRole('alert').or(this.page.getByRole('status')).or(this.page.locator('[data-testid="global-pages-notification"]'));
  }

  async openCreateIssue(): Promise<void> {
    await retryWithBackoff(async () => {
      await safeClick(this.createButton());
    }, 3);
    await expect(this.createDialog()).toBeVisible({ timeout: 20_000 });
  }

  async selectProject(projectName: string): Promise<void> {
    // In many Jira instances the project is preselected; only attempt selection if provided.
    await safeClick(this.projectField());
    const option = this.page.getByRole('option', { name: new RegExp(`^${escapeRegExp(projectName)}$`, 'i') }).or(this.page.getByText(new RegExp(`^${escapeRegExp(projectName)}$`, 'i')));
    await safeClick(option);
  }

  async openIssueTypePicker(): Promise<void> {
    await safeClick(this.issueTypeField());
  }

  async selectIssueType(issueType: IssueTypeOption): Promise<void> {
    await this.openIssueTypePicker();
    const opt = this.page.getByRole('option', { name: new RegExp(`^${issueType}$`, 'i') }).or(this.page.getByText(new RegExp(`^${issueType}$`, 'i')));
    await safeClick(opt);
    await pressEscape(this.page);
  }

  async fillSummary(summary: string): Promise<void> {
    await this.summaryField().fill(summary);
  }

  async fillDescription(description: string): Promise<void> {
    // Description sometimes needs click into editor first.
    await this.descriptionField().click({ timeout: 10_000 }).catch(() => undefined);
    await this.descriptionField().fill(description);
  }

  async submitCreate(): Promise<void> {
    const keyFromUrl = this.extractIssueKeyFromUrl();
  }

  async waitForCreatedIssueKey(): Promise<string> {
    // Prefer toast link with issue key.
    const toast = this.toastRegion();

    await toast.first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => undefined);

    // Try to find issue key pattern in page (toast content or redirect URL)
    const keyFromUrl = await this.extractIssueKeyFromUrl();
    if (keyFromUrl) return keyFromUrl;

    const toastText = await toast.first().innerText().catch(() => '');
    const keyFromToast = extractIssueKey(toastText);
    if (keyFromToast) return keyFromToast;

    // Fallback: look for a link containing /browse/
    const browseLink = toast.locator('a[href*="/browse/"]').first();
    if (await browseLink.isVisible().catch(() => false)) {
      const href = await browseLink.getAttribute('href');
      const match = href?.match(/\/browse\/(\w+-\d+)/);
      if (match?.[1]) return match[1];
    }

    throw new Error('Could not determine created issue key (toast/URL did not provide one).');
  }

  async expectIssueSummary(summary: string): Promise<void> {
    // Issue view summary typically is heading.
    const heading = this.page.getByRole('heading', { name: new RegExp(escapeRegExp(summary), 'i') }).first();
    await expect(heading).toBeVisible({ timeout: 30_000 });
  }

  async expectIssueDescription(description: string): Promise<void> {
    // Description is often visible in content area.
    await expect(this.page.getByText(description, { exact: false }).first()).toBeVisible({ timeout: 30_000 });
  }

  // ---------- Edit issue ----------
  private editButton(): Locator {
    return this.page.getByRole('button', { name: /^edit$/i }).or(this.page.getByRole('button', { name: /edit/i }));
  }

  private editDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: /edit/i }).or(this.page.getByRole('dialog'));
  }

  private priorityField(): Locator {
    return this.page.getByLabel(/priority/i).or(this.page.getByRole('combobox', { name: /priority/i }));
  }

  private updateButton(): Locator {
    return this.editDialog().getByRole('button', { name: /^update$/i }).or(this.page.getByRole('button', { name: /^update$/i }));
  }

  private cancelButton(): Locator {
    return this.editDialog().getByRole('button', { name: /^cancel$/i }).or(this.page.getByRole('button', { name: /^cancel$/i }));
  }

  async startEdit(): Promise<void> {
    await safeClick(this.editButton());
    await expect(this.editDialog()).toBeVisible({ timeout: 20_000 });
  }

  async setEditSummary(summary: string): Promise<void> {
    await this.editDialog().getByLabel(/summary/i).or(this.editDialog().getByPlaceholder(/summary/i)).fill(summary);
  }

  async setEditDescription(description: string): Promise<void> {
    const field = this.editDialog().getByLabel(/description/i).or(this.editDialog().getByRole('textbox', { name: /description/i }));
    await field.click().catch(() => undefined);
    await field.fill(description);
  }

  async setEditIssueType(issueType: IssueTypeOption): Promise<void> {
    const field = this.editDialog().getByLabel(/issue type/i).or(this.editDialog().getByRole('combobox', { name: /issue type/i }));
    await safeClick(field);
    await safeClick(this.page.getByRole('option', { name: new RegExp(`^${issueType}$`, 'i') }).or(this.page.getByText(new RegExp(`^${issueType}$`, 'i'))));
    await pressEscape(this.page);
  }

  async setEditPriority(priority: PriorityOption): Promise<void> {
    await safeClick(this.priorityField());
    await safeClick(this.page.getByRole('option', { name: new RegExp(`^${priority}$`, 'i') }).or(this.page.getByText(new RegExp(`^${priority}$`, 'i'))));
    await pressEscape(this.page);
  }

  async saveEdit(): Promise<void> {
    await safeClick(this.updateButton());
    await expect(this.editDialog()).toBeHidden({ timeout: 30_000 });
  }

  async cancelEdit(): Promise<void> {
    await safeClick(this.cancelButton());
    await expect(this.editDialog()).toBeHidden({ timeout: 30_000 });
  }

  // ---------- Delete issue ----------
  private moreActionsButton(): Locator {
    return this.page.getByRole('button', { name: /more|more actions/i }).or(this.page.getByRole('button', { name: /\.\.\./ }));
  }

  private deleteAction(): Locator {
    return this.page.getByRole('menuitem', { name: /delete/i }).or(this.page.getByRole('button', { name: /^delete$/i })).or(this.page.getByText(/^delete$/i));
  }

  private deleteDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: /delete/i }).or(this.page.getByRole('dialog'));
  }

  async initiateDelete(): Promise<void> {
    // Open menu and click Delete
    await safeClick(this.moreActionsButton());
    await safeClick(this.deleteAction());
    await expect(this.deleteDialog()).toBeVisible({ timeout: 20_000 });
  }

  async confirmDelete(): Promise<void> {

  private extractIssueKeyFromUrl(): string | null {
    const url = this.page.url();
    const match = url.match(/\/browse\/(\w+-\d+)/);
    return match?.[1] ?? null;
  }
    await safeClick(this.deleteDialog().getByRole('button', { name: /^delete$/i }).or(this.page.getByRole('button', { name: /^delete$/i })));
  }

  async cancelDelete(): Promise<void> {
    await safeClick(this.deleteDialog().getByRole('button', { name: /^cancel$/i }).or(this.page.getByRole('button', { name: /^cancel$/i })));
    await expect(this.deleteDialog()).toBeHidden({ timeout: 20_000 });
  }

  async expectIssueNotAccessible(issueKey: string): Promise<void> {
    await this.openIssueByKey(issueKey);
    await expect(
      this.page.getByText(/you can't view this issue|issue does not exist|we can't find the issue|does not have a value|not found/i)
    ).toBeVisible({ timeout: 30_000 });
  }

      await safeClick(doneButton);
    }

    await expect(this.page.getByText(/^done$/i).first()).toBeVisible({ timeout: 30_000 });
  }
}

function extractIssueKey(text: string): string | null {
  const match = text.match(/\b([A-Z][A-Z0-9_]+-\d+)\b/);
  return match?.[1] ?? null;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// augment class with private helper via function on prototype
declare module '../pages/TaskPage' {
  interface TaskPage {
    extractIssueKeyFromUrl(): Promise<string | null>;
  }
}

TaskPage.prototype.extractIssueKeyFromUrl = async function extractIssueKeyFromUrl(this: TaskPage): Promise<string | null> {
  const url = this.page.url();
  const match = url.match(/\/browse\/(\w+-\d+)/);
  return match?.[1] ?? null;
};
