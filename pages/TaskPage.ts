import { expect, type Locator, type Page } from '@playwright/test';

export class TaskPage {
  readonly page: Page;

  // Global Jira header actions
  readonly createButton: Locator;
  readonly profileButton: Locator;

  // Create issue modal
  readonly createModal: Locator;
  readonly projectField: Locator;
  readonly issueTypeField: Locator;
  readonly summaryField: Locator;
  readonly descriptionField: Locator;
  readonly createSubmitButton: Locator;
  readonly createValidationError: Locator;
  readonly createdIssueLink: Locator;

  // Issue view
  readonly issueSummary: Locator;
  readonly issueType: Locator;
  readonly priority: Locator;
  readonly status: Locator;

  // Issue actions
  readonly moreActionsButton: Locator;
  readonly deleteAction: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;

  // Search / filters
  readonly searchInput: Locator;
  readonly issueListRows: Locator;

  constructor(page: Page) {
    this.page = page;

    this.createButton = page.getByRole('button', { name: /^create$/i }).or(page.getByRole('button', { name: /create/i }));
    this.profileButton = page.getByRole('button', { name: /account|profile|avatar/i }).or(page.locator('button[aria-label*="Account"], button[aria-label*="Profile"]'));

    this.createModal = page.locator('[role="dialog"]').filter({ hasText: /create/i });
    this.projectField = page.getByLabel(/project/i).or(page.getByRole('combobox', { name: /project/i }));
    this.issueTypeField = page.getByLabel(/issue type/i).or(page.getByRole('combobox', { name: /issue type/i }));
    this.summaryField = page.getByLabel(/summary/i).or(page.getByPlaceholder(/summary/i));
    this.descriptionField = page.getByLabel(/description/i).or(page.locator('[data-testid="jira-issue-create.description"] textarea, textarea[name="description"]'));
    this.createSubmitButton = page.getByRole('button', { name: /^create$/i });
    this.createValidationError = page.locator('[role="alert"], [data-testid*="error"], .error').filter({ hasText: /summary|required|field/i });
    this.createdIssueLink = page.locator('a').filter({ hasText: /[A-Z]+-\d+/ });

    this.issueSummary = page.getByRole('heading').or(page.locator('[data-testid="issue.views.issue-base.foundation.summary.heading"]'));
    this.issueType = page.locator('[data-testid*="issue-type"], [aria-label*="Issue type"], [data-testid="issue.views.field.issue-type"]');
    this.priority = page.locator('[data-testid*="priority"], [aria-label*="Priority"], [data-testid="issue.views.field.priority"]');
    this.status = page.locator('[data-testid*="status"], [aria-label*="Status"], [data-testid="issue.views.issue-base.foundation.status"]');

    this.moreActionsButton = page.getByRole('button', { name: /more|actions/i }).or(page.locator('button[aria-label*="More"], button[aria-label*="Actions"]'));
    this.deleteAction = page.getByRole('menuitem', { name: /delete/i }).or(page.getByRole('button', { name: /delete/i }));
    this.deleteConfirmButton = page.getByRole('button', { name: /delete/i });
    this.deleteCancelButton = page.getByRole('button', { name: /cancel/i });

    this.searchInput = page.getByPlaceholder(/search/i).or(page.getByRole('textbox', { name: /search/i }));
    this.issueListRows = page.locator('[data-testid*="issue-row"], tr').filter({ has: page.locator('a[href*="/browse/"]') });
  }

  async gotoBaseUrl(baseUrl: string): Promise<void> {
    await this.page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await this.page.waitForURL(/https:\/\/.*\.atlassian\.net\/.*/, { timeout: 60_000 });
  }

  async openCreateIssue(): Promise<void> {
    await expect(this.createButton).toBeVisible({ timeout: 60_000 });
    await this.createButton.click();
    await expect(this.createModal).toBeVisible({ timeout: 30_000 });
  }

  private async selectFromCombobox(field: Locator, optionText: string): Promise<void> {
    await field.click();
    // Jira uses Atlaskit select; typing filters options.
    await field.fill(optionText);
    await this.page.getByRole('option', { name: new RegExp(optionText, 'i') }).first().click({ timeout: 10_000 });
  }

  async createIssue(params: { project: string; issueType: string; summary: string; description?: string }): Promise<string> {
    await this.openCreateIssue();

    await this.selectFromCombobox(this.projectField, params.project);
    await this.selectFromCombobox(this.issueTypeField, params.issueType);

    await this.summaryField.fill(params.summary);
    if (params.description) {
      // Some Jira instances use rich text editor. Prefer label, fallback to textarea.
      await this.descriptionField.fill(params.description);
    }

    await this.createSubmitButton.click();

    // After creation Jira often shows a toast with issue key link.
    const issueKey = await this.createdIssueLink.first().textContent({ timeout: 30_000 });
    expect(issueKey, 'Expected created issue key link to be present').toBeTruthy();
    return (issueKey || '').trim();
  }

  async assertCreateSummaryRequired(): Promise<void> {
    await expect(this.createValidationError).toBeVisible({ timeout: 30_000 });
  }

