import { expect, Page } from '@playwright/test';
import { getAppUrl } from '../utils/helpers';

export class TaskPage {
  public lastCreatedIssueKey: string | null = null;

  constructor(private readonly page: Page) {}

  async gotoHome(): Promise<void> {
    await this.page.goto(getAppUrl(), { waitUntil: 'domcontentloaded' });
  }

  // ---------- Create Issue ----------
  async openCreateIssue(): Promise<void> {
    // TODO: implement robust open create dialog
  }

  async fillCreateIssueForm(params: {
    project?: string;
    issueType?: string;
    summary?: string;
    description?: string;
  }): Promise<void> {
    // TODO: implement
  }

  async submitCreate(): Promise<void> {
    // TODO: implement
  }

  async expectIssueCreated(): Promise<void> {
    // TODO: implement and set lastCreatedIssueKey
  }

  // ---------- Open Issue ----------
  async openIssueByKey(issueKey: string): Promise<void> {
    const url = new URL(`/browse/${issueKey}`, getAppUrl()).toString();
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByText(issueKey)).toBeVisible();
  }

  async getIssueSummaryText(): Promise<string> {
    // TODO: implement
    return '';
  }

  // ---------- Edit Issue ----------
  async openEditIssue(): Promise<void> {
    // TODO: implement
  }

  async updateIssueFields(params: {
    summary?: string;
    description?: string;
    issueType?: string;
    priority?: string;
  }): Promise<void> {
    // TODO: implement
  }

  async saveEdit(): Promise<void> {
    // TODO: implement
  }

  async cancelEdit(): Promise<void> {
    // TODO: implement
  }

  // ---------- Delete Issue ----------
  async initiateDelete(): Promise<void> {
    // TODO: implement
  }

  async confirmDelete(): Promise<void> {
    // TODO: implement
  }

  async cancelDelete(): Promise<void> {
    // TODO: implement
  }

  async expectIssueDeleted(issueKey: string): Promise<void> {
    // TODO: implement
  }

  // ---------- Transition / Done ----------
  async transitionToDone(): Promise<void> {
    // TODO: implement
  }

  async expectStatusDone(): Promise<void> {
    // TODO: implement
  }

  // ---------- Search / Filter ----------
  async openIssuesWithJql(jql: string): Promise<void> {
    const url = new URL(`/issues/?jql=${encodeURIComponent(jql)}`, getAppUrl()).toString();
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async expectOnlyDoneIssuesVisible(): Promise<void> {
    // TODO: implement
  }
}
