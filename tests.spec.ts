import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { TaskPage } from './pages/TaskPage';
import { testData } from './data/testData';
import { requireEnv } from './utils/helpers';

test.describe('User Authentication', () => {
  test('Log in successfully with valid Atlassian email and password', async ({ page }) => {
    requireEnv('APP_EMAIL');
    requireEnv('APP_PASSWORD');
    requireEnv('APP_BASE_URL');

    const loginPage = new LoginPage(page);

    await loginPage.login(testData.login.validEmail ?? undefined, testData.login.validPassword ?? undefined);

    await expect(page).toHaveURL(/https:\/\/.*\.atlassian\.net\/.+/);
  });

  test('Show error message for invalid login credentials', async ({ page }) => {
    requireEnv('APP_EMAIL');
    requireEnv('APP_BASE_URL');

    const loginPage = new LoginPage(page);

    await loginPage.login(testData.login.validEmail ?? undefined, 'WrongPassword!');

    await loginPage.expectInvalidCredentialsError();
    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Validate email field is not empty on login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Leave email empty; Atlassian requires email before password stage.
    await loginPage.expectEmailRequiredValidation();

    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Validate password field is not empty on login', async ({ page }) => {
    requireEnv('APP_EMAIL');

    const loginPage = new LoginPage(page);

    await loginPage.submitEmailOnly(testData.login.validEmail ?? requireEnv('APP_EMAIL'));
    // Leave password empty
    await loginPage.submitPasswordOnly('');

    // Browser validation typically blocks submit; verify still on login and password field visible.
    await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible();
    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Log out successfully from an authenticated session', async ({ page }) => {
    requireEnv('APP_EMAIL');
    requireEnv('APP_PASSWORD');
    requireEnv('APP_BASE_URL');

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.login();
    await taskPage.gotoJiraHome();

    await taskPage.logout();

    // User returned to a logged-out state.
    await expect(page).toHaveURL(/id\.atlassian\.com\/login|logout/i);
  });
});

test.describe('Create Task', () => {
  test('Create a new Jira issue with summary, issue type, description, and project', async ({ page }) => {
    requireEnv('APP_EMAIL');
    requireEnv('APP_PASSWORD');
    requireEnv('APP_BASE_URL');

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.login();

    await taskPage.createIssue({
      issueType: testData.issue.create.issueTypeTask,
      summary: testData.issue.create.summary,
      description: testData.issue.create.description,
    });

    const key = await taskPage.expectIssueKeyVisible();
    await taskPage.expectIssueSummary(testData.issue.create.summary);
    await taskPage.expectIssueTypeContains(testData.issue.create.issueTypeTask);
    await taskPage.expectIssueDescriptionContains(testData.issue.create.description);

    // Key is present (project reflected as part of issue key)
    expect(key).toMatch(/[A-Z][A-Z0-9_]+-\d+/);
  });

  test('Issue type selection offers Bug, Task, and Story', async ({ page }) => {
    requireEnv('APP_EMAIL');
    requireEnv('APP_PASSWORD');
    requireEnv('APP_BASE_URL');

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.login();
    await taskPage.openCreateIssue();

    // Open issue type selector
    await page.getByLabel(/issue type/i).first().click();

    await expect(page.getByRole('option', { name: /^bug$/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /^task$/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /^story$/i })).toBeVisible();
  });

  test('Show validation error when creating an issue with empty summary', async ({ page }) => {
    requireEnv('APP_EMAIL');
    requireEnv('APP_PASSWORD');
    requireEnv('APP_BASE_URL');

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.login();
    await taskPage.openCreateIssue();

    await taskPage.selectAnyProject();
    await taskPage.selectIssueType(testData.issue.create.issueTypeBug);

    // Leave summary empty
    await taskPage.fillSummary('');
    await taskPage.submitCreateIssue();

    await expect(page.getByText(/summary.*required|required.*summary/i).first()).toBeVisible();

    // No issue should be created: toast should not appear
    await expect(page.getByText(/issue created|created/i).first()).toBeHidden();
  });
});

