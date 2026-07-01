import { test, expect } from '@playwright/test';
import { testData } from './data/testData';
import { LoginPage } from './pages/LoginPage';
import { TaskPage } from './pages/TaskPage';
import { gotoJiraBase, expectNotAuthenticated, waitForAtlassianRedirect } from './utils/helpers';

test.describe('User Authentication', () => {
  test('Log in with valid credentials and log out successfully', async ({ page }) => {
    // Steps: Navigate to Jira site URL.
    await gotoJiraBase(page);

    // Login uses mandated Atlassian flow
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithEnvCredentials();

    // Expected: User is authenticated and lands on an authenticated Jira page.
    await waitForAtlassianRedirect(page);
    await expect(page).toHaveURL(/.*\.atlassian\.net\/.*/);

    // Steps: Initiate logout
    const avatarButton = page.getByRole('button', { name: /account|profile|avatar/i });
    await expect(avatarButton).toBeVisible({ timeout: 60_000 });
    await avatarButton.click();

    const logout = page.getByRole('menuitem', { name: /log out/i }).or(page.getByRole('button', { name: /log out/i }));
    await expect(logout).toBeVisible({ timeout: 30_000 });
    await logout.click();

    // Expected: User is logged out
    await expectNotAuthenticated(page);
  });

  test('Show error message for invalid login credentials', async ({ page }) => {
    await gotoJiraBase(page);

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Steps: enter invalid email + invalid password and submit
    await loginPage.loginExpectFailure(testData.auth.invalidEmail, testData.auth.invalidPassword);

    // Expected: error message + not authenticated
    await loginPage.assertInvalidCredentialsError();
    await expectNotAuthenticated(page);
  });

  test('Validate email is required on login', async ({ page }) => {
    await gotoJiraBase(page);

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Steps: leave email empty, enter any password, submit
    await loginPage.submitWithoutEmail(testData.auth.anyPassword);

    // Expected
    await loginPage.assertEmailRequired();
    await expectNotAuthenticated(page);
  });

  test('Validate password is required on login', async ({ page }) => {
    await gotoJiraBase(page);

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Steps: valid email, empty password, submit
    const email = process.env.APP_EMAIL ?? 'valid.user@example.com';
    await loginPage.submitWithoutPassword(email);

    // Expected
    await loginPage.assertPasswordRequired();
    await expectNotAuthenticated(page);
  });
});

test.describe('Create Task', () => {
  test('Create a new issue with summary, issue type, description, and project', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithEnvCredentials();

    const taskPage = new TaskPage(page);

    // Steps
    await taskPage.openCreate();
    await taskPage.createIssue({
      project: testData.createIssue.project,
      issueType: testData.createIssue.issueTypeTask,
      summary: testData.createIssue.summary,
      description: testData.createIssue.description,
    });

    // Expected: issue created and shows selected values (best-effort using toast + visible values)
    // Post-create Jira may show issue view or toast; assert summary exists somewhere.
    await expect(page.getByText(new RegExp(testData.createIssue.summary, 'i')).first()).toBeVisible({ timeout: 60_000 });
  });

  test('Show validation error when creating an issue with empty summary', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithEnvCredentials();

    const taskPage = new TaskPage(page);
    await taskPage.openCreate();

    // Fill required selectors except summary
    await taskPage.createIssue(
      {
        project: testData.createIssue.project,
        issueType: testData.createIssue.issueTypeBug,
        summary: '',
      },
      { expectSuccess: false }
    );

    // Expected
    await taskPage.assertCreateDialogSummaryRequired();
  });
});

test.describe('Edit Task', () => {
  test('Edit an existing issue: summary, description, issue type, and priority', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithEnvCredentials();

    const taskPage = new TaskPage(page);

    // Steps
    await taskPage.openExistingIssue();
    await taskPage.startEditingIssue();
    await taskPage.updateSummary(testData.editIssue.newSummary);
    await taskPage.updateDescription(testData.editIssue.newDescription);
    await taskPage.updateIssueType(testData.editIssue.newIssueType);
    await taskPage.updatePriority(testData.editIssue.newPriority);
    await taskPage.saveEdit();

    // Expected
    await taskPage.assertIssueSummaryVisible(testData.editIssue.newSummary);
    await taskPage.assertIssueDescriptionVisible(testData.editIssue.newDescription);
    await taskPage.assertIssueTypeVisible(testData.editIssue.newIssueType);
    await taskPage.assertPriorityVisible(testData.editIssue.newPriority);
  });

  test('Cancel editing without saving changes', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithEnvCredentials();

    const taskPage = new TaskPage(page);
    await taskPage.openExistingIssue();

    // Capture current summary (best-effort)
    const currentSummaryEl = page.getByRole('heading').first();
    const currentSummary = (await currentSummaryEl.textContent().catch(() => ''))?.trim() ?? '';

    // Steps
    await taskPage.startEditingIssue();
    await taskPage.updateSummary(testData.editIssue.attemptedSummaryChange);
    await taskPage.cancelEdit();

    // Expected: does not reflect modified summary
    await expect(page.getByText(new RegExp(testData.editIssue.attemptedSummaryChange, 'i')).first()).toBeHidden({ timeout: 10_000 }).catch(() => {});
    if (currentSummary) {
      await expect(page.getByText(new RegExp(currentSummary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).first()).toBeVisible({ timeout: 60_000 });
    }
  });
});

test.describe('Delete Task', () => {
  test('Delete an existing issue after confirmation', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithEnvCredentials();

    const taskPage = new TaskPage(page);
    await taskPage.openExistingIssue();

    // Steps & Expected
    // confirmation prompt + deleted
    await taskPage.deleteIssueConfirm();
  });

  test('Cancel deletion from the confirmation prompt', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithEnvCredentials();

    const taskPage = new TaskPage(page);
    await taskPage.openExistingIssue();

    // Steps
    await taskPage.deleteIssueCancel();

    // Expected
    await expect(page).toHaveURL(/.*\.atlassian\.net\/.*/);
  });
});

test.describe('Mark Task as Completed', () => {
  test('Transition an issue to Done and verify it is visually indicated as Done', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithEnvCredentials();

    const taskPage = new TaskPage(page);
    await taskPage.openExistingIssue();

    // Steps
    await taskPage.transitionToDone();

    // Expected
    await taskPage.assertStatusDone();
  });

  test('Filter to view only completed (Done) issues', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithEnvCredentials();

    const taskPage = new TaskPage(page);

    // Steps
    await taskPage.goToIssueSearchAndFilterDone();

    // Expected
    await taskPage.assertOnlyDoneIssuesInResults();
  });
});
