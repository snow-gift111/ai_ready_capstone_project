import { test, expect } from '@playwright/test';

import { testData } from './data/testData';
import { LoginPage } from './pages/LoginPage';
import { TaskPage } from './pages/TaskPage';
import { ensureEnv } from './utils/helpers';

test.describe('User Authentication', () => {
  test('Log in with valid Atlassian email and password', async ({ page }) => {
    await ensureEnv('APP_URL');
    const loginPage = new LoginPage(page);

    await loginPage.loginWithEnvCreds();

    // Assertions
    await expect(page).toHaveURL(/https:\/\/.*\.atlassian\.net\/.*/);
  });

  test('Show error message for invalid login credentials', async ({ page }) => {
    await ensureEnv('APP_URL');
    const loginPage = new LoginPage(page);

    await loginPage.gotoAtlassianLogin();
    const email = await ensureEnv('APP_EMAIL');
    await page.getByLabel(/email/i).fill(testData.jira.email || (process.env.APP_EMAIL ?? ''));
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByLabel(/password/i).waitFor({ state: 'visible', timeout: 30_000 });
    await page.getByLabel(/email/i).fill(email);
    await page.getByRole('button', { name: /^log in$/i }).click();

    await loginPage.expectInvalidCredentialsError();
    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Validate email field is required on login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoAtlassianLogin();

    // Leave email empty
    await page.getByRole('button', { name: /continue/i }).click();

    // Assertion: browser/atlassian validation
    await expect(page.getByText(/enter your email|email is required|required/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('Validate password field is required on login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoAtlassianLogin();

    await page.getByLabel(/email/i).fill(testData.jira.email || (process.env.APP_EMAIL ?? ''));
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByLabel(/password/i).waitFor({ state: 'visible', timeout: 30_000 });

    // Leave password empty
    await page.getByRole('button', { name: /^log in$/i }).click();
    const email = await ensureEnv('APP_EMAIL');
    await page.getByLabel(/email/i).fill(email);
    await expect(page.getByText(/enter your password|password is required|required/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('Log out successfully', async ({ page }) => {
    await ensureEnv('APP_URL');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithEnvCreds();
    await taskPage.gotoHome();
    await taskPage.logout();

    await expect(page).toHaveURL(/(id\.atlassian\.com\/login|.*atlassian\.net\/login|.*atlassian\.net\/logout)/i);
  });
});

test.describe('Create Task', () => {
  test('Create a new Jira issue with summary, description, and project assignment', async ({ page }) => {
    await ensureEnv('APP_URL');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithEnvCreds();
    await taskPage.gotoHome();

    await taskPage.openCreateIssue();
    const projectToUse = testData.jira.projectName;
    if (projectToUse) {
      await taskPage.selectProject(projectToUse);
    }
    await taskPage.fillSummary(testData.issues.create.summary);
    await taskPage.fillDescription(testData.issues.create.description);
    await taskPage.submitCreate();

    const issueKey = await taskPage.waitForCreatedIssueKey();
    await taskPage.openIssueByKey(issueKey);
    await taskPage.expectIssueSummary(testData.issues.create.summary);
    await taskPage.expectIssueDescription(testData.issues.create.description);

    if (projectToUse) {
      await expect(page.getByText(new RegExp(projectToUse, 'i')).first()).toBeVisible({ timeout: 30_000 });
    }
  });

  test('Issue type can be selected and supports Bug, Task, and Story', async ({ page }) => {
    await ensureEnv('APP_URL');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithEnvCreds();
    await taskPage.gotoHome();

    await taskPage.openCreateIssue();
    await taskPage.openIssueTypePicker();

    // Verify options include Bug, Task, Story
    await expect(page.getByRole('option', { name: /^bug$/i }).or(page.getByText(/^bug$/i))).toBeVisible();
    await expect(page.getByRole('option', { name: /^task$/i }).or(page.getByText(/^task$/i))).toBeVisible();
    await expect(page.getByRole('option', { name: /^story$/i }).or(page.getByText(/^story$/i))).toBeVisible();

    await taskPage.selectIssueType('Bug');
    await taskPage.selectIssueType('Task');
    await taskPage.selectIssueType('Story');
  });

  test('Show validation error when creating an issue with empty summary', async ({ page }) => {
    await ensureEnv('APP_URL');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithEnvCreds();
    await taskPage.gotoHome();

    await taskPage.openCreateIssue();
    const projectToUse = testData.jira.projectName;
    if (projectToUse) {
      await taskPage.selectProject(projectToUse);
    }

    // Leave summary empty
    await taskPage.submitCreate();

    await expect(page.getByText(/summary is required|required/i).first()).toBeVisible({ timeout: 10_000 });
    // issue not created: still in create dialog
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

test.describe('Edit Task', () => {
  test('Edit an existing issue (summary, description, issue type, priority) and save changes', async ({ page }) => {
    await ensureEnv('APP_URL');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithEnvCreds();
    await taskPage.gotoHome();

    // Ensure we have an editable issue: create one first
    await taskPage.openCreateIssue();
    await taskPage.fillSummary('Automation - Seed for edit');
    await taskPage.fillDescription('Automation - Seed description');
    await taskPage.submitCreate();
    const issueKey = await taskPage.waitForCreatedIssueKey();
    await taskPage.openIssueByKey(issueKey);

    await taskPage.startEdit();
    await taskPage.setEditSummary(testData.issues.edit.newSummary);
    await taskPage.setEditDescription(testData.issues.edit.newDescription);
    await taskPage.setEditIssueType(testData.issues.edit.newIssueType);
    await taskPage.setEditPriority(testData.issues.edit.newPriority);
    await taskPage.saveEdit();

    await taskPage.expectIssueSummary(testData.issues.edit.newSummary);
    await taskPage.expectIssueDescription(testData.issues.edit.newDescription);
    await expect(page.getByText(new RegExp(`^${testData.issues.edit.newIssueType}$`, 'i')).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(new RegExp(`^${testData.issues.edit.newPriority}$`, 'i')).first()).toBeVisible({ timeout: 30_000 });
  });

  test('Cancel editing an issue without saving changes', async ({ page }) => {
    await ensureEnv('APP_URL');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithEnvCreds();
    await taskPage.gotoHome();

    // Create seed issue with known values
    const originalSummary = 'Automation - Cancel edit original summary';
    const originalDescription = 'Automation - Cancel edit original description';

    await taskPage.openCreateIssue();
    await taskPage.fillSummary(originalSummary);
    await taskPage.fillDescription(originalDescription);
    await taskPage.submitCreate();
    const issueKey = await taskPage.waitForCreatedIssueKey();
    await taskPage.openIssueByKey(issueKey);

    await taskPage.startEdit();
    await taskPage.setEditSummary(testData.issues.cancelEdit.attemptedSummary);
    await taskPage.setEditDescription(testData.issues.cancelEdit.attemptedDescription);
    await taskPage.cancelEdit();

    await taskPage.expectIssueSummary(originalSummary);
    await taskPage.expectIssueDescription(originalDescription);
  });
});

test.describe('Delete Task', () => {
  test('Delete an existing issue after confirming deletion', async ({ page }) => {
    await ensureEnv('APP_URL');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithEnvCreds();
    await taskPage.gotoHome();

    // Create issue to delete
    await taskPage.openCreateIssue();
    await taskPage.fillSummary('Automation - Seed for delete');
    await taskPage.fillDescription('Automation - Delete me');
    await taskPage.submitCreate();
    const issueKey = await taskPage.waitForCreatedIssueKey();
    await taskPage.openIssueByKey(issueKey);

    await taskPage.initiateDelete();
    // Confirmation dialog shown
    await expect(page.getByRole('dialog').filter({ hasText: /delete/i })).toBeVisible();

    await taskPage.confirmDelete();

    // Not accessible
    await taskPage.expectIssueNotAccessible(issueKey);
  });

  test('Cancel issue deletion from the confirmation prompt', async ({ page }) => {
    await ensureEnv('APP_URL');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithEnvCreds();
    await taskPage.gotoHome();

    // Create issue to attempt delete
    await taskPage.openCreateIssue();
    await taskPage.fillSummary('Automation - Seed for cancel delete');
    await taskPage.fillDescription('Automation - Do not delete');
    await taskPage.submitCreate();
    const issueKey = await taskPage.waitForCreatedIssueKey();
    await taskPage.openIssueByKey(issueKey);

    await taskPage.initiateDelete();
    await taskPage.cancelDelete();

    // Issue remains accessible and visible
    await taskPage.openIssueByKey(issueKey);
    await expect(page.getByText(issueKey).first()).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('Mark Task as Completed', () => {
  test('Transition an issue to Done and verify visual indication', async ({ page }) => {
    await ensureEnv('APP_URL');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithEnvCreds();
    await taskPage.gotoHome();

    // Create issue then transition
    await taskPage.openCreateIssue();
    await taskPage.fillSummary('Automation - Seed for done');
    await taskPage.fillDescription('Automation - Mark as done');
    await taskPage.submitCreate();
    const issueKey = await taskPage.waitForCreatedIssueKey();
    await taskPage.openIssueByKey(issueKey);

    await taskPage.transitionToDone();

    // Visual done indication
    await expect(page.getByText(/^done$/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test('Filter to view only completed (Done) issues', async ({ page }) => {
    await ensureEnv('APP_URL');
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithEnvCreds();
    await taskPage.gotoHome();

    // Navigate to search/issues list that supports filtering.
    // Use Jira issue navigator: /issues/?jql=...
    await page.goto('/issues/?jql=status%20%3D%20Done', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/issues\/\?jql=/);

    // Expect only Done issues displayed: verify each status lozenge contains Done
    const statusCells = page.locator('[data-testid="issue.status"]');
    if ((await statusCells.count().catch(() => 0)) > 0) {
      const count = await statusCells.count();
      for (let i = 0; i < Math.min(count, 10); i++) {
        await expect(statusCells.nth(i)).toContainText(/done/i);
      }
    } else {
      // Fallback: presence of Done in results list and absence of common non-done statuses
      await expect(page.getByText(/done/i).first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/to do|in progress/i)).toHaveCount(0);
    }
  });
});
