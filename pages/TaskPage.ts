import { Page, Locator, expect } from '@playwright/test';
import { uniqueSuffix } from '../utils/helpers';

export class TaskPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async openCreateDialog(): Promise<void> {
    await this.page.getByRole('button', { name: /^create$/i }).click();
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }

  async createIssue(params: {
    project: string;
    issueType: string;
    summary: string;
    description: string;
  }): Promise<{ issueKey: string; summary: string }>
  {
    const summaryWithSuffix = `${params.summary} - ${uniqueSuffix()}`;

    await this.openCreateDialog();

    // Project
    const project = this.page.getByLabel(/project/i).first();
    await project.click();
    await this.page.getByRole('option', { name: new RegExp(params.project, 'i') }).click();

    // Issue type
    const issueType = this.page.getByLabel(/issue type/i).first();
    await issueType.click();
    await this.page.getByRole('option', { name: new RegExp(params.issueType, 'i') }).click();

    // Summary
    await this.page.getByLabel(/summary/i).fill(summaryWithSuffix);

    // Description can be a rich text editor; try label first, fall back to editable region.
    const descLabel = this.page.getByLabel(/description/i);
    if (await descLabel.count()) {
      await descLabel.fill(params.description);
    } else {
      await this.page.getByRole('textbox', { name: /description/i }).fill(params.description);
    }

    await this.page.getByRole('button', { name: /^create$/i }).click();

    // After create Jira shows a toast with issue key link.
    const createdLink = this.page.locator('a[href*="/browse/"]').first();
    await expect(createdLink).toBeVisible();
    const href = await createdLink.getAttribute('href');
    const issueKey = href?.match(/\/browse\/(\w+-\d+)/)?.[1] ?? '';
    return { issueKey, summary: summaryWithSuffix };
  }

  async openIssueByKey(baseUrl: string, issueKey: string): Promise<void> {
    await this.page.goto(`${baseUrl}/browse/${issueKey}`, { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(new RegExp(`/browse/${issueKey}$`));
  }

  async openEditDialog(): Promise<void> {
    await this.page.getByRole('button', { name: /^edit$/i }).click();
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }

  async saveEditDialog(): Promise<void> {
    await this.page.getByRole('button', { name: /^update$/i }).click();
    await expect(this.page.getByRole('dialog')).toBeHidden();
  }

  async cancelEditDialog(): Promise<void> {
    await this.page.getByRole('button', { name: /^cancel$/i }).click();
    await expect(this.page.getByRole('dialog')).toBeHidden();
  }

  async editIssue(params: {
    updatedSummary: string;
    updatedDescription: string;
    updatedIssueType: string;
    updatedPriority: string;
  }): Promise<void> {
    await this.openEditDialog();

    await this.page.getByLabel(/summary/i).fill(params.updatedSummary);

    const desc = this.page.getByLabel(/description/i);
    if (await desc.count()) {
      await desc.fill(params.updatedDescription);
    }

    // Issue type
    const issueType = this.page.getByLabel(/issue type/i).first();
    await issueType.click();
    await this.page.getByRole('option', { name: new RegExp(params.updatedIssueType, 'i') }).click();

    // Priority
    const priority = this.page.getByLabel(/priority/i).first();
    await priority.click();
    await this.page.getByRole('option', { name: new RegExp(params.updatedPriority, 'i') }).click();

    await this.saveEditDialog();
  }

  async deleteIssue(confirm: boolean): Promise<void> {
    // Open "More" menu
    const more = this.page.getByRole('button', { name: /more/i }).first();
    await more.click();
    await this.page.getByRole('menuitem', { name: /^delete$/i }).click();

    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    if (confirm) {
      await dialog.getByRole('button', { name: /^delete$/i }).click();
    } else {
      await dialog.getByRole('button', { name: /^cancel$/i }).click();
    }

    await expect(dialog).toBeHidden();
  }

  async transitionToDone(): Promise<void> {
    // Try common Jira transition button.
    const doneButton = this.page.getByRole('button', { name: /^done$/i });
    if (await doneButton.isVisible().catch(() => false)) {
      await doneButton.click();
      return;
    }

    // Fallback: status dropdown
    const statusButton = this.page.getByRole('button', { name: /to do|in progress|done/i }).first();
    await statusButton.click();
    await this.page.getByRole('menuitem', { name: /^done$/i }).click();
  }

  async assertStatusDone(): Promise<void> {
    await expect(this.page.getByText(/^done$/i).first()).toBeVisible();
  }
}
