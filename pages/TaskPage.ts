import { expect, Locator, Page } from '@playwright/test';

export class TaskPage {
  constructor(private readonly page: Page) {}

  // --- Navigation helpers ---
  async gotoJiraHome(): Promise<void> {
    // baseURL should be https://<tenant>.atlassian.net
    await this.page.goto('/jira');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async openCreateIssue(): Promise<void> {
    // Jira has multiple create entry points. Try global Create button first.
    const createButton = this.page.getByRole('button', { name: /^create$/i }).or(this.page.getByRole('link', { name: /^create$/i }));
    await createButton.first().click();
    await expect(this.page.getByRole('dialog')).toBeVisible({ timeout: 30_000 });
  }

  private dialog(): Locator {
    return this.page.getByRole('dialog');
  }

  async selectProject(projectName: string): Promise<void> {
    const projectField = this.dialog().getByLabel(/project/i).or(this.dialog().getByRole('combobox', { name: /project/i }));
    await projectField.click();
    await this.page.getByRole('option', { name: new RegExp(projectName, 'i') }).first().click();
  }

  async selectIssueType(issueType: string): Promise<void> {
    const issueTypeField = this.dialog().getByLabel(/issue type/i).or(this.dialog().getByRole('combobox', { name: /issue type/i }));
    await issueTypeField.click();
    await this.page.getByRole('option', { name: new RegExp(issueType, 'i') }).first().click();
  }

  async fillSummary(summary: string): Promise<void> {
    const summaryField = this.dialog().getByLabel(/summary/i).or(this.dialog().getByPlaceholder(/summary/i));
    await summaryField.fill(summary);
  }

  async fillDescription(description: string): Promise<void> {
    // Jira description might be textarea or editor.
    const desc = this.dialog().getByLabel(/description/i).or(this.dialog().locator('textarea[name="description"]'));
    if (await desc.first().isVisible().catch(() => false)) {
      await desc.first().fill(description);
      return;
    }

    // Fallback: contenteditable region inside dialog
    const editable = this.dialog().locator('[contenteditable="true"]').first();
    await editable.click();
    await editable.fill(description);
  }

  async submitCreate(): Promise<void> {
    const create = this.dialog().getByRole('button', { name: /^create$/i }).or(this.dialog().getByRole('button', { name: /create/i }));
    await create.first().click();
  }

  async expectIssueCreatedToast(): Promise<void> {
    const toast = this.page.getByText(/created|issue created|has been created/i);
    await expect(toast.first()).toBeVisible({ timeout: 30_000 });
  }

  async expectSummaryRequiredErrorInCreate(): Promise<void> {
    const error = this.dialog().getByText(/summary.*required|required/i);
    await expect(error.first()).toBeVisible({ timeout: 10_000 });
  }

  // --- Issue view / edit ---
  async openIssueByKey(issueKey: string): Promise<void> {
    await this.page.goto(`/browse/${issueKey}`);
    await expect(this.page).toHaveURL(new RegExp(`/browse/${issueKey}$`));
    await this.page.waitForLoadState('domcontentloaded');
  }

  async startEditIssue(): Promise<void> {
    const editButton = this.page.getByRole('button', { name: /^edit$/i }).or(this.page.getByRole('button', { name: /edit issue/i }));
    await editButton.first().click();
    await expect(this.page.getByRole('dialog')).toBeVisible({ timeout: 30_000 });
  }

  async updateIssueSummary(summary: string): Promise<void> {
    const summaryField = this.dialog().getByLabel(/summary/i).or(this.dialog().getByPlaceholder(/summary/i));
    await summaryField.fill(summary);
  }

  async updateIssueDescription(description: string): Promise<void> {
    await this.fillDescription(description);
  }

  async changeIssueType(issueType: string): Promise<void> {
    await this.selectIssueType(issueType);
  }

  async changePriority(priority: string): Promise<void> {
    const priorityField = this.dialog().getByLabel(/priority/i).or(this.dialog().getByRole('combobox', { name: /priority/i }));
    await priorityField.click();
    await this.page.getByRole('option', { name: new RegExp(priority, 'i') }).first().click();
  }

  async saveEdit(): Promise<void> {
    const save = this.dialog().getByRole('button', { name: /^save$/i }).or(this.dialog().getByRole('button', { name: /save/i }));
    await save.first().click();
    await expect(this.dialog()).toBeHidden({ timeout: 30_000 });
  }

  async cancelEdit(): Promise<void> {
    const cancel = this.dialog().getByRole('button', { name: /^cancel$/i }).or(this.dialog().getByRole('button', { name: /cancel/i }));
    await cancel.first().click();
    await expect(this.dialog()).toBeHidden({ timeout: 30_000 });
  }

  async expectIssueFields(summary: string, description: string): Promise<void> {
    // Assertions in view mode. Jira renders summary as heading.
    await expect(this.page.getByRole('heading', { name: new RegExp(summary, 'i') }).first()).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByText(new RegExp(description, 'i')).first()).toBeVisible({ timeout: 30_000 });
  }

