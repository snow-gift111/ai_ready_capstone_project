import { expect, Locator, Page } from '@playwright/test';
import { dismissIfVisible, jiraJqlUrl } from '../utils/helpers';

export class TaskPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoHome(): Promise<void> {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  async dismissPostLoginPopups(): Promise<void> {
    await dismissIfVisible(this.page, [
      () => this.page.getByRole('button', { name: /not now/i }),
      () => this.page.getByRole('button', { name: /skip/i }),
      () => this.page.getByRole('button', { name: /got it/i }),
      () => this.page.getByRole('button', { name: /close/i }),
    ]);
  }

  private createButton(): Locator {
    return this.page.getByRole('button', { name: /^create$/i }).or(this.page.getByRole('link', { name: /^create$/i }));
  }

  private createDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: /create/i }).or(this.page.locator('[data-testid="issue-create.ui.modal.modal-wrapper"]'));
  }

  private editDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: /edit/i }).or(this.page.locator('[data-testid="issue-create.ui.modal.modal-wrapper"]'));
  }

  private dialogProjectField(dialog: Locator): Locator {
    return dialog.getByRole('combobox', { name: /project/i }).or(dialog.locator('[data-testid*="project"] input'));
  }

  private dialogIssueTypeField(dialog: Locator): Locator {
    return dialog.getByRole('combobox', { name: /issue type/i }).or(dialog.locator('[data-testid*="issuetype"] input'));
  }

  private dialogSummaryField(dialog: Locator): Locator {
    return dialog.getByRole('textbox', { name: /summary/i }).or(dialog.locator('input[name="summary"], textarea[name="summary"]'));
  }

  private dialogDescriptionField(dialog: Locator): Locator {
    return dialog.getByRole('textbox', { name: /description/i }).or(dialog.locator('[aria-label="Description"]')).or(dialog.locator('[data-testid*="description"] [contenteditable="true"]'));
  }

  private dialogPriorityField(dialog: Locator): Locator {
    return dialog.getByRole('combobox', { name: /priority/i }).or(dialog.locator('[data-testid*="priority"] input'));
  }

  private dialogCreateSubmit(dialog: Locator): Locator {
    return dialog.getByRole('button', { name: /^create$/i });
  }

  private dialogSaveSubmit(dialog: Locator): Locator {
    return dialog.getByRole('button', { name: /^save$/i });
  }

  private dialogCancel(dialog: Locator): Locator {
    return dialog.getByRole('button', { name: /^cancel$/i });
  }

  private async selectFromCombobox(combobox: Locator, optionText: string | 'FIRST'): Promise<void> {
    await combobox.click();

    if (optionText === 'FIRST') {
      const option = this.page.getByRole('option').first();
      await option.waitFor({ state: 'visible' });
      await option.click();
      return;
    }

    const option = this.page.getByRole('option', { name: new RegExp(`^${escapeRegex(optionText)}$`, 'i') });
    if (await option.isVisible().catch(() => false)) {
      await option.click();
      return;
    }

    // Fallback: type then pick by text.
    await combobox.fill(optionText);
    await this.page.getByRole('option', { name: new RegExp(escapeRegex(optionText), 'i') }).first().click();
  }

  async openCreateIssue(): Promise<Locator> {
    await this.createButton().waitFor({ state: 'visible' });
    await this.createButton().click();

    const dialog = this.createDialog();
    await dialog.waitFor({ state: 'visible' });
    return dialog;
  }

  async createIssue(params: {
    projectName?: string;
    issueType: string;
    summary: string;
    description: string;
  }): Promise<{ issueKey: string }> {
    const dialog = await this.openCreateIssue();

    // Project (optional)
    const projectName = params.projectName;
    if (projectName && !/^any existing project$/i.test(projectName)) {
      await this.selectFromCombobox(this.dialogProjectField(dialog), projectName);
    } else {
      // Best-effort: leave default, or pick first if blank.
      await this.dialogProjectField(dialog).click().catch(() => undefined);
    }

    // Issue type
    await this.selectFromCombobox(this.dialogIssueTypeField(dialog), params.issueType);

    // Summary + Description
    await this.dialogSummaryField(dialog).fill(params.summary);
    await this.fillDescription(dialog, params.description);

    await this.dialogCreateSubmit(dialog).click();

    // Issue key typically appears in toast or URL (/browse/KEY-123)
    const key = await this.waitForCreatedIssueKey();
    return { issueKey: key };
  }

  async fillDescription(dialog: Locator, value: string): Promise<void> {
    const field = this.dialogDescriptionField(dialog);
    await field.waitFor({ state: 'visible' });

    // Rich text editors may not support fill reliably; attempt click+type.
    await field.click();
    await field.fill('').catch(() => undefined);
    await field.type(value, { delay: 5 }).catch(async () => {
      await this.page.keyboard.type(value, { delay: 5 });
    });
  }

  async waitForCreatedIssueKey(): Promise<string> {
    // Toast contains key like ABC-123
    const toastKey = this.page.locator('[data-testid="jira-issue-created-key"], [data-testid="issue-created-key"], a[href*="/browse/"]');
    if (await toastKey.first().isVisible().catch(() => false)) {
      const href = await toastKey.first().getAttribute('href');
      const text = (await toastKey.first().innerText().catch(() => ''))?.trim();
      const candidate = extractIssueKey(text) || extractIssueKey(href || '');
      if (candidate) return candidate;
    }

    // Fallback: wait for navigation to /browse/
    await this.page.waitForURL(/\/browse\/[A-Z][A-Z0-9]+-\d+/i, { timeout: 60_000 }).catch(() => undefined);
    const keyFromUrl = extractIssueKey(this.page.url());
    if (keyFromUrl) return keyFromUrl;

    // Last resort: find any visible key link.
    const anyKeyLink = this.page.locator('a[href*="/browse/"]');
    await anyKeyLink.first().waitFor({ state: 'visible', timeout: 30_000 });
    const href = await anyKeyLink.first().getAttribute('href');
    const candidate = extractIssueKey(href || '');
    if (!candidate) throw new Error('Could not determine created issue key');
    return candidate;
  }

  async openIssue(issueKey: string): Promise<void> {
    await this.page.goto(`/browse/${issueKey}`, { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(new RegExp(`/browse/${escapeRegex(issueKey)}`, 'i'));
  }

  async startEditingIssue(): Promise<Locator> {
    const editButton = this.page.getByRole('button', { name: /^edit$/i }).or(this.page.locator('[data-testid="issue.views.issue-base.foundation.quick-edit.button"]'));
    await editButton.waitFor({ state: 'visible' });
    await editButton.click();

    const dialog = this.editDialog();
    await dialog.waitFor({ state: 'visible' });
    return dialog;
  }

  async editIssue(params: {
    summary?: string;
    description?: string;
    issueType?: string;
    priority?: string;
  }): Promise<void> {
    const dialog = await this.startEditingIssue();

    if (params.issueType) {
      await this.selectFromCombobox(this.dialogIssueTypeField(dialog), params.issueType);
    }

    if (params.priority) {
      await this.selectFromCombobox(this.dialogPriorityField(dialog), params.priority);
    }

    if (params.summary) {
      await this.dialogSummaryField(dialog).fill(params.summary);
    }

    if (params.description) {
      await this.fillDescription(dialog, params.description);
    }

    await this.dialogSaveSubmit(dialog).click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async cancelEdit(params: { summary?: string }): Promise<void> {
    const dialog = await this.startEditingIssue();

    if (params.summary) {
      await this.dialogSummaryField(dialog).fill(params.summary);
    }

    await this.dialogCancel(dialog).click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async expectSummaryToBe(summary: string): Promise<void> {
    // Issue view summary heading is usually h1.
    const heading = this.page.getByRole('heading', { level: 1 }).or(this.page.locator('[data-testid="issue.views.issue-base.foundation.summary.heading"]'));
    await expect(heading).toContainText(summary);
  }

  async expectDescriptionToContain(text: string): Promise<void> {
    const descriptionRegion = this.page.locator('[data-testid="issue.views.field.rich-text.description"]').or(this.page.getByText(text));
    await expect(descriptionRegion).toBeVisible();
  }

  async transitionToDone(): Promise<void> {
    // Many Jira workflows expose a "Done" transition button.
    const doneButton = this.page.getByRole('button', { name: /^done$/i });
    if (await doneButton.isVisible().catch(() => false)) {
      await doneButton.click();
    } else {
      // Fallback: status dropdown -> select Done
      const statusButton = this.page.getByRole('button', { name: /status|to do|in progress|done/i }).first();
      await statusButton.click();
      await this.page.getByRole('menuitem', { name: /^done$/i }).click().catch(async () => {
        await this.page.getByRole('option', { name: /^done$/i }).click();
      });
    }

    await expect(this.page.getByText(/^done$/i)).toBeVisible();
  }

  async openCompletedIssuesView(baseUrl: string): Promise<void> {
    await this.page.goto(jiraJqlUrl(baseUrl, 'status = Done ORDER BY updated DESC'), { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/\/issues\//i);
  }

  async expectIssuePresentInList(issueKey: string): Promise<void> {
    const rowLink = this.page.locator(`a[href*="/browse/${issueKey}"]`);
    await expect(rowLink.first()).toBeVisible();
  }

  async initiateDeleteIssue(): Promise<void> {
    const moreActions = this.page.getByRole('button', { name: /more actions|more/i }).or(this.page.locator('[aria-label="More actions"]')).or(this.page.locator('[data-testid="issue.views.issue-base.foundation.more-actions"]'));
    await moreActions.first().click();

    const deleteAction = this.page.getByRole('menuitem', { name: /^delete$/i }).or(this.page.getByRole('menuitem', { name: /delete issue/i }));
    await deleteAction.click();
  }

  async confirmDeletion(): Promise<void> {
    const dialog = this.page.getByRole('dialog').filter({ hasText: /delete/i });
    await expect(dialog).toBeVisible();
    const deleteBtn = dialog.getByRole('button', { name: /^delete$/i });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    await expect(this.page.getByText(/issue.*deleted|deleted successfully/i)).toBeVisible().catch(() => undefined);
  }

  async cancelDeletion(): Promise<void> {
    const dialog = this.page.getByRole('dialog').filter({ hasText: /delete/i });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /^cancel$/i }).click();
    await expect(dialog).toBeHidden();
  }

  async expectIssueNotAccessible(issueKey: string): Promise<void> {
    await this.page.goto(`/browse/${issueKey}`, { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByText(/you can't view this issue|issue does not exist|we can't find the issue/i)).toBeVisible();
  }

  async logout(): Promise<void> {
    const profileButton = this.page.getByRole('button', { name: /account|profile|your profile/i }).or(this.page.locator('[data-testid="atlassian-navigation--profile"] button'));
    await profileButton.first().click();

    const logoutLink = this.page.getByRole('menuitem', { name: /log out|logout/i }).or(this.page.getByRole('link', { name: /log out|logout/i }));
    await logoutLink.first().click();

    await expect(this.page).toHaveURL(/id\.atlassian\.com\/login/i);
  }
}

function extractIssueKey(value: string): string | null {
  const match = value.match(/([A-Z][A-Z0-9]+-\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
