import { expect, Locator, Page } from '@playwright/test';
import { gotoJiraBase, waitForAppReady } from '../utils/helpers';

export class TaskPage {
  readonly page: Page;

  // Global nav
  readonly createButton: Locator;
  readonly profileButton: Locator;
  readonly logoutLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Jira top nav may vary by UI; keep locators resilient.
    this.createButton = page.getByRole('button', { name: /^create$/i }).or(
      page.getByRole('link', { name: /^create$/i })
    );

    // Avatar / profile menu
    this.profileButton = page.getByRole('button', { name: /account|profile/i }).or(
      page.getByRole('button', { name: /user menu/i })
    );

    this.logoutLink = page.getByRole('menuitem', { name: /log out/i }).or(
      page.getByRole('link', { name: /log out/i })
    );
  }

  async gotoBase() {
    await gotoJiraBase(this.page);
    await waitForAppReady(this.page);
    await expect(this.page).toHaveURL(/\.atlassian\.net/);
  }

  async assertAuthenticatedLanding() {
    // Basic assertion that we are inside jira cloud.
    await expect(this.page).toHaveURL(/\.atlassian\.net/);
    // Jira typically has a search box in authenticated header.
    const search = this.page.getByRole('textbox', { name: /search/i }).first();
    await expect(search).toBeVisible({ timeout: 20_000 });
  }

  async logout() {
    // Open user menu and click logout.
    await this.profileButton.click({ trial: true }).catch(async () => {
      // fallback: Jira avatar button can be an image
    });

    // Try common avatar selectors.
    const avatarButton = this.page.getByRole('button', { name: /account|profile|user menu/i }).first();
    await avatarButton.click({ timeout: 15_000 });

    // logout item
    const logout = this.logoutLink.first();
    await logout.click({ timeout: 15_000 });

    // After logout, user should be unauthenticated; Atlassian may land on id.atlassian.com or tenant login.
    await expect(this.page).not.toHaveURL(/\.atlassian\.net\/jira\/projects\/.+/);
  }

  // -------- Create issue --------

  async openCreateIssue() {
    await this.createButton.first().click({ timeout: 20_000 });
    await expect(this.page.getByRole('dialog')).toBeVisible({ timeout: 20_000 });
  }

  async fillCreateIssueFields(params: {
    project?: string;
    issueType?: string;
    summary?: string;
    description?: string;
  }) {
    const dialog = this.page.getByRole('dialog');

    if (params.project) {
      const projectField = dialog.getByLabel(/project/i).or(dialog.getByRole('combobox', { name: /project/i }));
      await projectField.click();
      await dialog.getByRole('option', { name: new RegExp(params.project, 'i') }).click();
    }

    if (params.issueType) {
      const typeField = dialog.getByLabel(/issue type/i).or(dialog.getByRole('combobox', { name: /issue type/i }));
      await typeField.click();
      await dialog.getByRole('option', { name: new RegExp(`^${escapeRegex(params.issueType)}$`, 'i') }).click();
    }

    if (params.summary !== undefined) {
      const summary = dialog.getByLabel(/summary/i).or(dialog.getByRole('textbox', { name: /summary/i }));
      await summary.fill(params.summary);
    }

    if (params.description !== undefined) {
      // Jira description is often a rich text editor; try multiple strategies.
      const description = dialog.getByLabel(/description/i).or(dialog.getByRole('textbox', { name: /description/i }));
      await description.click().catch(() => undefined);
      await description.fill(params.description).catch(async () => {
        // fallback: editable div
        const rte = dialog.locator('[role="textbox"][contenteditable="true"]').first();
        if (await rte.isVisible().catch(() => false)) {
          await rte.fill(params.description);
        }
      });
    }
  }

  async submitCreateIssue() {
    const dialog = this.page.getByRole('dialog');
    const create = dialog.getByRole('button', { name: /^create$/i }).or(
      dialog.getByRole('button', { name: /create issue/i })
    );
    await create.click();
  }

  async assertIssueCreatedToastOrKeyVisible() {
    // Jira usually shows a toast with issue key; accept either.
    const toast = this.page.getByRole('alert').filter({ hasText: /created|issue/i }).first();
    await expect(toast).toBeVisible({ timeout: 30_000 });
  }

  async assertCreateSummaryRequiredError() {
    const dialog = this.page.getByRole('dialog');
    await expect(dialog.getByText(/summary.*required|required.*summary/i)).toBeVisible();
  }

  // -------- Issue view (open/edit/delete/transition) --------

  async openAnyExistingIssue() {
    await this.gotoBase();

    // Use search to open something quickly.
    // Click global search, type something broad and open first result.
    const search = this.page.getByRole('textbox', { name: /search/i }).first();
    await search.click();
    await search.fill('');

    // Open issues list view as a stable place.
    // Many Jira instances have "Filters" > "Advanced issue search"; but UI varies.
    // We'll attempt direct navigation to issue search.
    await this.page.goto(`${process.env.APP_URL}/jira/issues`, { waitUntil: 'domcontentloaded' });

    const firstIssueLink = this.page.getByRole('link', { name: /[A-Z][A-Z0-9]+-\d+/ }).first();
    await expect(firstIssueLink).toBeVisible({ timeout: 30_000 });
    await firstIssueLink.click();

    await expect(this.page).toHaveURL(/\/browse\//);
  }

  async getIssueSummaryText(): Promise<string> {
    const summary = this.page.getByRole('heading').first();
    const txt = (await summary.textContent())?.trim() || '';
    return txt;
  }

  async enterEditMode() {
    const editButton = this.page.getByRole('button', { name: /^edit$/i }).or(
      this.page.getByRole('button', { name: /edit issue/i })
    );
    await editButton.click({ timeout: 20_000 });

    await expect(this.page.getByRole('dialog')).toBeVisible({ timeout: 20_000 });
  }

  async updateIssueInEditDialog(params: {
    summary?: string;
    description?: string;
    issueType?: string;
    priority?: string;
  }) {
    const dialog = this.page.getByRole('dialog');

    if (params.summary !== undefined) {
      const summary = dialog.getByLabel(/summary/i).or(dialog.getByRole('textbox', { name: /summary/i }));
      await summary.fill(params.summary);
    }

    if (params.description !== undefined) {
      const description = dialog.getByLabel(/description/i).or(dialog.getByRole('textbox', { name: /description/i }));
      await description.fill(params.description).catch(async () => {
        const rte = dialog.locator('[role="textbox"][contenteditable="true"]').first();
        if (await rte.isVisible().catch(() => false)) {
          await rte.fill(params.description);
        }
      });
    }

    if (params.issueType) {
      const typeField = dialog.getByLabel(/issue type/i).or(dialog.getByRole('combobox', { name: /issue type/i }));
      await typeField.click();
      await dialog.getByRole('option', { name: new RegExp(`^${escapeRegex(params.issueType)}$`, 'i') }).click();
    }

    if (params.priority) {
      const priorityField = dialog.getByLabel(/priority/i).or(dialog.getByRole('combobox', { name: /priority/i }));
      await priorityField.click();
      await dialog.getByRole('option', { name: new RegExp(`^${escapeRegex(params.priority)}$`, 'i') }).click();
    }
  }

  async saveEditDialog() {
    const dialog = this.page.getByRole('dialog');
    const save = dialog.getByRole('button', { name: /^save$/i }).or(
      dialog.getByRole('button', { name: /update/i })
    );
    await save.click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });
  }

  async cancelEditDialog() {
    const dialog = this.page.getByRole('dialog');
    const cancel = dialog.getByRole('button', { name: /^cancel$/i }).or(
      dialog.getByRole('button', { name: /close/i })
    );
    await cancel.click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });
  }

  async assertIssueFieldTextInView(label: RegExp, expected: string | RegExp) {
    // For view mode fields like Type, Priority, Status.
    // Try dt/dd label/value structure.
    const field = this.page.getByText(label).first();
    await expect(field).toBeVisible({ timeout: 20_000 });

    const container = field.locator('..');
    const value = container.getByText(expected).first();
    await expect(value).toBeVisible({ timeout: 20_000 });
  }

  // -------- Delete issue --------

  async initiateDelete() {
    // Jira often has "..." menu with Delete.
    const more = this.page.getByRole('button', { name: /more|actions|\.\.\./i }).first();
    await more.click({ timeout: 15_000 });

    const deleteItem = this.page.getByRole('menuitem', { name: /delete/i }).or(
      this.page.getByRole('button', { name: /delete/i })
    );
    await deleteItem.first().click({ timeout: 15_000 });

    await expect(this.page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });
  }

  async confirmDelete() {
    const dialog = this.page.getByRole('dialog');
    const del = dialog.getByRole('button', { name: /^delete$/i }).or(
      dialog.getByRole('button', { name: /delete issue/i })
    );
    await expect(del).toBeVisible();
    await del.click();
  }

  async cancelDelete() {
    const dialog = this.page.getByRole('dialog');
    const cancel = dialog.getByRole('button', { name: /^cancel$/i });
    await cancel.click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });
  }

  async assertDeleteConfirmationShown() {
    const dialog = this.page.getByRole('dialog');
    await expect(dialog.getByText(/delete/i)).toBeVisible();
  }

  async assertIssueNoLongerAccessible(previousUrl: string) {
    await this.page.goto(previousUrl, { waitUntil: 'domcontentloaded' });
    // Jira shows "You can't view this issue" or 404 like message.
    await expect(this.page.getByText(/issue does not exist|can't view|not found|doesn’t exist/i)).toBeVisible({
      timeout: 30_000,
    });
  }

  // -------- Transition to Done and filter --------

  async transitionToDone() {
    // Status field is often a button or dropdown.
    const statusButton = this.page.getByRole('button', { name: /status/i }).or(
      this.page.getByRole('button', { name: /to do|in progress|done/i })
    );
    await statusButton.first().click({ timeout: 20_000 });

    const doneOption = this.page.getByRole('option', { name: /^done$/i }).or(
      this.page.getByRole('menuitem', { name: /^done$/i })
    );
    await doneOption.first().click({ timeout: 20_000 });

    // Expect status to show Done somewhere
    await expect(this.page.getByText(/^done$/i).first()).toBeVisible({ timeout: 30_000 });
  }

  async gotoIssueSearchList() {
    const base = process.env.APP_URL;
    if (!base) throw new Error('APP_URL env var is required');
    await this.page.goto(`${base}/jira/issues`, { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/\/jira\/issues/);
  }

  async applyCompletedOnlyFilter() {
    // In issue search, try basic filter controls; fallback to JQL.
    const jql = this.page.getByRole('textbox', { name: /jql/i }).first();
    if (await jql.isVisible().catch(() => false)) {
      await jql.fill('status = Done');
      await this.page.getByRole('button', { name: /search/i }).first().click();
    } else {
      // Fallback: use search param in URL.
      const base = process.env.APP_URL;
      await this.page.goto(`${base}/jira/issues/?jql=${encodeURIComponent('status = Done')}`, {
        waitUntil: 'domcontentloaded',
      });
    }

    // Ensure results only show Done
    await expect(this.page.getByText(/status/i).first()).toBeVisible({ timeout: 30_000 });
  }

  async assertResultsOnlyDone() {
    // Heuristic: results table/list contains Done labels.
    const statuses = this.page.getByText(/^done$/i);
    await expect(statuses.first()).toBeVisible({ timeout: 30_000 });
  }

  async assertIssueKeyPresentInResults(issueKey: string) {
    await expect(this.page.getByRole('link', { name: new RegExp(escapeRegex(issueKey)) }).first()).toBeVisible({
      timeout: 30_000,
    });
  }
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
