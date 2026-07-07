import { expect, test } from '@playwright/test';
import { testData } from './data/testData';
import { LoginPage } from './pages/LoginPage';
import { TaskPage } from './pages/TaskPage';
import { ensureEnv, uniqueSummary } from './utils/helpers';
import type { Page } from '@playwright/test';

// NOTE: Exactly one Playwright test() per provided test case.

async function loginValidUser(page: Page) {
  const email = await ensureEnv('APP_EMAIL');
  const password = await ensureEnv('APP_PASSWORD');
  const loginPage = new LoginPage(page);
  await loginPage.login(email, password);
}

async function gotoApp(page: Page) {
  const appUrl = await ensureEnv('APP_URL');
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
}

test.describe('User Authentication', () => {
  test('Log in successfully with valid Atlassian email and password', async ({ page }) => {
    // Navigate to the application URL.
    await gotoApp(page);

    // Enter valid credentials using Atlassian ID login flow.
    const email = await ensureEnv('APP_EMAIL');
    const password = await ensureEnv('APP_PASSWORD');
    const loginPage = new LoginPage(page);

    await loginPage.login(email, password);

    // Assertions
    await expect(page).toHaveURL(/.*\.atlassian\.net\/.+/);
    await expect(page.getByRole('banner').or(page.getByRole('navigation'))).toBeVisible();
  });

  test('Show error message for invalid login credentials', async ({ page }) => {
    await gotoApp(page);

    const email = await ensureEnv('APP_EMAIL');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.emailInput.fill(email);
    await loginPage.continueButton.click();
    await expect(loginPage.passwordInput).toBeVisible({ timeout: 30_000 });
    const validPassword = await ensureEnv('APP_PASSWORD');
    await loginPage.passwordInput.fill(`${validPassword}__invalid`);
    await loginPage.loginButton.click();

    // Assertions - error message displayed, user not redirected to *.atlassian.net
    await expect(page.getByText(/incorrect email|incorrect password|couldn’t log you in|wrong/i)).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Validate email field is not empty on login', async ({ page }) => {
    await gotoApp(page);

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Leave email empty
    await loginPage.emailInput.fill('');
    await loginPage.continueButton.click();

    // Assertions
    await expect(page.getByText(/enter your email|required/i)).toBeVisible({ timeout: 10_000 });
    await expect(loginPage.passwordInput).toBeHidden();
  });

  test('Validate password field is not empty on login', async ({ page }) => {
    await gotoApp(page);

    const email = await ensureEnv('APP_EMAIL');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.emailInput.fill(email);
    await loginPage.continueButton.click();
    await expect(loginPage.passwordInput).toBeVisible({ timeout: 30_000 });

    // Leave password empty
    await loginPage.passwordInput.fill('');
    await loginPage.loginButton.click();

    // Assertions
    await expect(page.getByText(/enter your password|required/i)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Log out successfully', async ({ page }) => {
    await loginValidUser(page);

    const taskPage = new TaskPage(page);
    await taskPage.logout();

    // Assertions: should end up on Atlassian login page (or session ended)
    await expect(page).toHaveURL(/id\.atlassian\.com\/(login|logout)/);
    await expect(page.getByLabel('Email')).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('Create Task', () => {
  test('Create a new Jira issue with summary, issue type, description, and project', async ({ page }) => {
    await loginValidUser(page);

    const project = await ensureEnv('APP_PROJECT');
    const taskPage = new TaskPage(page);
    const summary = uniqueSummary(testData.issue.summaryCreate);

    const key = await taskPage.createIssueAndGetKey({
      project,
      issueType: testData.issue.issueTypeTask,
      summary,
      description: testData.issue.descriptionCreate
    });

    await taskPage.openIssueByKey(key);

    // Assertions
    await expect(page.getByText(summary, { exact: false })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(testData.issue.descriptionCreate, { exact: false })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(testData.issue.issueTypeTask, { exact: false })).toBeVisible({ timeout: 30_000 });
  });

  test('Show validation error when creating an issue with empty summary', async ({ page }) => {
    await loginValidUser(page);

    const project = await ensureEnv('APP_PROJECT');
    const taskPage = new TaskPage(page);
    await taskPage.openCreateIssue();

    await taskPage.selectDropdownByTyping(taskPage.projectField(), project);
    await taskPage.selectDropdownByTyping(taskPage.issueTypeField(), testData.issue.issueTypeBug);

    // Leave summary empty.
    await taskPage.summaryField().fill('');
    await taskPage.createSubmitButton().click();

    // Assertions
    await expect(page.getByText(/summary.*required|required/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

test.describe('Edit Task', () => {
  test('Edit an existing issue summary, description, issue type, and priority', async ({ page }) => {
    await loginValidUser(page);

    const taskPage = new TaskPage(page);

    // Create a fresh issue to edit to avoid environment dependencies.
    const summary = uniqueSummary('Edit target');
    const key = await taskPage.createIssueAndGetKey({
      project: await ensureEnv('APP_PROJECT'),
      issueType: testData.issue.issueTypeTask,
      summary,
      description: testData.issue.descriptionCreate
    });

    await taskPage.openIssueByKey(key);

    // Update fields
    const updatedSummary = uniqueSummary(testData.issue.summaryUpdated);
    await taskPage.editSummary(updatedSummary);
    await taskPage.editDescription(testData.issue.descriptionUpdated);
    await taskPage.changeIssueType(testData.issue.issueTypeStory);
    await taskPage.changePriority(testData.issue.priorityHigh);

    // Assertions
    await expect(page.getByText(updatedSummary, { exact: false })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(testData.issue.descriptionUpdated, { exact: false })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(testData.issue.issueTypeStory, { exact: false })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(testData.issue.priorityHigh, { exact: false })).toBeVisible({ timeout: 30_000 });
  });

  test('Cancel editing without saving changes', async ({ page }) => {
    await loginValidUser(page);

    const taskPage = new TaskPage(page);

    const summary = uniqueSummary('Cancel edit target');
    const key = await taskPage.createIssueAndGetKey({
      project: await ensureEnv('APP_PROJECT'),
      issueType: testData.issue.issueTypeTask,
      summary,
      description: testData.issue.descriptionCreate
    });

    await taskPage.openIssueByKey(key);

    const original = await taskPage.getCurrentSummary();
    await taskPage.editSummaryAndCancel(testData.issue.unsavedSummary);

    // Assertions
    const after = await taskPage.getCurrentSummary();
    expect(after).toBe(original);
  });
});

test.describe('Delete Task', () => {
  test('Delete an existing issue after confirming deletion', async ({ page }) => {
    await loginValidUser(page);

    const taskPage = new TaskPage(page);

    const summary = uniqueSummary('Delete target');
    const key = await taskPage.createIssueAndGetKey({
      project: await ensureEnv('APP_PROJECT'),
      issueType: testData.issue.issueTypeTask,
      summary,
      description: testData.issue.descriptionCreate
    });

    await taskPage.openIssueByKey(key);

    // Confirmation prompt should appear before deletion.
    await taskPage.deleteIssue(true);

    // Verify issue no longer accessible
    await page.goto(`/browse/${key}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/you don't have permission|issue does not exist|can't find/i)).toBeVisible({ timeout: 30_000 });
  });

  test('Cancel deletion from the confirmation prompt', async ({ page }) => {
    await loginValidUser(page);

    const taskPage = new TaskPage(page);

    const summary = uniqueSummary('Cancel delete target');
    const key = await taskPage.createIssueAndGetKey({
      project: await ensureEnv('APP_PROJECT'),
      issueType: testData.issue.issueTypeTask,
      summary,
      description: testData.issue.descriptionCreate
    });

    await taskPage.openIssueByKey(key);

    await taskPage.deleteIssue(false);

    // Assertions: still accessible
    await expect(page).toHaveURL(new RegExp(`/browse/${key}`, 'i'));
    await expect(page.getByText(summary, { exact: false })).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('Mark Task as Completed', () => {
  test('Transition an issue to Done and show visual indication', async ({ page }) => {
    await loginValidUser(page);

    const taskPage = new TaskPage(page);

    const summary = uniqueSummary('Done target');
    const key = await taskPage.createIssueAndGetKey({
      project: await ensureEnv('APP_PROJECT'),
      issueType: testData.issue.issueTypeTask,
      summary,
      description: testData.issue.descriptionCreate
    });

    await taskPage.openIssueByKey(key);
    await taskPage.transitionToDone();

    // Assertions
    await expect(page.getByText(/^Done$/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test('Filter and view only completed (Done) issues', async ({ page }) => {
    await loginValidUser(page);

    const taskPage = new TaskPage(page);
    await taskPage.goToIssueSearch();
    await taskPage.filterDoneIssues();

    // Assertions - ensure no non-Done statuses in visible results (best-effort)
    await expect(page.getByText(/To Do|In Progress/i)).toHaveCount(0);
  });
});

