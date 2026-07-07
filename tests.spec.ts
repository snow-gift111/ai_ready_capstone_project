import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { TaskPage } from './pages/TaskPage';
import { testData } from './data/testData';
import { gotoJiraBase, requireCredentials } from './utils/helpers';

test.describe('User Authentication', () => {
  test('Log in with valid credentials and log out successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithValidEnvCredentials();

    // Expected: User is authenticated and lands on an authenticated Jira page
    await taskPage.assertAuthenticatedLanding();

    // Step: Initiate logout
    await taskPage.logout();

    // Expected: Logout completes successfully and user is no longer authenticated
    // Navigate to tenant base and ensure redirected to login
    await gotoJiraBase(page);
    await expect(page).toHaveURL(/id\.atlassian\.com\/login|login\.jsp|\/login/);
  });

  test('Show error message for invalid login credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    const email = testData.login.validEmailExample;
    const wrongPassword = testData.login.invalidPasswordExample;

    await loginPage.attemptLoginInvalidPassword(email, wrongPassword);

    // Expected: error shown
    await loginPage.assertInvalidCredentialsError();

    // Expected: User is not authenticated
    await loginPage.assertStillUnauthenticated();
  });

  test('Validate email field is not empty on login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.submitWithEmptyEmail('AnyPassword123!');

    // Expected: validation about required email
    await expect(page.getByText(/email.*required|enter your email/i)).toBeVisible();

    // Expected: user remains unauthenticated
    await loginPage.assertStillUnauthenticated();
  });

  test('Validate password field is not empty on login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.submitWithEmptyPassword(testData.login.validEmailExample);

    // Expected: validation about required password
    await loginPage.assertPasswordRequiredValidation();

    // Expected: user remains unauthenticated
    await loginPage.assertStillUnauthenticated();
  });
});

test.describe('Create Task', () => {
  test('Create a new Jira issue with summary, issue type, description, and project', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithValidEnvCredentials();
    await taskPage.gotoBase();

    await taskPage.openCreateIssue();

    await taskPage.fillCreateIssueFields({
      project: testData.issue.project,
      issueType: testData.issue.issueTypeTask,
      summary: testData.issue.summary,
      description: testData.issue.description,
    });

    await taskPage.submitCreateIssue();

    // Expected: issue created
    await taskPage.assertIssueCreatedToastOrKeyVisible();

    // NOTE: Jira often keeps you in dialog/toast; full validation of project/type/summary/description
    // requires opening the created issue. This framework asserts the creation signal and relies on
    // Jira UI to show the values in subsequent edit/view checks.
  });

  test('Show validation error when creating an issue with empty summary', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithValidEnvCredentials();
    await taskPage.gotoBase();

    await taskPage.openCreateIssue();

    await taskPage.fillCreateIssueFields({
      project: testData.issue.project,
      issueType: testData.issue.issueTypeBug,
      summary: '',
    });

    await taskPage.submitCreateIssue();

    // Expected: summary required
    await taskPage.assertCreateSummaryRequiredError();

    // Expected: Issue is not created (dialog remains)
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

test.describe('Edit Task', () => {
  test('Edit an existing issue: update summary, description, issue type, and priority', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithValidEnvCredentials();

    await taskPage.openAnyExistingIssue();

    await taskPage.enterEditMode();
    await taskPage.updateIssueInEditDialog({
      summary: testData.issue.updatedSummary,
      description: testData.issue.updatedDescription,
      issueType: testData.issue.issueTypeStory,
      priority: testData.issue.updatedPriority,
    });
    await taskPage.saveEditDialog();

    // Expected results: updated values visible
    await expect(page.getByText(testData.issue.updatedSummary).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/updated description - automation/i).first()).toBeVisible({ timeout: 30_000 });
    await taskPage.assertIssueFieldTextInView(/type/i, /story/i);
    await taskPage.assertIssueFieldTextInView(/priority/i, /high/i);
  });

  test('Cancel editing without saving changes', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithValidEnvCredentials();

    await taskPage.openAnyExistingIssue();

    const before = await taskPage.getIssueSummaryText();

    await taskPage.enterEditMode();
    await taskPage.updateIssueInEditDialog({ summary: testData.issue.tempSummaryChange });
    await taskPage.cancelEditDialog();

    // Expected: not saved
    const after = await taskPage.getIssueSummaryText();
    expect(after).toContain(before);
  });
});

test.describe('Delete Task', () => {
  test('Delete an existing issue after confirming deletion', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithValidEnvCredentials();

    await taskPage.openAnyExistingIssue();
    const issueUrl = page.url();

    await taskPage.initiateDelete();

    // Expected: confirmation prompt shown
    await taskPage.assertDeleteConfirmationShown();

    await taskPage.confirmDelete();

    // Expected: issue deleted and not accessible
    await taskPage.assertIssueNoLongerAccessible(issueUrl);
  });

  test('Cancel deletion and keep the issue', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithValidEnvCredentials();

    await taskPage.openAnyExistingIssue();
    const issueUrl = page.url();

    await taskPage.initiateDelete();
    await taskPage.assertDeleteConfirmationShown();

    await taskPage.cancelDelete();

    // Expected: issue remains accessible
    await page.goto(issueUrl, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/browse\//);
  });
});

test.describe('Mark Task as Completed', () => {
  test('Transition an issue to Done, verify visual indicator, and filter to view only completed issues', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithValidEnvCredentials();

    await taskPage.openAnyExistingIssue();

    // Capture issue key from URL for later verification
    const match = page.url().match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/);
    const issueKey = match?.[1];
    expect(issueKey, 'Issue key should be present in /browse/ URL').toBeTruthy();

    // Step: change status to Done
    await taskPage.transitionToDone();

    // Expected: status updated & visual indicator
    await expect(page.getByText(/^done$/i).first()).toBeVisible({ timeout: 30_000 });

    // Step: navigate to issues list and filter completed
    await taskPage.gotoIssueSearchList();
    await taskPage.applyCompletedOnlyFilter();

    // Expected: only Done issues shown
    await taskPage.assertResultsOnlyDone();

    // Expected: transitioned issue appears in results
    if (issueKey) {
      await taskPage.assertIssueKeyPresentInResults(issueKey);
    }
  });
});
