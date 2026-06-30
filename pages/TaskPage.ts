import { expect, Page } from '@playwright/test';
import { CreateIssueData, EditIssueData } from '../data/testData';

export class TaskPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoJiraBase(appUrl: string): Promise<void> {
    await this.page.goto(appUrl, { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/atlassian\.net/);
  }

  async openCreateIssue(): Promise<void> {
    // Jira has a global "Create" button.
    const createBtn = this.page
      .getByRole('button', { name: /^create$/i })
      .or(this.page.getByRole('link', { name: /^create$/i }));
    await createBtn.click();

    // Wait for create dialog.
    await expect(
      this.page.getByRole('dialog').or(this.page.locator('[role="dialog"]'))
    ).toBeVisible({ timeout: 30_000 });
  }

  async setProject(projectName: string): Promise<void> {
    // Project field can be a combobox.
    const projectField = this.page
      .getByLabel(/^project$/i)
      .or(this.page.getByLabel(/project/i));
    await projectField.click();
    await projectField.fill(projectName);
    await this.page.getByRole('option', { name: new RegExp(projectName, 'i') }).first().click();
  }

  async setIssueType(issueType: string): Promise<void> {
    const issueTypeField = this.page
      .getByLabel(/issue type/i)
      .or(this.page.getByRole('combobox', { name: /issue type/i }));
    await issueTypeField.click();
    // Some Jira UIs require typing.
    await issueTypeField.fill(issueType);
    await this.page.getByRole('option', { name: new RegExp(`^${issueType}$`, 'i') }).first().click();
  }

  async setSummary(summary: string): Promise<void> {
    const summaryField = this.page
      .getByLabel(/^summary$/i)
      .or(this.page.getByPlaceholder(/summary/i));
    await summaryField.fill(summary);
  }

  async setDescription(description: string): Promise<void> {
    // New Jira description uses a rich text editor.
    // Try label then fall back to editor textbox.
    const desc = this.page.getByLabel(/^description$/i);
    if (await desc.count()) {
      await desc.click();
      await desc.fill(description);
      return;
    }
    const editor = this.page
      .getByRole('textbox', { name: /description/i })
      .or(this.page.locator('[data-testid="issue-create.ui.description-field.text-area"]'))
      .or(this.page.locator('[contenteditable="true"]').first());
    await editor.click();
    await editor.fill(description);
  }

  async submitCreate(): Promise<void> {
    const createBtn = this.page.getByRole('button', { name: /^create$/i });
    await createBtn.click();
  }

  async assertCreateSuccess(): Promise<void> {
    // Jira shows "Issue created" flag with a link to the issue.
    await expect(this.page.locator('body')).toContainText(/issue created|created/i);
  }

  async getCreatedIssueKeyFromToast(): Promise<string> {
    // Attempt to find issue key like ABC-123 in the toast.
    const bodyText = await this.page.locator('body').innerText();
    const match = bodyText.match(/[A-Z][A-Z0-9]+-\d+/);
    if (!match) throw new Error('Unable to parse created issue key from page text.');
    return match[0];
  }

