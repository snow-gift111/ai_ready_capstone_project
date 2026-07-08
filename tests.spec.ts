import { test, expect } from '@playwright/test';
import { testData } from './data/testData';
import { LoginPage } from './pages/LoginPage';
import { TaskPage } from './pages/TaskPage';
import { requireEnv, waitForJiraApp } from './utils/helpers';

test.describe('Jira Task Management', () => {
  test('Log in successfully with valid Atlassian email and password', async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(testData.app.url, requireEnv('APP_EMAIL', testData.app.email), requireEnv('APP_PASSWORD', testData.app.password));

    await waitForJiraApp(page);
    await expect(page).not.toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Show error message for invalid login credentials', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto(testData.app.url);
    await login.submitEmail(testData.app.email);
    await login.submitPassword(testData.auth.invalidPassword);

    await expect(login.errorMessage()).toBeVisible();
    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Validate email field is required (empty email)', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto(testData.app.url);

    await login.emailInput.fill('');
    await login.continueButton.click();

    await expect(login.errorMessage()).toBeVisible();
    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Validate password field is required (empty password)', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto(testData.app.url);

    await login.submitEmail(testData.app.email);

    await login.passwordInput().fill('');
    await login.loginButton().click();

    await expect(login.errorMessage()).toBeVisible();
    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Log out successfully from an authenticated session', async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(testData.app.url, requireEnv('APP_EMAIL', testData.app.email), requireEnv('APP_PASSWORD', testData.app.password));
    await waitForJiraApp(page);

    // Open profile menu (avatar button) and log out.
    const profileButton = page
      .getByRole('button', { name: /account|profile/i })
      .first()
      .or(
        page
          .locator(
            'button[aria-label*="Account"], button[aria-label*="Profile"], button[aria-label*="account"], button[aria-label*="profile"], [data-testid="header-profile-menu"]'
          )
          .first()
      );
    await profileButton.click();

    await page.getByRole('menuitem', { name: /log out/i }).click();

    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Create a new Jira issue with summary, issue type, description, and project', async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(testData.app.url, requireEnv('APP_EMAIL', testData.app.email), requireEnv('APP_PASSWORD', testData.app.password));
    await waitForJiraApp(page);

    const task = new TaskPage(page);
    const created = await task.createIssue({
      project: testData.app.projectName,
      issueType: testData.issue.create.issueType,
      summary: testData.issue.create.summary,
      description: testData.issue.create.description,
    });

    // Open created issue and assert key fields are present.
    if (created.issueKey) {
      await task.openIssueByKey(testData.app.url, created.issueKey);
    }

    await expect(page.getByText(created.summary, { exact: false })).toBeVisible();
    await expect(page.getByText(new RegExp(testData.issue.create.description, 'i'))).toBeVisible();
  });

  test('Show validation error when creating an issue with empty summary', async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(testData.app.url, requireEnv('APP_EMAIL', testData.app.email), requireEnv('APP_PASSWORD', testData.app.password));
    await waitForJiraApp(page);

    const task = new TaskPage(page);
    await task.openCreateDialog();

    // Project
    const project = page.getByLabel(/project/i).first();
    await project.click();
    await page.getByRole('option', { name: new RegExp(testData.app.projectName, 'i') }).click();

    // Issue type
    const issueType = page.getByLabel(/issue type/i).first();
    await issueType.click();
    await page.getByRole('option', { name: new RegExp(testData.issue.createNegative.issueType, 'i') }).click();

    // Leave summary empty and submit
    await page.getByRole('button', { name: /^create$/i }).click();

    await expect(page.getByText(/summary.*required|required.*summary/i)).toBeVisible();
  });

  test('Edit an existing issue (summary, description, issue type, priority) and save changes', async ({ page }) => {
    const issueKey = requireEnv('APP_EXISTING_ISSUE_KEY', testData.app.existingIssueKey);

    const login = new LoginPage(page);
    await login.login(testData.app.url, requireEnv('APP_EMAIL', testData.app.email), requireEnv('APP_PASSWORD', testData.app.password));
    await waitForJiraApp(page);

    const task = new TaskPage(page);
    await task.openIssueByKey(testData.app.url, issueKey);

    await task.editIssue({
      updatedSummary: testData.issue.edit.updatedSummary,
      updatedDescription: testData.issue.edit.updatedDescription,
      updatedIssueType: testData.issue.edit.updatedIssueType,
      updatedPriority: testData.issue.edit.updatedPriority,
    });

    await expect(page.getByText(new RegExp(testData.issue.edit.updatedSummary, 'i'))).toBeVisible();
    await expect(page.getByText(new RegExp(testData.issue.edit.updatedDescription, 'i'))).toBeVisible();
    await expect(page.getByText(new RegExp(testData.issue.edit.updatedPriority, 'i'))).toBeVisible();
  });

  test('Cancel editing an issue without saving changes', async ({ page }) => {
    const issueKey = requireEnv('APP_EXISTING_ISSUE_KEY', testData.app.existingIssueKey);

    const login = new LoginPage(page);
    await login.login(testData.app.url, requireEnv('APP_EMAIL', testData.app.email), requireEnv('APP_PASSWORD', testData.app.password));
    await waitForJiraApp(page);

    const task = new TaskPage(page);
    await task.openIssueByKey(testData.app.url, issueKey);

    // Capture original summary text (best effort)
    const summaryHeading = page.getByRole('heading').first();
    const originalSummary = (await summaryHeading.textContent())?.trim() ?? '';

    await task.openEditDialog();
    await page.getByLabel(/summary/i).fill(testData.issue.edit.temporarySummaryChange);
    await task.cancelEditDialog();

    if (originalSummary) {
      await expect(page.getByText(originalSummary)).toBeVisible();
    }
    await expect(page.getByText(testData.issue.edit.temporarySummaryChange)).not.toBeVisible();
  });

  test('Delete an existing issue after confirming deletion', async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(testData.app.url, requireEnv('APP_EMAIL', testData.app.email), requireEnv('APP_PASSWORD', testData.app.password));
    await waitForJiraApp(page);

    const task = new TaskPage(page);

    // Create a disposable issue to delete.
    const created = await task.createIssue({
      project: testData.app.projectName,
      issueType: 'Task',
      summary: 'Delete issue - automation test',
      description: 'Disposable issue for delete test',
    });

    if (!created.issueKey) {
      test.skip(true, 'Could not capture created issue key from UI.');
    }

    await task.openIssueByKey(testData.app.url, created.issueKey);
    await task.deleteIssue(true);

    // Verify issue no longer accessible.
    await page.goto(`${testData.app.url}/browse/${created.issueKey}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/you don't have access|issue does not exist|we can't find/i)).toBeVisible();
  });

  test('Cancel deletion when confirmation is shown', async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(testData.app.url, requireEnv('APP_EMAIL', testData.app.email), requireEnv('APP_PASSWORD', testData.app.password));
    await waitForJiraApp(page);

    const task = new TaskPage(page);

    // Create a disposable issue to attempt deletion.
    const created = await task.createIssue({
      project: testData.app.projectName,
      issueType: 'Task',
      summary: 'Cancel delete - automation test',
      description: 'Disposable issue for cancel delete test',
    });

    if (!created.issueKey) {
      test.skip(true, 'Could not capture created issue key from UI.');
    }

    await task.openIssueByKey(testData.app.url, created.issueKey);
    await task.deleteIssue(false);

    await expect(page).toHaveURL(new RegExp(`/browse/${created.issueKey}$`));
    await expect(page.getByText(created.summary, { exact: false })).toBeVisible();
  });

  test('Transition an issue status to Done and verify visual indication', async ({ page }) => {
    const issueKey = requireEnv('APP_EXISTING_ISSUE_KEY', testData.app.existingIssueKey);

    const login = new LoginPage(page);
    await login.login(testData.app.url, requireEnv('APP_EMAIL', testData.app.email), requireEnv('APP_PASSWORD', testData.app.password));
    await waitForJiraApp(page);

    const task = new TaskPage(page);
    await task.openIssueByKey(testData.app.url, issueKey);

    await task.transitionToDone();
    await task.assertStatusDone();
  });

  test('Filter and view only completed (Done) issues', async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(testData.app.url, requireEnv('APP_EMAIL', testData.app.email), requireEnv('APP_PASSWORD', testData.app.password));
    await waitForJiraApp(page);

    // Navigate to issue search view using JQL.
    await page.goto(`${testData.app.url}/issues/?jql=status%20%3D%20Done`, { waitUntil: 'domcontentloaded' });

    // Basic assertions: results show Done and do not show other common statuses.
    await expect(page.getByText(/done/i).first()).toBeVisible();
    await expect(page.getByText(/to do|in progress/i)).toHaveCount(0);
  });
});
