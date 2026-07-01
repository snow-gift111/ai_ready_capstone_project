import { expect, Page } from '@playwright/test';
import { getAppUrl } from '../utils/helpers';

export class TaskPage {
  public lastCreatedIssueKey: string | null = null;

  constructor(private readonly page: Page) {}

  async gotoHome(): Promise<void> {
    await this.page.goto(getAppUrl(), { waitUntil: 'domcontentloaded' });
  }

  private createButton() {
    return this.page.getByRole('button', { name: /^create$/i });
  }

  private createDialog() {
    // Jira create issue is typically a dialog.
    return this.page.getByRole('dialog').filter({ hasText: /create/i });
  }

  private async selectFromCombobox(labelRegex: RegExp, optionText: string): Promise<void> {
    const combo = this.page.getByRole('combobox', { name: labelRegex }).first();
    await expect(combo).toBeVisible({ timeout: 30_000 });
    await combo.click();

    // Some Atlassian comboboxes allow direct typing.
    try {
      await combo.fill(optionText);
    } catch {
      const input = this.page.locator('input[role="combobox"]').first();
      await input.fill(optionText);
    }

    const option = this.page.getByRole('option', { name: new RegExp(`^${escapeRegExp(optionText)}$`, 'i') }).first();
    await option.click({ timeout: 30_000 });
  }

  private summaryInput() {
    return this.page.getByRole('textbox', { name: /^summary$/i }).first();
  }

  private descriptionTextbox() {
    // Jira Cloud uses a rich text editor with role="textbox".
    return this.page
      .locator('[role="textbox"][aria-label*="Description"], [role="textbox"][aria-label*="description"]')
      .first();
  }

  private async openIssueFromCreatedToast(): Promise<string> {
    const alert = this.page.getByRole('alert').first();
    await expect(alert).toBeVisible({ timeout: 30_000 });

    // Toast typically includes an issue key link.
    const link = alert.locator('a[href*="/browse/"]').first();
    await expect(link).toBeVisible({ timeout: 30_000 });
    const key = (await link.innerText()).trim();
    this.lastCreatedIssueKey = key;
    await link.click();
    return key;
  }

  // ---------- Create Issue ----------
  async openCreateIssue(): Promise<void> {
    await this.createButton().click();
    await expect(this.createDialog()).toBeVisible({ timeout: 30_000 });
  }

  async fillCreateIssueForm(params: {
    project?: string;
    issueType?: string;
    summary?: string;
    description?: string;
  }): Promise<void> {
    if (params.project) {
      await this.selectFromCombobox(/project/i, params.project);
    }
    if (params.issueType) {
      await this.selectFromCombobox(/issue type|type/i, params.issueType);
    }
    if (params.summary !== undefined) {
      await expect(this.summaryInput()).toBeVisible({ timeout: 30_000 });
      await this.summaryInput().fill(params.summary);
    }
    if (params.description !== undefined) {
      const desc = this.descriptionTextbox();
      await expect(desc).toBeVisible({ timeout: 30_000 });
      await desc.click();
      await desc.fill(params.description);
    }
  }

  async submitCreate(): Promise<void> {
    const create = this.page.getByRole('button', { name: /^create$/i }).last();
    await expect(create).toBeEnabled();
    await create.click();
  }

  async expectIssueCreated(): Promise<void> {
    const key = await this.openIssueFromCreatedToast();
    await expect(this.page).toHaveURL(new RegExp(`/browse/${escapeRegExp(key)}`));
  }

