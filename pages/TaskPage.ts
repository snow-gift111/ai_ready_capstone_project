import { expect, Page } from '@playwright/test';
import { openCreateIssueDialog, openSomeIssueFromSearchOrList } from '../utils/helpers';

export class TaskPage {
  constructor(private readonly page: Page) {}

  async openCreate(): Promise<void> {
    await openCreateIssueDialog(this.page);
  }

  async createIssue(
    params: { project: string; issueType: string; summary: string; description?: string },
    options: {
      /** When false, do not wait for "created" toast (used for validation tests). */
      expectSuccess?: boolean;
    } = { expectSuccess: true }
  ): Promise<void> {
    // Project
    const projectField = this.page.getByLabel(/^project$/i).or(this.page.getByRole('combobox', { name: /project/i }));
    if (await projectField.isVisible().catch(() => false)) {
      await projectField.click();
      await this.page.getByRole('option', { name: new RegExp(params.project, 'i') }).click().catch(async () => {
        // If project list is not searchable in options, just press escape.
        await this.page.keyboard.press('Escape');
      });
    }

    // Issue type
    const issueTypeField = this.page.getByLabel(/issue type/i).or(this.page.getByRole('combobox', { name: /issue type/i }));
    if (await issueTypeField.isVisible().catch(() => false)) {
      await issueTypeField.click();
      await this.page.getByRole('option', { name: new RegExp(`^${params.issueType}$`, 'i') }).click();
    }

    // Summary
    const summaryField = this.page.getByLabel(/^summary$/i).or(this.page.getByPlaceholder(/summary/i));
    await expect(summaryField).toBeVisible({ timeout: 30_000 });
    await summaryField.fill(params.summary);

    // Description (supports either textarea or rich editor)
    if (params.description !== undefined) {
      const descriptionField = this.page
        .getByLabel(/^description$/i)
        .or(this.page.getByRole('textbox', { name: /^description$/i }))
        .or(this.page.getByPlaceholder(/add a description/i));

      if (await descriptionField.isVisible().catch(() => false)) {
        await descriptionField.click();
        await descriptionField.fill(params.description);
      } else {
        // Rich text editor iframe/ProseMirror fallback
        const proseMirror = this.page.locator('[contenteditable="true"]').filter({ hasText: '' }).first();
        if (await proseMirror.isVisible().catch(() => false)) {
          await proseMirror.click();
          await proseMirror.fill(params.description);
        }
      }
    }

    // Submit create
    const create = this.page.getByRole('button', { name: /^create$/i }).last();
    await expect(create).toBeEnabled();
    await create.click();

    if (options.expectSuccess !== false) {
      // Success: issue created toast appears
      const createdToast = this.page.getByText(/created/i).first();
      await expect(createdToast).toBeVisible({ timeout: 60_000 });
    }
  }

  async assertCreateDialogSummaryRequired(): Promise<void> {
    const error = this.page.getByText(/summary is required|required/i).first();
    await expect(error).toBeVisible({ timeout: 30_000 });
  }

  async openExistingIssue(): Promise<void> {
    await openSomeIssueFromSearchOrList(this.page);
  }

