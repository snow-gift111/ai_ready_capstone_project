import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { TaskPage } from './pages/TaskPage';
import { testData } from './data/testData';
import { requireEnv, uniqueSummary, assertLoggedOut } from './utils/helpers';

const appUrl = process.env.APP_URL;

test.describe('User Authentication', () => {
  test('Log in successfully with valid Atlassian email and password', async ({ page }) => {
    // Inputs
    const jiraUrl = appUrl ?? requireEnv('APP_URL');

    // Steps
    const login = new LoginPage(page);
    await login.loginWithEnvCredentials(jiraUrl);

    // Assertions
    await expect(page).toHaveURL(/atlassian\.net/);
    await expect(page.locator('body')).toContainText(/Jira|Projects|Your work|Dashboards/i);
  });

  test('Show error message for invalid login credentials', async ({ page }) => {
    const login = new LoginPage(page);
    const email = process.env.APP_EMAIL ?? testData.auth.emailFallback;

    await login.gotoAtlassianLogin();
    await login.enterEmail(email);
    await login.clickContinue();
    await login.waitForPasswordField();
    await login.enterPassword(testData.auth.invalidPassword);
    await login.clickLogin();

    await login.assertInvalidCredentialsError();
    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Validate email is required on login', async ({ page }) => {
    const login = new LoginPage(page);
    await login.gotoAtlassianLogin();

    // Leave email empty, click continue
    await login.enterEmail('');
    await login.clickContinue();

    await login.assertEmailRequired();
    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Validate password is required on login', async ({ page }) => {
    const login = new LoginPage(page);
    const email = process.env.APP_EMAIL ?? testData.auth.emailFallback;
    await login.gotoAtlassianLogin();

    await login.enterEmail(email);
    await login.clickContinue();
    await login.waitForPasswordField();

    // Leave password empty then click log in
    await login.enterPassword('');
    await login.clickLogin();

    await expect(page.locator('body')).toContainText(/password.*required|enter.*password/i);
    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Log out successfully from an authenticated session', async ({ page }) => {
    const jiraUrl = appUrl ?? requireEnv('APP_URL');
    const login = new LoginPage(page);
    await login.loginWithEnvCredentials(jiraUrl);

    // Open user menu/avatar
    const avatar = page
      .getByRole('button', { name: /account|profile|user/i })
      .or(page.locator('[data-testid="profile-avatar"]'))
      .or(page.locator('button[aria-label*="Account"], button[aria-label*="Profile"]').first());
    await avatar.click();

    // Logout
    const logout = page.getByRole('menuitem', { name: /log out/i }).or(page.getByRole('button', { name: /log out/i }));
    await logout.click();

    await assertLoggedOut(page);
  });
});

test.describe('Create Task', () => {
  test('Create a new Jira issue with summary, issue type, description, and project', async ({ page }) => {
    const jiraUrl = appUrl ?? requireEnv('APP_URL');
    const login = new LoginPage(page);
    await login.loginWithEnvCredentials(jiraUrl);

    const task = new TaskPage(page);
    const summary = uniqueSummary(testData.create.summary!);
    const issueKey = await task.createIssue(jiraUrl, {
      project: testData.create.project!,
      issueType: testData.create.issueType!,
      summary,
      description: testData.create.description!
    });

    await task.openIssueByKey(jiraUrl, issueKey);
    await expect(page.locator('body')).toContainText(new RegExp(issueKey));
    await expect(page.locator('body')).toContainText(new RegExp(summary));
    await expect(page.locator('body')).toContainText(new RegExp(testData.create.description!, 'i'));
    await expect(page.locator('body')).toContainText(new RegExp(testData.create.issueType!, 'i'));
  });

  test('Show validation error when creating an issue with empty summary', async ({ page }) => {
    const jiraUrl = appUrl ?? requireEnv('APP_URL');
    const login = new LoginPage(page);
    await login.loginWithEnvCredentials(jiraUrl);

    const task = new TaskPage(page);
    await task.gotoJiraBase(jiraUrl);
    await task.openCreateIssue();
    await task.setProject(testData.createEmptySummary.project!);
    await task.setIssueType(testData.createEmptySummary.issueType!);
    // leave summary empty
    await task.submitCreate();

    await task.assertSummaryValidationError();
  });

  test('Verify issue type selection supports Bug, Task, and Story', async ({ page }) => {
    const jiraUrl = appUrl ?? requireEnv('APP_URL');
    const login = new LoginPage(page);
    await login.loginWithEnvCredentials(jiraUrl);

    const task = new TaskPage(page);
    await task.gotoJiraBase(jiraUrl);
    await task.openCreateIssue();

    await task.setIssueType('Bug');
    await expect(page.locator('body')).toContainText(/bug/i);

    await task.setIssueType('Task');
    await expect(page.locator('body')).toContainText(/task/i);

    await task.setIssueType('Story');
    await expect(page.locator('body')).toContainText(/story/i);
  });
});