  // ---------- Open Issue ----------
  async openIssueByKey(issueKey: string): Promise<void> {
    const url = new URL(`/browse/${issueKey}`, getAppUrl()).toString();
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByText(issueKey)).toBeVisible();
  }

  async getIssueSummaryText(): Promise<string> {
    const summaryHeading = this.page.getByRole('heading').first();
    await expect(summaryHeading).toBeVisible({ timeout: 30_000 });
    return (await summaryHeading.innerText()).trim();
  }

  // ---------- Edit Issue ----------
  async openEditIssue(): Promise<void> {
    const editBtn = this.page.getByRole('button', { name: /^edit$/i }).first();
    await expect(editBtn).toBeVisible({ timeout: 30_000 });
    await editBtn.click();

    const dialog = this.page.getByRole('dialog').filter({ hasText: /edit/i }).first();
    await expect(dialog).toBeVisible({ timeout: 30_000 });
  }

  async updateIssueFields(params: {
    summary?: string;
    description?: string;
    issueType?: string;
    priority?: string;
  }): Promise<void> {
    if (params.issueType) {
      await this.selectFromCombobox(/issue type|type/i, params.issueType);
    }
    if (params.priority) {
      await this.selectFromCombobox(/priority/i, params.priority);
    }
    if (params.summary !== undefined) {
      const summary = this.page.getByRole('textbox', { name: /^summary$/i }).first();
      await expect(summary).toBeVisible({ timeout: 30_000 });
      await summary.fill(params.summary);
    }
    if (params.description !== undefined) {
      const desc = this.descriptionTextbox();
      await expect(desc).toBeVisible({ timeout: 30_000 });
      await desc.click();
      await desc.fill(params.description);
    }
  }

  async saveEdit(): Promise<void> {
    const update = this.page.getByRole('button', { name: /^update$/i }).first();
    await expect(update).toBeEnabled();
    await update.click();
    await expect(this.page.getByRole('dialog')).toHaveCount(0, { timeout: 30_000 });
  }

  async cancelEdit(): Promise<void> {
    const cancel = this.page.getByRole('button', { name: /^cancel$/i }).first();
    await expect(cancel).toBeVisible({ timeout: 30_000 });
    await cancel.click();
    await expect(this.page.getByRole('dialog')).toHaveCount(0, { timeout: 30_000 });
  }

  // ---------- Delete Issue ----------
  async initiateDelete(): Promise<void> {
    const more = this.page.getByRole('button', { name: /more/i }).first();
    if (await more.isVisible().catch(() => false)) {
      await more.click();
    } else {
      const moreIcon = this.page.locator('[aria-label="More actions"], [aria-label*="more"]').first();
      await moreIcon.click();
    }

    const del = this.page.getByRole('menuitem', { name: /^delete$/i }).first();
    await expect(del).toBeVisible({ timeout: 30_000 });
    await del.click();

    const dialog = this.page.getByRole('dialog').filter({ hasText: /delete/i }).first();
    await expect(dialog).toBeVisible({ timeout: 30_000 });
  }

  async confirmDelete(): Promise<void> {
    const confirm = this.page.getByRole('button', { name: /^delete$/i }).first();
    await expect(confirm).toBeEnabled();
    await confirm.click();
  }

  async cancelDelete(): Promise<void> {
    const cancel = this.page.getByRole('button', { name: /^cancel$/i }).first();
    await expect(cancel).toBeVisible({ timeout: 30_000 });
    await cancel.click();
    await expect(this.page.getByRole('dialog')).toHaveCount(0, { timeout: 30_000 });
  }

  async expectIssueDeleted(issueKey: string): Promise<void> {
    // Common Jira toast
    const deletedToast = this.page.getByText(/issue deleted|deleted/i).first();
    await expect(deletedToast).toBeVisible({ timeout: 30_000 });

    await this.openIssueByKey(issueKey);
    const notFound = this.page.getByText(/you can't view this issue|does not exist|was not found|issue does not exist/i);
    await expect(notFound).toBeVisible({ timeout: 30_000 });
  }

  // ---------- Transition / Done ----------
  async transitionToDone(): Promise<void> {
    // Many Jira workflows expose a direct "Done" transition button.
    const doneBtn = this.page.getByRole('button', { name: /^done$/i }).first();
    if (await doneBtn.isVisible().catch(() => false)) {
      await doneBtn.click();
      return;
    }

    // Fallback: open status dropdown and select Done
    const statusField = this.page
      .locator('[data-testid*="status"], [aria-label*="status" i]')
      .filter({ has: this.page.getByRole('button') })
      .first();
    await statusField.click();

    const option = this.page.getByRole('option', { name: /^done$/i }).first();
    await expect(option).toBeVisible({ timeout: 30_000 });
    await option.click();
  }

  async expectStatusDone(): Promise<void> {
    const done = this.page.getByText(/^done$/i).first();
    await expect(done).toBeVisible({ timeout: 30_000 });
  }

  // ---------- Search / Filter ----------
  async openIssuesWithJql(jql: string): Promise<void> {
    const url = new URL(`/issues/?jql=${encodeURIComponent(jql)}`, getAppUrl()).toString();
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async expectOnlyDoneIssuesVisible(): Promise<void> {
    // Wait for results to load
    const resultsRegion = this.page.locator('[data-testid*="issue-table"], [data-testid*="issues"]');
    await expect(resultsRegion.first()).toBeVisible({ timeout: 60_000 });

    // Status lozenges in list
    const statusLozenges = this.page.locator('[data-testid*="status"], span:has-text("Done")');
    await expect(statusLozenges.first()).toBeVisible({ timeout: 60_000 });

    const count = await statusLozenges.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 20); i++) {
      const t = (await statusLozenges.nth(i).innerText()).trim();
      expect(t.toLowerCase()).toContain('done');
    }
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}