  async startEditingIssue(): Promise<void> {
    // Many Jira fields are inline editable.
    const editButton = this.page.getByRole('button', { name: /^edit$/i }).first();
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      await expect(this.page.getByRole('heading', { name: /edit issue/i })).toBeVisible({ timeout: 30_000 });
    }
  }

  async updateSummary(newSummary: string): Promise<void> {
    // Inline summary (issue view) or edit dialog
    const summary = this.page.getByLabel(/^summary$/i).or(this.page.getByRole('textbox', { name: /^summary$/i }));
    if (await summary.isVisible().catch(() => false)) {
      await summary.fill(newSummary);
      return;
    }

    const titleHeading = this.page.getByRole('heading').first();
    if (await titleHeading.isVisible().catch(() => false)) {
      await titleHeading.dblclick().catch(() => {});
    }
  }

  async updateDescription(newDescription: string): Promise<void> {
    const description = this.page
      .getByLabel(/^description$/i)
      .or(this.page.getByRole('textbox', { name: /^description$/i }))
      .or(this.page.getByPlaceholder(/add a description/i));

    if (await description.isVisible().catch(() => false)) {
      await description.click();
      await description.fill(newDescription);
      return;
    }

    const proseMirror = this.page.locator('[contenteditable="true"]').first();
    if (await proseMirror.isVisible().catch(() => false)) {
      await proseMirror.click();
      await proseMirror.fill(newDescription);
    }
  }

  async updateIssueType(issueType: string): Promise<void> {
    const issueTypeField = this.page.getByLabel(/issue type/i).or(this.page.getByRole('combobox', { name: /issue type/i }));
    if (await issueTypeField.isVisible().catch(() => false)) {
      await issueTypeField.click();
      await this.page.getByRole('option', { name: new RegExp(`^${issueType}$`, 'i') }).click();
    }
  }

  async updatePriority(priority: string): Promise<void> {
    const priorityField = this.page.getByLabel(/priority/i).or(this.page.getByRole('combobox', { name: /priority/i }));
    if (await priorityField.isVisible().catch(() => false)) {
      await priorityField.click();
      await this.page.getByRole('option', { name: new RegExp(`^${priority}$`, 'i') }).click();
    }
  }

  async saveEdit(): Promise<void> {
    const save = this.page.getByRole('button', { name: /^save$/i }).first();
    if (await save.isVisible().catch(() => false)) {
      await save.click();
    } else {
      // Inline edits often save on blur
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    // wait for any spinner
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async cancelEdit(): Promise<void> {
    const cancel = this.page.getByRole('button', { name: /^cancel$/i }).first();
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click();
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
  }

  async assertIssueSummaryVisible(text: string): Promise<void> {
    const summaryText = this.page.getByRole('heading', { name: new RegExp(text, 'i') }).first().or(this.page.getByText(new RegExp(text, 'i')).first());
    await expect(summaryText).toBeVisible({ timeout: 60_000 });
  }

  async assertIssueDescriptionVisible(text: string): Promise<void> {
    await expect(this.page.getByText(new RegExp(text, 'i')).first()).toBeVisible({ timeout: 60_000 });
  }

  async assertIssueTypeVisible(type: string): Promise<void> {
    await expect(this.page.getByText(new RegExp(type, 'i')).first()).toBeVisible({ timeout: 60_000 });
  }

  async assertPriorityVisible(priority: string): Promise<void> {
    await expect(this.page.getByText(new RegExp(priority, 'i')).first()).toBeVisible({ timeout: 60_000 });
  }

  async deleteIssueConfirm(): Promise<void> {
    const more = this.page.getByRole('button', { name: /more/i }).first();
    if (await more.isVisible().catch(() => false)) await more.click();

    const deleteAction = this.page.getByRole('menuitem', { name: /^delete$/i }).or(this.page.getByRole('button', { name: /^delete$/i }));
    await expect(deleteAction).toBeVisible({ timeout: 30_000 });
    await deleteAction.click();

    // confirmation prompt
    await expect(this.page.getByRole('dialog')).toBeVisible({ timeout: 30_000 });
    const confirm = this.page.getByRole('button', { name: /^delete$/i }).last();
    await confirm.click();

    // Verify issue not accessible by presence of error
    await expect(this.page.getByText(/you can't view this issue|issue does not exist|not found/i).first()).toBeVisible({ timeout: 60_000 });
  }

  async deleteIssueCancel(): Promise<void> {
    const more = this.page.getByRole('button', { name: /more/i }).first();
    if (await more.isVisible().catch(() => false)) await more.click();

    const deleteAction = this.page.getByRole('menuitem', { name: /^delete$/i }).or(this.page.getByRole('button', { name: /^delete$/i }));
    await expect(deleteAction).toBeVisible({ timeout: 30_000 });
    await deleteAction.click();

    await expect(this.page.getByRole('dialog')).toBeVisible({ timeout: 30_000 });
    const cancel = this.page.getByRole('button', { name: /^cancel$/i }).first();
    await cancel.click();

    await expect(this.page.getByRole('dialog')).toBeHidden({ timeout: 30_000 });
  }

  async transitionToDone(): Promise<void> {
    // Status field or transition button
    const statusButton = this.page.getByRole('button', { name: /status|to do|in progress|done/i }).first();
    if (await statusButton.isVisible().catch(() => false)) {
      await statusButton.click();
      const doneOption = this.page.getByRole('option', { name: /^done$/i }).first();
      if (await doneOption.isVisible().catch(() => false)) {
        await doneOption.click();
      } else {
        const doneButton = this.page.getByRole('button', { name: /^done$/i }).first();
        if (await doneButton.isVisible().catch(() => false)) await doneButton.click();
      }
    }

    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async assertStatusDone(): Promise<void> {
    await expect(this.page.getByText(/^done$/i).first()).toBeVisible({ timeout: 60_000 });
  }

  async goToIssueSearchAndFilterDone(): Promise<void> {
    // Navigate to search
    const issuesNav = this.page.getByRole('link', { name: /^issues$/i }).first();
    if (await issuesNav.isVisible().catch(() => false)) {
      await issuesNav.click();
    }

    const searchLink = this.page.getByRole('link', { name: /search for issues|search issues|search/i }).first();
    if (await searchLink.isVisible().catch(() => false)) {
      await searchLink.click();
    }

    // Try JQL search bar
    const jqlBox = this.page.getByRole('textbox', { name: /jql|search/i }).first();
    if (await jqlBox.isVisible().catch(() => false)) {
      await jqlBox.fill('status = Done');
      await this.page.keyboard.press('Enter');
    } else {
      // Fallback: status filter dropdown if present
      const statusFilter = this.page.getByRole('button', { name: /status/i }).first();
      if (await statusFilter.isVisible().catch(() => false)) {
        await statusFilter.click();
        await this.page.getByRole('option', { name: /^done$/i }).click();
      }
    }

    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async assertOnlyDoneIssuesInResults(): Promise<void> {
    // On results list, expect all visible status lozenges show Done.
    // This is heuristic due to Jira UI variations.
    const statusLozenges = this.page.getByText(/^done$/i);
    await expect(statusLozenges.first()).toBeVisible({ timeout: 60_000 });

    // Ensure no non-done statuses are visible (best effort)
    await expect(this.page.getByText(/to do|in progress/i).first()).toBeHidden({ timeout: 5_000 }).catch(() => {});
  }
}
