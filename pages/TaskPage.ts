import { expect, Page } from '@playwright/test';
import { requireEnv, uniqueSuffix, waitForPageReady } from '../utils/helpers';

export class TaskPage {
  constructor(private readonly page: Page) {}

  async gotoJiraHome() {
    const baseUrl = requireEnv('APP_BASE_URL');
    await this.page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await waitForPageReady(this.page);
    await expect(this.page).toHaveURL(new RegExp(baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  createButton() {
    return this.page.getByRole('button', { name: /^create$/i }).first();
  }

  async openCreateIssue() {
    await this.gotoJiraHome();
    await this.createButton().click();
    // Modal/dialog should appear.
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }

  private projectField() {
    // In Jira create modal, project field often has label "Project"
    return this.page.getByLabel(/project/i).first();
  }

  private issueTypeField() {
    return this.page.getByLabel(/issue type/i).first();
  }

  private summaryField() {
    return this.page.getByLabel(/summary/i).first();
  }

  private descriptionField() {
    // Jira cloud uses rich text editor; fallback to placeholder.
    const byLabel = this.page.getByLabel(/description/i).first();
    return byLabel;
  }

  private createSubmitButton() {
    return this.page.getByRole('button', { name: /^create$/i }).last();
  }

  async selectIssueType(issueType: string) {
    await this.issueTypeField().click();
    await this.page.getByRole('option', { name: new RegExp(`^${issueType}$`, 'i') }).click();
  }

  async selectAnyProject() {
    // If project is preselected, nothing to do.
    const project = this.projectField();
    if (await project.isVisible()) {
      await project.click();
      // pick first available option if dropdown opens
      const firstOption = this.page.getByRole('option').first();
      if (await firstOption.isVisible().catch(() => false)) {
        await firstOption.click();
      }
    }
  }

  async fillSummary(summary: string) {
    await this.summaryField().fill(summary);
  }

  async fillDescription(description: string) {
    const desc = this.descriptionField();
    await desc.click();
    await desc.fill(description);
  }

  async submitCreateIssue() {
    await this.createSubmitButton().click();
  }

  async expectIssueCreatedToast() {
    await expect(this.page.getByText(/created|issue created/i).first()).toBeVisible();
  }

  async openMostRecentCreatedIssueFromToast(): Promise<void> {
    // Jira often shows toast with "created" and link to issue key.
    const link = this.page.getByRole('link').filter({ hasText: /[A-Z][A-Z0-9_]+-\d+/ }).first();
    await expect(link).toBeVisible();
    await link.click();
    await waitForPageReady(this.page);
  }

  async createIssue(params: { issueType: string; summary: string; description?: string }) {
    await this.openCreateIssue();
    await this.selectAnyProject();
    await this.selectIssueType(params.issueType);

    await this.fillSummary(`${params.summary} ${uniqueSuffix()}`);
    if (params.description) await this.fillDescription(params.description);

    await this.submitCreateIssue();
    await this.expectIssueCreatedToast();
    await this.openMostRecentCreatedIssueFromToast();
  }

  // ---- Issue View / Edit ----

  async openAnyIssueFromSearch() {
    await this.gotoJiraHome();
    // Navigate to "Issues" (may be in header nav)
    const issuesLink = this.page.getByRole('link', { name: /issues/i }).first();
    if (await issuesLink.isVisible().catch(() => false)) {
      await issuesLink.click();
      await waitForPageReady(this.page);
    }

    // Click first issue in a list (table/grid)
    const firstIssue = this.page.getByRole('link').filter({ hasText: /[A-Z][A-Z0-9_]+-\d+/ }).first();
    await expect(firstIssue).toBeVisible();
    await firstIssue.click();
    await waitForPageReady(this.page);
  }

  issueSummaryHeading() {
    // Issue view has summary as heading.
    return this.page.getByRole('heading').first();
  }

  async enterEditMode() {
    const editButton = this.page.getByRole('button', { name: /edit/i }).first();
    await expect(editButton).toBeVisible();
    await editButton.click();
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }

  private editSummaryField() {
    return this.page.getByLabel(/summary/i).first();
  }

  private editDescriptionField() {
    return this.page.getByLabel(/description/i).first();
  }

  private editIssueTypeField() {
    return this.page.getByLabel(/issue type/i).first();
  }

  private editPriorityField() {
    return this.page.getByLabel(/priority/i).first();
  }

  private saveButton() {
    return this.page.getByRole('button', { name: /^save$/i }).first();
  }

  private cancelButton() {
    return this.page.getByRole('button', { name: /^cancel$/i }).first();
  }

  async updateSummary(newSummary: string) {
    await this.editSummaryField().fill(newSummary);
  }

  async updateDescription(newDescription: string) {
    const desc = this.editDescriptionField();
    await desc.click();
    await desc.fill(newDescription);
  }

  async changeIssueType(newIssueType: string) {
    await this.editIssueTypeField().click();
    await this.page.getByRole('option', { name: new RegExp(`^${newIssueType}$`, 'i') }).click();
  }

  async changePriority(newPriority: string) {
    await this.editPriorityField().click();
    await this.page.getByRole('option', { name: new RegExp(`^${newPriority}$`, 'i') }).click();
  }

  async saveEdit() {
    await this.saveButton().click();
    await waitForPageReady(this.page);
  }

  async cancelEdit() {
    await this.cancelButton().click();
    await expect(this.page.getByRole('dialog')).toBeHidden();
  }

  async expectSummaryValue(expected: string) {
    await expect(this.page.getByText(expected).first()).toBeVisible();
  }

  async expectIssueTypeValue(expected: string) {
    await expect(this.page.getByText(new RegExp(`^${expected}$`, 'i')).first()).toBeVisible();
  }

  async expectPriorityValue(expected: string) {
    await expect(this.page.getByText(new RegExp(`^${expected}$`, 'i')).first()).toBeVisible();
  }

  // ---- Delete ----

  async initiateDelete() {
    // Try "..." more actions
    const moreButton = this.page.getByRole('button', { name: /more|actions|\.\.\./i }).first();
    if (await moreButton.isVisible().catch(() => false)) {
      await moreButton.click();
    }

    const deleteItem = this.page.getByRole('menuitem', { name: /delete/i }).first();
    if (await deleteItem.isVisible().catch(() => false)) {
      await deleteItem.click();
    } else {
      // fallback button
      await this.page.getByRole('button', { name: /delete/i }).first().click();
    }

    // Confirmation dialog
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }

  async confirmDelete() {
    const confirm = this.page.getByRole('button', { name: /^delete$/i }).first();
    await expect(confirm).toBeVisible();
    await confirm.click();
  }

  async cancelDelete() {
    const cancel = this.page.getByRole('button', { name: /cancel/i }).first();
    await expect(cancel).toBeVisible();
    await cancel.click();
    await expect(this.page.getByRole('dialog')).toBeHidden();
  }

  async expectDeletedNotAccessible() {
    // After deletion Jira often shows an error page or toast.
    await expect(this.page.getByText(/does not exist|not found|can\u2019t find|has been deleted/i).first()).toBeVisible();
  }

  // ---- Status / Done ----

  async transitionStatusToDone() {
    // Status button often present as "To Do"/"In Progress" etc.
    const statusButton = this.page.getByRole('button', { name: /to do|in progress|done|status/i }).first();
    await expect(statusButton).toBeVisible();
    await statusButton.click();
    const doneOption = this.page.getByRole('option', { name: /^done$/i }).first();
    if (await doneOption.isVisible().catch(() => false)) {
      await doneOption.click();
    } else {
      // sometimes menuitem
      await this.page.getByRole('menuitem', { name: /^done$/i }).first().click();
    }
    await waitForPageReady(this.page);
  }

  async expectStatusDoneVisual() {
    await expect(this.page.getByText(/^done$/i).first()).toBeVisible();
  }

  // ---- Filtering ----

  async gotoIssueSearch() {
    const baseUrl = requireEnv('APP_BASE_URL');
    // Common Jira issue search path
    await this.page.goto(`${baseUrl}/issues/`, { waitUntil: 'domcontentloaded' });
    await waitForPageReady(this.page);
  }

  async applyDoneFilter() {
    // Try filter field / JQL input.
    const searchField = this.page.getByRole('textbox', { name: /search|jql/i }).first();
    if (await searchField.isVisible().catch(() => false)) {
      await searchField.fill('status = Done');
      await searchField.press('Enter');
    } else {
      // fallback: filter button
      const filterButton = this.page.getByRole('button', { name: /filter/i }).first();
      await filterButton.click();
      await this.page.getByRole('menuitem', { name: /done/i }).first().click();
    }
    await waitForPageReady(this.page);
  }

  async expectOnlyDoneIssuesInResults() {
    // This is heuristic: ensure at least one "Done" appears in the results area and that other known statuses not present.
    const results = this.page.locator('main');
    await expect(results.getByText(/^done$/i).first()).toBeVisible();
    await expect(results.getByText(/to do|in progress/i).first()).toBeHidden();
  }
}