test.describe('Edit Task', () => {
  test('Edit an existing issue: update summary, description, issue type, and priority', async ({ page }) => {
    requireEnv('APP_EMAIL');
    requireEnv('APP_PASSWORD');
    requireEnv('APP_BASE_URL');

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.login();

    // Ensure an editable issue exists by creating one.
    await taskPage.createIssue({
      issueType: testData.issue.create.issueTypeTask,
      summary: `${testData.issue.create.summary} (to edit)`,
      description: testData.issue.create.description,
    });

    await taskPage.enterEditMode();
    await taskPage.updateSummary(testData.issue.edit.newSummary);
    await taskPage.updateDescription(testData.issue.edit.newDescription);
    await taskPage.changeIssueType(testData.issue.edit.newIssueType);
    await taskPage.changePriority(testData.issue.edit.newPriority);
    await taskPage.saveEdit();

    await taskPage.expectSummaryValue(testData.issue.edit.newSummary);
    await taskPage.expectIssueTypeValue(testData.issue.edit.newIssueType);
    await taskPage.expectPriorityValue(testData.issue.edit.newPriority);
    await expect(page.getByText(testData.issue.edit.newDescription).first()).toBeVisible();
  });

  test('Cancel editing an issue without saving changes', async ({ page }) => {
    requireEnv('APP_EMAIL');
    requireEnv('APP_PASSWORD');
    requireEnv('APP_BASE_URL');

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.login();

    await taskPage.createIssue({
      issueType: testData.issue.create.issueTypeTask,
      summary: `${testData.issue.create.summary} (cancel edit)`,
      description: testData.issue.create.description,
    });

    const originalUrl = page.url();

    await taskPage.enterEditMode();
    await taskPage.updateSummary(testData.issue.edit.unsavedSummary);
    await taskPage.cancelEdit();

    // Reload issue page and verify summary not changed
    await page.goto(originalUrl);
    await expect(page.getByText(testData.issue.edit.unsavedSummary).first()).toBeHidden();
  });
});

test.describe('Delete Task', () => {
  test('Delete an existing issue after confirming deletion', async ({ page }) => {
    requireEnv('APP_EMAIL');
    requireEnv('APP_PASSWORD');
    requireEnv('APP_BASE_URL');

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.login();

    await taskPage.createIssue({
      issueType: testData.issue.create.issueTypeTask,
      summary: `${testData.issue.create.summary} (to delete)`,
      description: testData.issue.create.description,
    });

    const issueKey = taskPage.getIssueKeyFromUrl();
    expect(issueKey, 'Issue key should be present before delete').not.toBeNull();

    await taskPage.initiateDelete();

    // Confirmation prompt shown
    await expect(page.getByRole('dialog')).toBeVisible();

    await taskPage.confirmDelete();

    // Verify not accessible via direct navigation
    await page.goto(`${requireEnv('APP_BASE_URL')}/browse/${issueKey}`);
    await taskPage.expectDeletedNotAccessible();
  });

  test('Cancel issue deletion from the confirmation prompt', async ({ page }) => {
    requireEnv('APP_EMAIL');
    requireEnv('APP_PASSWORD');
    requireEnv('APP_BASE_URL');

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.login();

    await taskPage.createIssue({
      issueType: testData.issue.create.issueTypeTask,
      summary: `${testData.issue.create.summary} (cancel delete)`,
      description: testData.issue.create.description,
    });

    const issueKey = taskPage.getIssueKeyFromUrl();
    expect(issueKey, 'Issue key should be present before cancel delete').not.toBeNull();

    await taskPage.initiateDelete();

    // Confirmation prompt shown
    await expect(page.getByRole('dialog')).toBeVisible();

    await taskPage.cancelDelete();

    // Issue remains accessible
    await page.goto(`${requireEnv('APP_BASE_URL')}/browse/${issueKey}`);
    await expect(page.getByText(new RegExp(issueKey!)).first()).toBeVisible();
  });
});

test.describe('Mark Task as Completed', () => {
  test('Transition an issue status to Done and verify visual indication', async ({ page }) => {
    requireEnv('APP_EMAIL');
    requireEnv('APP_PASSWORD');
    requireEnv('APP_BASE_URL');

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.login();

    // Ensure issue exists by creating
    await taskPage.createIssue({
      issueType: testData.issue.create.issueTypeTask,
      summary: `${testData.issue.create.summary} (to done)`,
      description: testData.issue.create.description,
    });

    await taskPage.transitionStatusToDone();

    await taskPage.expectStatusDoneVisual();
  });

  test('Filter to view only completed (Done) issues', async ({ page }) => {
    requireEnv('APP_EMAIL');
    requireEnv('APP_PASSWORD');
    requireEnv('APP_BASE_URL');

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.login();

    // Create one Done issue and one non-Done issue for deterministic assertions
    await taskPage.createIssue({
      issueType: testData.issue.create.issueTypeTask,
      summary: `${testData.issue.create.summary} (done filter - done)`,
      description: testData.issue.create.description,
    });
    const doneKey = taskPage.getIssueKeyFromUrl();
    expect(doneKey).not.toBeNull();
    await taskPage.transitionStatusToDone();

    await taskPage.createIssue({
      issueType: testData.issue.create.issueTypeTask,
      summary: `${testData.issue.create.summary} (done filter - not done)`,
      description: testData.issue.create.description,
    });
    const notDoneKey = taskPage.getIssueKeyFromUrl();
    expect(notDoneKey).not.toBeNull();

    await taskPage.gotoIssueSearch();
    await taskPage.applyDoneFilter();

    await taskPage.expectIssuePresentInResults(doneKey!);
    await taskPage.expectIssueNotPresentInResults(notDoneKey!);
  });
});