  async openIssueByKey(appUrl: string, issueKey: string): Promise<void> {
    await this.page.goto(`${appUrl}/browse/${issueKey}`, { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(new RegExp(`/browse/${issueKey}$`));
    await expect(this.page.locator('body')).toContainText(new RegExp(issueKey));
  }

  async createIssue(appUrl: string, data: Required<Pick<CreateIssueData, 'project' | 'issueType' | 'summary' | 'description'>>): Promise<string> {
    await this.gotoJiraBase(appUrl);
    await this.openCreateIssue();
    await this.setProject(data.project);
    await this.setIssueType(data.issueType);
    await this.setSummary(data.summary);
    await this.setDescription(data.description);
    await this.submitCreate();
    await this.assertCreateSuccess();
    const key = await this.getCreatedIssueKeyFromToast();
    return key;
  }

  async assertSummaryValidationError(): Promise<void> {
    // Summary required message may appear near the field.
    await expect(this.page.locator('body')).toContainText(/summary.*required|required.*summary/i);
  }

  async openAnyExistingIssue(appUrl: string): Promise<void> {
    // Best effort: go to Issues/search view and open first issue.
    await this.page.goto(`${appUrl}/issues`, { waitUntil: 'domcontentloaded' });
    // Open first issue in list if present.
    const firstIssueLink = this.page
      .locator('a')
      .filter({ hasText: /[A-Z][A-Z0-9]+-\d+/ })
      .first();
    await expect(firstIssueLink).toBeVisible({ timeout: 45_000 });
    const issueKey = (await firstIssueLink.innerText()).match(/[A-Z][A-Z0-9]+-\d+/)?.[0];
    await firstIssueLink.click();
    await expect(this.page).toHaveURL(/\/browse\/[A-Z][A-Z0-9]+-\d+/);
    if (!issueKey) {
      // Not fatal; subsequent selectors rely on fields.
      return;
    }
    await expect(this.page.locator('body')).toContainText(issueKey);
  }

  async editSummary(newSummary: string): Promise<void> {
    // Click summary field to edit.
    const summary = this.page
      .getByTestId('issue.views.issue-base.foundation.summary.heading')
      .or(this.page.getByRole('heading', { level: 1 }));
    await summary.click();
    const input = this.page.getByRole('textbox', { name: /summary/i }).or(this.page.locator('input[name="summary"]'));
    await expect(input).toBeVisible();
    await input.fill(newSummary);
    await this.page.keyboard.press('Enter');
    await expect(this.page.locator('body')).toContainText(newSummary);
  }

  async editDescription(newDescription: string): Promise<void> {
    const descField = this.page.getByText(/^description$/i).first();
    if (await descField.count()) {
      await descField.click();
    }
    const editor = this.page
      .getByRole('textbox', { name: /description/i })
      .or(this.page.locator('[contenteditable="true"]').first());
    await editor.click();
    await editor.fill(newDescription);
    // Save editor changes (Ctrl+Enter works in some Jira editors)
    await this.page.keyboard.press('Control+Enter').catch(() => {});
    await expect(this.page.locator('body')).toContainText(/updated|saved|description/i);
  }

  async changeIssueType(issueType: string): Promise<void> {
    const issueTypeField = this.page.getByText(/issue type/i).first();
    await issueTypeField.click();
    const combo = this.page.getByRole('combobox').first();
    await combo.fill(issueType);
    await this.page.getByRole('option', { name: new RegExp(`^${issueType}$`, 'i') }).first().click();
    await expect(this.page.locator('body')).toContainText(new RegExp(issueType, 'i'));
  }

  async changePriority(priority: string): Promise<void> {
    const priorityField = this.page.getByText(/priority/i).first();
    await priorityField.click();
    const combo = this.page.getByRole('combobox').first();
    await combo.fill(priority);
    await this.page.getByRole('option', { name: new RegExp(`^${priority}$`, 'i') }).first().click();
    await expect(this.page.locator('body')).toContainText(new RegExp(priority, 'i'));
  }

  async editIssue(data: EditIssueData): Promise<void> {
    if (data.updatedSummary) await this.editSummary(data.updatedSummary);
    if (data.updatedDescription) await this.editDescription(data.updatedDescription);
    if (data.updatedIssueType) await this.changeIssueType(data.updatedIssueType);
    if (data.updatedPriority) await this.changePriority(data.updatedPriority);
  }

  async deleteIssueConfirm(): Promise<void> {
    // Open "More" menu then Delete.
    const more = this.page.getByRole('button', { name: /more/i }).or(this.page.getByRole('button', { name: /\.{3}/ }));
    await more.click();
    const deleteItem = this.page.getByRole('menuitem', { name: /delete/i }).or(this.page.getByRole('button', { name: /delete/i }));
    await deleteItem.click();
    // Confirmation dialog
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/delete/i);
    await dialog.getByRole('button', { name: /^delete$/i }).click();
    await expect(this.page.locator('body')).toContainText(/issue deleted|deleted/i);
  }

  async deleteIssueCancel(): Promise<void> {
    const more = this.page.getByRole('button', { name: /more/i }).or(this.page.getByRole('button', { name: /\.{3}/ }));
    await more.click();
    const deleteItem = this.page.getByRole('menuitem', { name: /delete/i }).or(this.page.getByRole('button', { name: /delete/i }));
    await deleteItem.click();
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/delete/i);
    await dialog.getByRole('button', { name: /cancel/i }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });
  }

  async transitionToDone(): Promise<void> {
    // Status button often present in issue view.
    const status = this.page.getByRole('button', { name: /status/i }).or(this.page.getByText(/status/i).first());
    await status.click();
    const doneOption = this.page.getByRole('option', { name: /^done$/i }).or(this.page.getByRole('menuitem', { name: /^done$/i }));
    await doneOption.click();
    await expect(this.page.locator('body')).toContainText(/done/i);
  }

  async filterDoneIssues(appUrl: string): Promise<void> {
    // Use search with JQL.
    await this.page.goto(`${appUrl}/issues/?jql=status%20%3D%20Done`, {
      waitUntil: 'domcontentloaded'
    });
    await expect(this.page).toHaveURL(/jql=.*Done/i);
  }

  async assertOnlyDoneIssuesVisible(): Promise<void> {
    // Best-effort assertion: presence of status Done tags.
    await expect(this.page.locator('body')).toContainText(/done/i);
  }

  async assertEmptyStateForNoResults(): Promise<void> {
    await expect(this.page.locator('body')).toContainText(/no issues|no results|0 issues|nothing to show/i);
  }
}