  async expectIssueTypeInView(issueType: string): Promise<void> {
    // Often shown in breadcrumbs or issue type field.
    const typeText = this.page.getByText(new RegExp(issueType, 'i'));
    await expect(typeText.first()).toBeVisible();
  }

  async expectPriorityInView(priority: string): Promise<void> {
    const priorityText = this.page.getByText(new RegExp(priority, 'i'));
    await expect(priorityText.first()).toBeVisible();
  }

  // --- Delete issue ---
  async initiateDelete(): Promise<void> {
    // Try more actions menu then delete.
    const more = this.page.getByRole('button', { name: /more|actions|\.{3}/i });
    if (await more.first().isVisible().catch(() => false)) {
      await more.first().click();
    }

    const del = this.page.getByRole('menuitem', { name: /delete/i }).or(this.page.getByRole('button', { name: /delete/i }));
    await del.first().click();
  }

  async confirmDelete(): Promise<void> {
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    const del = dialog.getByRole('button', { name: /^delete$/i }).or(dialog.getByRole('button', { name: /delete/i }));
    await del.first().click();
  }

  async cancelDelete(): Promise<void> {
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    const cancel = dialog.getByRole('button', { name: /cancel/i }).or(dialog.getByRole('button', { name: /close/i }));
    await cancel.first().click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });
  }

  async expectDeleteConfirmationPrompt(): Promise<void> {
    await expect(this.page.getByRole('dialog')).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByRole('dialog').getByText(/delete/i)).toBeVisible();
  }

  async expectIssueNotAccessible(issueKey: string): Promise<void> {
    await this.page.goto(`/browse/${issueKey}`);
    await expect(
      this.page.getByText(/you can't view this issue|issue does not exist|we couldn't find|not found/i).first()
    ).toBeVisible({ timeout: 30_000 });
  }

  // --- Transitions / Done ---
  async transitionToDone(): Promise<void> {
    const doneButton = this.page.getByRole('button', { name: /^done$/i }).or(this.page.getByRole('button', { name: /mark as done|transition/i }));
    if (await doneButton.first().isVisible().catch(() => false)) {
      await doneButton.first().click();
      return;
    }

    // Fallback: status dropdown/field
    const statusField = this.page.getByRole('button', { name: /status/i }).or(this.page.getByText(/status/i));
    await statusField.first().click();
    await this.page.getByRole('menuitem', { name: /^done$/i }).or(this.page.getByRole('option', { name: /^done$/i })).first().click();
  }

  async expectStatusDone(): Promise<void> {
    await expect(this.page.getByText(/^done$/i).first()).toBeVisible({ timeout: 30_000 });
  }

  async gotoBoardOrListForFiltering(): Promise<void> {
    // Best effort: navigate to issues search.
    await this.page.goto('/jira/issues');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async applyDoneFilter(): Promise<void> {
    // Use basic search filter chip if available.
    const statusFilter = this.page.getByRole('button', { name: /status/i }).or(this.page.getByText(/status/i));
    await statusFilter.first().click();
    await this.page.getByRole('option', { name: /^done$/i }).or(this.page.getByRole('menuitem', { name: /^done$/i })).first().click();
  }

  async expectOnlyDoneIssuesVisible(): Promise<void> {
    // Assert that visible issue cards/rows include Done status marker.
    const rows = this.page.locator('[data-testid="issue.issue-view"], [data-testid="issue-row"], [data-testid="software-board.issue-card"], [data-testid="issue-card"]');
    const count = await rows.count();
    // If Jira uses different DOM, we still validate via general 'Done' occurrences.
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 10); i++) {
        await expect(rows.nth(i).getByText(/done/i)).toBeVisible();
      }
    } else {
      // Fallback: at least one Done is shown and no obvious non-done statuses are visible in results region.
      await expect(this.page.getByText(/^done$/i).first()).toBeVisible();
      await expect(this.page.getByText(/to do|in progress|selected for development/i).first()).toBeHidden();
    }
  }
}
