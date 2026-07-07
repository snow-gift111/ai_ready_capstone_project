import { expect, Locator, Page } from '@playwright/test';
import { requireEnv, uniqueText } from '../utils/helpers';

export class TaskPage {
  readonly page: Page;

  // Top navigation
  readonly createButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createButton = page.getByRole('button', { name: /^create$/i }).or(page.getByRole('link', { name: /^create$/i }));
  }

  async gotoBase(): Promise<void> {
    const baseUrl = requireEnv('APP_URL');
    await this.page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(new RegExp(baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  async openCreateIssueDialog(): Promise<void> {
    await this.createButton.waitFor({ state: 'visible', timeout: 60_000 });
    await this.createButton.click();

    // Dialog title differs. Ensure we see the Create form.
    await expect(
      this.page.getByRole('dialog').getByText(/create/i)
        .or(this.page.getByRole('heading', { name: /create/i }))
    ).toBeVisible({ timeout: 30_000 });
  }

  private createDialog(): Locator {
    return this.page.getByRole('dialog');
  }

  async selectProject(projectName: string): Promise<void> {
    const dialog = this.createDialog();
    const projectField = dialog.getByLabel(/project/i).or(dialog.getByPlaceholder(/project/i));
    await projectField.click();

    // Try listbox option first, fallback to typing + enter.
    const option = this.page.getByRole('option', { name: new RegExp(projectName, 'i') });
    if (await option.count()) {
      await option.first().click();
    } else {
      await projectField.fill(projectName);
      await this.page.keyboard.press('Enter');
    }

    // Best-effort assertion that project selection took effect
    await expect(projectField).toHaveValue(/.+/);
  }

  async openIssueTypeSelector(): Promise<void> {
    const dialog = this.createDialog();
    const issueTypeField = dialog.getByLabel(/issue type/i).or(dialog.getByPlaceholder(/issue type/i));
    await issueTypeField.click();
  }

  async expectIssueTypeOptionsInclude(options: string[]): Promise<void> {
    for (const opt of options) {
      await expect(this.page.getByRole('option', { name: new RegExp(`^${opt}$`, 'i') })).toBeVisible();
    }
  }

  async selectIssueType(issueType: string): Promise<void> {
    const dialog = this.createDialog();
    const issueTypeField = dialog.getByLabel(/issue type/i).or(dialog.getByPlaceholder(/issue type/i));
    await issueTypeField.click();

    const option = this.page.getByRole('option', { name: new RegExp(`^${issueType}$`, 'i') });
    await option.click();

    // Often issue type field is a combobox input; value assertion can be flaky. Use text presence in the field container.
    await expect(dialog.getByText(new RegExp(issueType, 'i'))).toBeVisible();
  }

  async fillSummary(summary: string): Promise<void> {
    const dialog = this.createDialog();
    const summaryField = dialog.getByLabel(/summary/i).or(dialog.getByPlaceholder(/summary/i));
    await summaryField.fill(summary);
    await expect(summaryField).toHaveValue(summary);
  }

  async fillDescription(description: string): Promise<void> {
    const dialog = this.createDialog();

    // Jira's description is often a rich text editor.
    const descriptionField = dialog.getByLabel(/description/i).or(dialog.getByPlaceholder(/description/i));
    if (await descriptionField.count()) {
      await descriptionField.fill(description);
    } else {
      const editor = dialog.locator('[data-testid="editor-container"] [contenteditable="true"]');
      await editor.click();
      await editor.fill(description);
    }

    await expect(dialog).toContainText(description);
  }

  async submitCreate(): Promise<void> {
    const dialog = this.createDialog();
    const create = dialog.getByRole('button', { name: /^create$/i }).or(dialog.getByRole('button', { name: /create issue/i }));
    await create.click();

    // After submission, wait for either success toast or navigation.
    await Promise.race([
      this.page.waitForURL(/\/browse\//, { timeout: 60_000 }).catch(() => undefined),
      this.page.getByText(/created/i).waitFor({ timeout: 60_000 }).catch(() => undefined),
    ]);
  }

  async expectSummaryVisible(summary: string): Promise<void> {
    await expect(this.page.getByRole('heading', { name: new RegExp(summary, 'i') }).first().or(this.page.getByText(summary))).toBeVisible();
  }

  async createIssueViaUi(params: { projectName: string; issueType: string; summary?: string; description?: string }): Promise<{ summary: string }>{
    const summary = params.summary ?? uniqueText('Automation - Issue');

    await this.openCreateIssueDialog();
    await this.selectProject(params.projectName);
    await this.selectIssueType(params.issueType);
    await this.fillSummary(summary);
    if (params.description) await this.fillDescription(params.description);
    await this.submitCreate();

    return { summary };
  }

  async openFirstSearchResultIssue(): Promise<void> {
    // Navigate to issue search list and open the first result.
    const baseUrl = requireEnv('APP_URL');
    await this.page.goto(`${baseUrl}/issues/`, { waitUntil: 'domcontentloaded' });

    const firstIssueLink = this.page.getByRole('link', { name: /[A-Z][A-Z0-9]+-\d+/ }).first();
    await firstIssueLink.waitFor({ state: 'visible', timeout: 60_000 });
    await firstIssueLink.click();

    await expect(this.page).toHaveURL(/\/browse\/[A-Z][A-Z0-9]+-\d+/);
  }

  async startInlineEdit(fieldName: 'Summary' | 'Description'): Promise<void> {
    // Inline edit: click field container, then click Edit (pencil) if present.
    const field = this.page.getByRole('group', { name: new RegExp(fieldName, 'i') }).or(this.page.getByText(new RegExp(`^${fieldName}$`, 'i')));
    await field.first().click({ force: true });
  }

  async updateSummaryAndSave(newSummary: string): Promise<void> {
    // Jira issue view summary can be an input with label "Summary" or a heading editable.
    const summaryInput = this.page.getByLabel(/summary/i).or(this.page.getByRole('textbox', { name: /summary/i }));
    await summaryInput.waitFor({ state: 'visible', timeout: 30_000 });
    await summaryInput.fill(newSummary);
    await this.page.keyboard.press('Enter');
    await expect(this.page.getByText(newSummary)).toBeVisible({ timeout: 30_000 });
  }

  async updateDescriptionAndSave(newDescription: string): Promise<void> {
    const desc = this.page.getByLabel(/description/i).or(this.page.getByRole('textbox', { name: /description/i }));
    if (await desc.count()) {
      await desc.first().click();
      await desc.first().fill(newDescription);
      await this.page.keyboard.press('Meta+Enter').catch(() => undefined);
      await this.page.keyboard.press('Control+Enter').catch(() => undefined);
    } else {
      const editor = this.page.locator('[data-testid="editor-container"] [contenteditable="true"]');
      await editor.click();
      await editor.fill(newDescription);
      await this.page.keyboard.press('Meta+Enter').catch(() => undefined);
      await this.page.keyboard.press('Control+Enter').catch(() => undefined);
    }

    await expect(this.page.getByText(newDescription)).toBeVisible({ timeout: 30_000 });
  }

  async changeIssueType(newIssueType: string): Promise<void> {
    const typeField = this.page.getByText(/^issue type$/i).or(this.page.getByLabel(/issue type/i));
    await typeField.first().click({ force: true });

    const option = this.page.getByRole('option', { name: new RegExp(`^${newIssueType}$`, 'i') });
    await option.click();

    await expect(this.page.getByText(new RegExp(newIssueType, 'i'))).toBeVisible();
  }

  async changePriority(newPriority: string): Promise<void> {
    const priorityField = this.page.getByText(/^priority$/i).or(this.page.getByLabel(/priority/i));
    await priorityField.first().click({ force: true });

    const option = this.page.getByRole('option', { name: new RegExp(newPriority, 'i') });
    await option.click();

    await expect(this.page.getByText(new RegExp(newPriority, 'i'))).toBeVisible();
  }

  async cancelInlineEdit(): Promise<void> {
    // ESC commonly cancels inline edits
    await this.page.keyboard.press('Escape');
  }

  async openMoreActions(): Promise<void> {
    // "More" menu or "•••" button.
    const more = this.page.getByRole('button', { name: /more/i }).or(this.page.getByRole('button', { name: /more actions/i }))
      .or(this.page.getByRole('button', { name: /\.{3}|⋯/i }));
    await more.first().click({ timeout: 30_000 });
  }

  async deleteIssueConfirm(): Promise<void> {
    await this.openMoreActions();
    await this.page.getByRole('menuitem', { name: /delete/i }).click();

    const dialog = this.page.getByRole('dialog');
    await expect(dialog.getByText(/delete/i)).toBeVisible();
    await dialog.getByRole('button', { name: /^delete$/i }).click();

    await expect(this.page.getByText(/issue.*deleted|deleted issue/i)).toBeVisible({ timeout: 60_000 });
  }

  async deleteIssueCancel(): Promise<void> {
    await this.openMoreActions();
    await this.page.getByRole('menuitem', { name: /delete/i }).click();

    const dialog = this.page.getByRole('dialog');
    await expect(dialog.getByText(/delete/i)).toBeVisible();
    await dialog.getByRole('button', { name: /cancel/i }).click();

    await expect(dialog).toBeHidden({ timeout: 30_000 });
  }

  async transitionToDone(): Promise<void> {
    // Status button often is a dropdown or a button.
    const statusButton = this.page.getByRole('button', { name: /status/i }).or(this.page.getByRole('button', { name: /to do|in progress|done/i }));
    await statusButton.first().click({ timeout: 30_000 });

    const doneOption = this.page.getByRole('option', { name: /^done$/i }).or(this.page.getByRole('menuitem', { name: /^done$/i }));
    await doneOption.first().click();

    // Some transitions require confirm
    const confirm = this.page.getByRole('button', { name: /done|transition|confirm|save/i });
    if (await confirm.count()) {
      await confirm.first().click().catch(() => undefined);
    }

    await expect(this.page.getByText(/^done$/i)).toBeVisible({ timeout: 60_000 });
  }

  async gotoIssueSearchWithJql(jql: string): Promise<void> {
    const baseUrl = requireEnv('APP_URL');
    const url = `${baseUrl}/issues/?jql=${encodeURIComponent(jql)}`;
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/\/issues\//);
  }

  async expectOnlyDoneIssuesDisplayed(): Promise<void> {
    // Best-effort: ensure every visible status lozenge is Done.
    const statusCells = this.page.getByText(/^done$/i);
    await expect(statusCells.first()).toBeVisible({ timeout: 60_000 });

    const notDone = this.page.getByText(/to do|in progress|selected for development|backlog/i);
    await expect(notDone).toHaveCount(0);
  }

  async logout(): Promise<void> {
    // Avatar button typically opens profile menu.
    const avatar = this.page.getByRole('button', { name: /account|profile|avatar/i }).or(this.page.locator('button[aria-label*="account" i]'));
    await avatar.first().click({ timeout: 30_000 });

    const logout = this.page.getByRole('menuitem', { name: /log out/i }).or(this.page.getByRole('menuitem', { name: /logout/i }));
    await logout.first().click();

    await expect(this.page).toHaveURL(/id\.atlassian\.com\/login|login/i, { timeout: 60_000 });
  }
}
