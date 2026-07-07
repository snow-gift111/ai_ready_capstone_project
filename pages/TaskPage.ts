import { expect, Locator, Page } from '@playwright/test';

export class TaskPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Top navigation
  createButton(): Locator {
    return this.page.getByRole('button', { name: /^create$/i }).or(this.page.getByRole('link', { name: /^create$/i }));
  }

  profileButton(): Locator {
    return this.page.getByRole('button', { name: /account|profile|avatar/i });
  }

  logoutButton(): Locator {
    // Jira sometimes shows "Log out" in account menu.
    return this.page.getByRole('menuitem', { name: /log out/i }).or(this.page.getByRole('button', { name: /log out/i }));
  }

  async openCreateIssue(): Promise<void> {
    await this.createButton().click();
    await expect(this.page.getByRole('dialog')).toBeVisible({ timeout: 20_000 });
  }

  // Create issue dialog fields
  projectField(): Locator {
    return this.page.getByLabel(/project/i);
  }

  issueTypeField(): Locator {
    return this.page.getByLabel(/issue type/i);
  }

  summaryField(): Locator {
    return this.page.getByLabel(/summary/i);
  }

  descriptionField(): Locator {
    // Cloud editor uses role textbox within description section.
    return this.page.getByRole('textbox', { name: /description/i }).or(this.page.getByLabel(/description/i));
  }

  createSubmitButton(): Locator {
    return this.page.getByRole('button', { name: /^create$/i });
  }

  async selectDropdownByTyping(field: Locator, value: string): Promise<void> {
    await field.click();
    await field.fill(value);
    // Option list appears; select first exact match
    const option = this.page.getByRole('option', { name: new RegExp(`^${escapeRegExp(value)}$`, 'i') });
    await option.first().click({ timeout: 15_000 });
  }

  async createIssue(params: { project: string; issueType: string; summary: string; description?: string }): Promise<void> {
    await this.openCreateIssue();

    await this.selectDropdownByTyping(this.projectField(), params.project);
    await this.selectDropdownByTyping(this.issueTypeField(), params.issueType);

    await this.summaryField().fill(params.summary);

    if (params.description) {
      await this.descriptionField().click();
      await this.descriptionField().fill(params.description);
    }

    await this.createSubmitButton().click();

    // After creation, dialog closes and a toast appears with issue key/link
    const createdToast = this.page.getByText(/created/i, { exact: false });
    await expect(createdToast).toBeVisible({ timeout: 30_000 });
  }

  async openIssueFromRecentToast(summary: string): Promise<void> {
    // Best-effort: find toast/link containing summary and click.
    const link = this.page.getByRole('link', { name: new RegExp(escapeRegExp(summary), 'i') });
    if (await link.count()) {
      await link.first().click();
    }
    await expect(this.page.getByRole('heading')).toBeVisible({ timeout: 30_000 });
  }

  // Issue view
  issueSummaryHeading(): Locator {
    return this.page.getByRole('heading').filter({ hasText: /.*/ }).first();
  }

  issueSummaryFieldInline(): Locator {
    return this.page.getByRole('textbox', { name: /summary/i }).or(this.page.getByLabel(/summary/i));
  }

  async editSummary(newSummary: string): Promise<void> {
    // Try inline edit by clicking summary heading.
    const summaryHeading = this.page.getByTestId('issue.views.issue-base.foundation.summary.heading').or(
      this.page.getByRole('heading', { name: /.+/ })
    );
    await summaryHeading.first().click();
    const input = this.page.getByRole('textbox').first();
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill(newSummary);
    await input.press('Enter');
  }

  async editDescription(newDescription: string): Promise<void> {
    const desc = this.page.getByText(/description/i).first();
    await desc.click({ timeout: 10_000 });
    const editor = this.page.getByRole('textbox').nth(0);
    await expect(editor).toBeVisible();
    await editor.fill(newDescription);
    await editor.press('Control+Enter');
  }

  async changeIssueType(newType: string): Promise<void> {
    // Issue type field in view often is a button/combobox.
    const typeButton = this.page.getByRole('button', { name: /issue type/i }).or(this.page.getByLabel(/issue type/i));
    await typeButton.first().click();
    const option = this.page.getByRole('option', { name: new RegExp(`^${escapeRegExp(newType)}$`, 'i') });
    await option.first().click({ timeout: 15_000 });
  }

  async changePriority(newPriority: string): Promise<void> {
    const priority = this.page.getByRole('button', { name: /priority/i }).or(this.page.getByLabel(/priority/i));
    await priority.first().click();
    const option = this.page.getByRole('option', { name: new RegExp(`^${escapeRegExp(newPriority)}$`, 'i') });
    await option.first().click({ timeout: 15_000 });
  }

  async openMoreActions(): Promise<void> {
    const more = this.page.getByRole('button', { name: /more actions|more/i });
    await more.first().click();
  }

  async deleteIssue(confirm: boolean): Promise<void> {
    await this.openMoreActions();
    await this.page.getByRole('menuitem', { name: /delete/i }).click();

    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    if (confirm) {
      await dialog.getByRole('button', { name: /^delete$/i }).click();
      await expect(this.page.getByText(/issue deleted|deleted/i)).toBeVisible({ timeout: 30_000 });
    } else {
      await dialog.getByRole('button', { name: /cancel/i }).click();
      await expect(dialog).toBeHidden({ timeout: 15_000 });
    }
  }

  async transitionToDone(): Promise<void> {
    // Transition/status dropdown is often a button with current status.
    const statusButton = this.page.getByRole('button', { name: /status|to do|in progress|done/i });
    await statusButton.first().click();

    const doneOption = this.page.getByRole('option', { name: /^done$/i }).or(this.page.getByRole('menuitem', { name: /^done$/i }));
    await doneOption.first().click({ timeout: 15_000 });

    await expect(this.page.getByText(/^Done$/i).first()).toBeVisible({ timeout: 30_000 });
  }

  async goToIssueSearch(): Promise<void> {
    // Use "Filters" or "Search" in nav, best effort
    const search = this.page.getByRole('link', { name: /issues|search|filters/i });
    await search.first().click();
    await expect(this.page).toHaveURL(/.*atlassian\.net\/.+/, { timeout: 30_000 });
  }

  async filterDoneIssues(): Promise<void> {
    // JQL search box typically available.
    const jql = this.page.getByRole('textbox', { name: /jql|search/i }).or(this.page.getByPlaceholder(/search|jql/i));
    await expect(jql.first()).toBeVisible({ timeout: 30_000 });
    await jql.first().fill('status = Done');
    await jql.first().press('Enter');
    // Results table/list should update; assert some "Done" visible in results.
    await expect(this.page.getByText(/Done/i).first()).toBeVisible({ timeout: 30_000 });
  }

  async logout(): Promise<void> {
    await this.profileButton().click({ timeout: 15_000 });
    await this.logoutButton().click({ timeout: 15_000 });
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