test.describe('Edit Task', () => {
  test('Edit an existing issue: update summary, description, issue type, and priority', async ({ page }) => {
    const jiraUrl = appUrl ?? requireEnv('APP_URL');
    const login = new LoginPage(page);
    await login.loginWithEnvCredentials(jiraUrl);

    const task = new TaskPage(page);
    // Ensure an issue exists by creating one.
    const seedKey = await task.createIssue(jiraUrl, {
      project: testData.create.project!,
      issueType: 'Task',
      summary: uniqueSummary('Seed issue for edit'),
      description: 'Seed description'
    });
    await task.openIssueByKey(jiraUrl, seedKey);

    await task.editIssue({
      updatedSummary: uniqueSummary(testData.edit.updatedSummary!),
      updatedDescription: testData.edit.updatedDescription!,
      updatedIssueType: testData.edit.updatedIssueType!,
      updatedPriority: testData.edit.updatedPriority!
    });

    // Assertions (best-effort text assertions)
    await expect(page.locator('body')).toContainText(new RegExp(testData.edit.updatedDescription!, 'i'));
    await expect(page.locator('body')).toContainText(new RegExp(testData.edit.updatedIssueType!, 'i'));
    await expect(page.locator('body')).toContainText(new RegExp(testData.edit.updatedPriority!, 'i'));
  });

  test('Cancel editing without saving changes', async ({ page }) => {
    const jiraUrl = appUrl ?? requireEnv('APP_URL');
    const login = new LoginPage(page);
    await login.loginWithEnvCredentials(jiraUrl);

    const task = new TaskPage(page);
    const seedSummary = uniqueSummary('Seed issue for cancel edit');
    const seedKey = await task.createIssue(jiraUrl, {
      project: testData.create.project!,
      issueType: 'Task',
      summary: seedSummary,
      description: 'Seed description'
    });
    await task.openIssueByKey(jiraUrl, seedKey);

    // Enter summary edit, type new value, then cancel (ESC)
    const summaryHeading = page
      .getByTestId('issue.views.issue-base.foundation.summary.heading')
      .or(page.getByRole('heading', { level: 1 }));
    await summaryHeading.click();
    const summaryInput = page.getByRole('textbox', { name: /summary/i }).or(page.locator('input[name="summary"]'));
    await expect(summaryInput).toBeVisible();
    await summaryInput.fill(testData.cancelEdit.unsavedSummary);
    await page.keyboard.press('Escape');

    // Assert original remains
    await expect(page.locator('body')).toContainText(seedSummary);
    await expect(page.locator('body')).not.toContainText(testData.cancelEdit.unsavedSummary);
  });
});

test.describe('Delete Task', () => {
  test('Delete an existing issue after confirming deletion', async ({ page }) => {
    const jiraUrl = appUrl ?? requireEnv('APP_URL');
    const login = new LoginPage(page);
    await login.loginWithEnvCredentials(jiraUrl);

    const task = new TaskPage(page);
    const key = await task.createIssue(jiraUrl, {
      project: testData.create.project!,
      issueType: 'Task',
      summary: uniqueSummary('Seed issue for delete'),
      description: 'Seed description'
    });
    await task.openIssueByKey(jiraUrl, key);

    await task.deleteIssueConfirm();

    // Verify deleted issue no longer accessible
    await page.goto(`${jiraUrl}/browse/${key}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/issue does not exist|you can't view this issue|not found/i);
  });

  test('Cancel deletion from the confirmation prompt', async ({ page }) => {
    const jiraUrl = appUrl ?? requireEnv('APP_URL');
    const login = new LoginPage(page);
    await login.loginWithEnvCredentials(jiraUrl);

    const task = new TaskPage(page);
    const key = await task.createIssue(jiraUrl, {
      project: testData.create.project!,
      issueType: 'Task',
      summary: uniqueSummary('Seed issue for cancel delete'),
      description: 'Seed description'
    });
    await task.openIssueByKey(jiraUrl, key);

    await task.deleteIssueCancel();

    // Issue should remain accessible
    await expect(page).toHaveURL(new RegExp(`/browse/${key}$`));
    await expect(page.locator('body')).toContainText(new RegExp(key));
  });
});

test.describe('Mark Task as Completed', () => {
  test('Transition an issue to Done and verify visual indication', async ({ page }) => {
    const jiraUrl = appUrl ?? requireEnv('APP_URL');
    const login = new LoginPage(page);
    await login.loginWithEnvCredentials(jiraUrl);

    const task = new TaskPage(page);
    const key = await task.createIssue(jiraUrl, {
      project: testData.create.project!,
      issueType: 'Task',
      summary: uniqueSummary('Seed issue for Done'),
      description: 'Seed description'
    });
    await task.openIssueByKey(jiraUrl, key);

    await task.transitionToDone();

    await expect(page.locator('body')).toContainText(/done/i);
  });

  test('Filter to view only completed (Done) issues', async ({ page }) => {
    const jiraUrl = appUrl ?? requireEnv('APP_URL');
    const login = new LoginPage(page);
    await login.loginWithEnvCredentials(jiraUrl);

    const task = new TaskPage(page);
    await task.filterDoneIssues(jiraUrl);
    await task.assertOnlyDoneIssuesVisible();
  });

  test('Filter completed issues when no issues are in Done status', async ({ page }) => {
    const jiraUrl = appUrl ?? requireEnv('APP_URL');
    const login = new LoginPage(page);
    await login.loginWithEnvCredentials(jiraUrl);

    const task = new TaskPage(page);
    // Use a JQL that is very likely to yield no results (done + future date)
    await page.goto(`${jiraUrl}/issues/?jql=status%20%3D%20Done%20AND%20created%20%3E%20startOfDay(%22+365d%22)`, {
      waitUntil: 'domcontentloaded'
    });
    await task.assertEmptyStateForNoResults();
  });
});