  async openIssueByKey(baseUrl: string, issueKey: string): Promise<void> {
    await this.page.goto(`${baseUrl.replace(/\/$/, '')}/browse/${issueKey}`, { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByText(issueKey)).toBeVisible({ timeout: 60_000 });
  }

  async editSummary(newSummary: string): Promise<void> {
    // Summary is inline editable in the issue view.
    const summaryEditable = this.page.locator('[data-testid*="summary"], [aria-label*="Summary"]');
    await summaryEditable.first().click();
    const summaryInput = this.page.getByRole('textbox', { name: /summary/i }).or(this.page.locator('input[name="summary"]'));
    await expect(summaryInput).toBeVisible({ timeout: 10_000 });
    await summaryInput.fill(newSummary);
    await summaryInput.press('Enter');
    await expect(this.page.getByText(newSummary)).toBeVisible({ timeout: 30_000 });
  }

  async editDescription(newDescription: string): Promise<void> {
    const descriptionRegion = this.page.getByText(/description/i).first();
    await descriptionRegion.click({ timeout: 10_000 }).catch(() => {});

    const editor = this.page.locator('[contenteditable="true"]').first();
    if (await editor.isVisible().catch(() => false)) {
      await editor.fill(newDescription);
      await editor.press('Control+Enter').catch(async () => {
        await this.page.keyboard.press('Meta+Enter');
      });
      await expect(this.page.getByText(newDescription)).toBeVisible({ timeout: 30_000 });
      return;
    }

    const textarea = this.page.locator('textarea[name="description"]').first();
    if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill(newDescription);
      await textarea.press('Enter');
      await expect(this.page.getByText(newDescription)).toBeVisible({ timeout: 30_000 });
    }
  }

  async changeIssueType(issueType: string): Promise<void> {
    // Issue type is usually a field with a dropdown.
    const field = this.page.getByLabel(/issue type/i).or(this.page.locator('[data-testid*="issue-type"]'));
    await field.first().click();
    const combobox = this.page.getByRole('combobox', { name: /issue type/i }).or(this.page.locator('input[role="combobox"]')).first();
    if (await combobox.isVisible().catch(() => false)) {
      await combobox.fill(issueType);
      await this.page.getByRole('option', { name: new RegExp(issueType, 'i') }).first().click({ timeout: 10_000 });
    } else {
      await this.page.getByRole('menuitemradio', { name: new RegExp(issueType, 'i') }).first().click({ timeout: 10_000 });
    }
    await expect(this.page.getByText(new RegExp(issueType, 'i'))).toBeVisible({ timeout: 30_000 });
  }

  async changePriority(priority: string): Promise<void> {
    const field = this.page.getByLabel(/priority/i).or(this.page.locator('[data-testid*="priority"]'));
    await field.first().click();
    const combo = this.page.getByRole('combobox', { name: /priority/i }).or(this.page.locator('input[role="combobox"]')).first();
    if (await combo.isVisible().catch(() => false)) {
      await combo.fill(priority);
      await this.page.getByRole('option', { name: new RegExp(priority, 'i') }).first().click({ timeout: 10_000 });
    } else {
      await this.page.getByRole('menuitemradio', { name: new RegExp(priority, 'i') }).first().click({ timeout: 10_000 });
    }
    await expect(this.page.getByText(new RegExp(priority, 'i'))).toBeVisible({ timeout: 30_000 });
  }

  async openMoreActions(): Promise<void> {
    await this.moreActionsButton.first().click();
  }

  async deleteIssueConfirm(): Promise<void> {
    await this.openMoreActions();
    await this.deleteAction.click();

    // Confirmation dialog appears.
    const dialog = this.page.locator('[role="dialog"]').filter({ hasText: /delete/i });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await this.deleteConfirmButton.filter({ hasText: /delete/i }).last().click();
  }

  async deleteIssueCancel(): Promise<void> {
    await this.openMoreActions();
    await this.deleteAction.click();

    const dialog = this.page.locator('[role="dialog"]').filter({ hasText: /delete/i });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await this.deleteCancelButton.click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
  }

  async transitionToDone(): Promise<void> {
    // Jira has a "Transition" / status button. Try common patterns.
    const doneButton = this.page.getByRole('button', { name: /^done$/i })
      .or(this.page.getByRole('button', { name: /transition/i }))
      .or(this.page.getByRole('button', { name: /status/i }));

    await doneButton.first().click();

    // If status dropdown opened, select Done.
    const doneOption = this.page.getByRole('option', { name: /^done$/i })
      .or(this.page.getByRole('menuitem', { name: /^done$/i }))
      .or(this.page.getByText(/^done$/i));

    await doneOption.first().click({ timeout: 10_000 }).catch(() => {});
    await expect(this.page.getByText(/^done$/i)).toBeVisible({ timeout: 30_000 });
  }

  async gotoIssueSearch(baseUrl: string): Promise<void> {
    await this.page.goto(`${baseUrl.replace(/\/$/, '')}/issues/?jql=order%20by%20created%20DESC`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(this.searchInput).toBeVisible({ timeout: 60_000 });
  }

  async filterDoneIssues(): Promise<void> {
    // Use JQL via query param is the most stable. If current page supports, just fill search.
    await this.searchInput.fill('status = Done');
    await this.searchInput.press('Enter');
    // Wait for results to settle.
    await this.page.waitForTimeout(1500);
  }

  async assertOnlyDoneIssuesListed(): Promise<void> {
    // Assert that each visible row contains Done status badge somewhere.
    const rows = this.issueListRows;
    const count = await rows.count();
    expect(count, 'Expected at least 1 issue row after filtering').toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 10); i++) {
      const row = rows.nth(i);
      await expect(row.getByText(/^done$/i).or(row.getByText(/done/i))).toBeVisible();
    }
  }
}
