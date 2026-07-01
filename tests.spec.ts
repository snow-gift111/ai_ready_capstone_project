import { test, expect } from '@playwright/test';
import { testData } from './data/testData';
import { LoginPage } from './pages/LoginPage';
import { TaskPage } from './pages/TaskPage';

// NOTE:
// - Credentials must be provided via APP_EMAIL / APP_PASSWORD.
// - Base URL must be provided via APP_BASE_URL (e.g., https://snowgift.atlassian.net)
// - For edit/delete/done tests requiring an existing issue, set APP_EXISTING_ISSUE_KEY env var.

const existingIssueKey = process.env.APP_EXISTING_ISSUE_KEY;

test.describe('User Authentication', () => {
  test('Log in with valid Atlassian email and password', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.login(testData.user.email ?? '', testData.user.password ?? '');

    // Expected: authenticated and redirected to *.atlassian.net
    await expect(page).toHaveURL(/https:\/\/.+\.atlassian\.net\/.+/);
  });

  test('Display error message for invalid login credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.submitEmailOnly(testData.login.invalidEmail);

    // Wait for password and attempt login with wrong password
    await page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i)).fill(testData.login.invalidPassword);
    await page.getByRole('button', { name: /^log in$/i }).or(page.getByRole('button', { name: /log in/i })).click();

    await loginPage.expectInvalidCredentialsError();

    // Not redirected to *.atlassian.net
    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Validate email field is not empty on login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    // Leave email empty
    await page.getByRole('button', { name: /continue/i }).click();

    await loginPage.expectEmailRequiredValidation();
  });

  test('Validate password field is not empty on login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i)).fill(testData.login.anyEmail);
    await page.getByRole('button', { name: /continue/i }).click();

    // Password field appears; leave it empty and click Log in
    await expect(page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i))).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /^log in$/i }).or(page.getByRole('button', { name: /log in/i })).click();

    await loginPage.expectPasswordRequiredValidation();
    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Log out successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.login(testData.user.email ?? '', testData.user.password ?? '');

    // Attempt logout via account menu.
    const avatar = page.getByRole('button', { name: /account|profile|avatar/i });
    await avatar.first().click();
    const logout = page.getByRole('menuitem', { name: /log out|logout/i }).or(page.getByRole('button', { name: /log out|logout/i }));
    await logout.first().click();

    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });
});

test.describe('Create Task', () => {
  test('Create a new Jira issue with summary, issue type, description, and project', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.login(testData.user.email ?? '', testData.user.password ?? '');
    await taskPage.gotoJiraHome();

    await taskPage.openCreateIssue();
    await taskPage.selectProject(testData.issue.project);
    await taskPage.selectIssueType(testData.issue.issueTypeTask);
    await taskPage.fillSummary(testData.issue.summary);
    await taskPage.fillDescription(testData.issue.description);
    await taskPage.submitCreate();

    await taskPage.expectIssueCreatedToast();
    // Best-effort: confirm entered values appear somewhere after creation
    await expect(page.getByText(new RegExp(testData.issue.summary, 'i')).first()).toBeVisible({ timeout: 30_000 });
  });

  test('Show validation error when creating an issue with empty summary', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.login(testData.user.email ?? '', testData.user.password ?? '');
    await taskPage.gotoJiraHome();

    await taskPage.openCreateIssue();
    await taskPage.selectProject(testData.issue.project);
    await taskPage.selectIssueType(testData.issue.issueTypeBug);
    // Leave summary empty
    await taskPage.submitCreate();

    await taskPage.expectSummaryRequiredErrorInCreate();
  });
});

test.describe('Edit Task', () => {
  test('Edit an existing issue summary, description, issue type, and priority', async ({ page }) => {
    test.skip(!existingIssueKey, 'APP_EXISTING_ISSUE_KEY is required for this test');

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.login(testData.user.email ?? '', testData.user.password ?? '');
    await taskPage.openIssueByKey(existingIssueKey!);

    await taskPage.startEditIssue();
    await taskPage.updateIssueSummary(testData.issue.updatedSummary);
    await taskPage.updateIssueDescription(testData.issue.updatedDescription);
    await taskPage.changeIssueType(testData.issue.issueTypeStory);
    await taskPage.changePriority(testData.issue.updatedPriority);
    await taskPage.saveEdit();

    await taskPage.expectIssueFields(testData.issue.updatedSummary, testData.issue.updatedDescription);
    await taskPage.expectIssueTypeInView(testData.issue.issueTypeStory);
    await taskPage.expectPriorityInView(testData.issue.updatedPriority);
  });

  test('Cancel editing without saving changes', async ({ page }) => {
    test.skip(!existingIssueKey, 'APP_EXISTING_ISSUE_KEY is required for this test');

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.login(testData.user.email ?? '', testData.user.password ?? '');
    await taskPage.openIssueByKey(existingIssueKey!);

    // Capture original summary (best-effort)
    const originalSummary = await page.getByRole('heading').first().innerText();

    await taskPage.startEditIssue();
    await taskPage.updateIssueSummary(testData.issue.attemptedSummaryChange);
    await taskPage.cancelEdit();

    // Expected: original values shown
    await expect(page.getByRole('heading', { name: new RegExp(originalSummary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first()).toBeVisible();
    await expect(page.getByText(new RegExp(testData.issue.attemptedSummaryChange, 'i')).first()).toBeHidden();
  });
});

test.describe('Delete Task', () => {
  test('Delete an existing issue after confirmation', async ({ page }) => {
    test.skip(!existingIssueKey, 'APP_EXISTING_ISSUE_KEY is required for this test');

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.login(testData.user.email ?? '', testData.user.password ?? '');
    await taskPage.openIssueByKey(existingIssueKey!);

    await taskPage.initiateDelete();
    await taskPage.expectDeleteConfirmationPrompt();
    await taskPage.confirmDelete();

    await taskPage.expectIssueNotAccessible(existingIssueKey!);
  });

  test('Cancel issue deletion from confirmation prompt', async ({ page }) => {
    test.skip(!existingIssueKey, 'APP_EXISTING_ISSUE_KEY is required for this test');

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.login(testData.user.email ?? '', testData.user.password ?? '');
    await taskPage.openIssueByKey(existingIssueKey!);

    await taskPage.initiateDelete();
    await taskPage.expectDeleteConfirmationPrompt();
    await taskPage.cancelDelete();

    // Expected: still accessible
    await expect(page).toHaveURL(new RegExp(`/browse/${existingIssueKey!}$`));
    await expect(page.getByText(new RegExp(existingIssueKey!, 'i')).first()).toBeVisible();
  });
});

test.describe('Mark Task as Completed', () => {
  test('Transition an issue to Done and verify visual indication', async ({ page }) => {
    test.skip(!existingIssueKey, 'APP_EXISTING_ISSUE_KEY is required for this test');

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.login(testData.user.email ?? '', testData.user.password ?? '');
    await taskPage.openIssueByKey(existingIssueKey!);

    await taskPage.transitionToDone();

    await taskPage.expectStatusDone();
  });

  test('Filter and view only completed (Done) issues', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.login(testData.user.email ?? '', testData.user.password ?? '');
    await taskPage.gotoBoardOrListForFiltering();

    await taskPage.applyDoneFilter();

    await taskPage.expectOnlyDoneIssuesVisible();
  });
});
