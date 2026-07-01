import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { TaskPage } from './pages/TaskPage';
import { testData } from './data/testData';
import { ensureOnJiraSite, getEnvOrThrow } from './utils/helpers';

// NOTE: Exactly one test() per incoming test case.

test.describe('User Authentication', () => {
  test('Log in with valid credentials and log out successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginWithValidCredentials();
    await ensureOnJiraSite(page);

    // Expected: user lands in Jira application
    await expect(page).toHaveURL(/atlassian\.net/);

    // Logout from account menu
    const profileButton = page
      .getByRole('button', { name: /account|profile|user settings/i })
      .first();
    await profileButton.click();

    const logout = page.getByRole('menuitem', { name: /log out/i }).first();
    await logout.click();

    // Expected: logout completes, user no longer authenticated
    await expect(page).toHaveURL(/id\.atlassian\.com\/login|logout/i);
  });

  test('Show error message for invalid login credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const email = getEnvOrThrow('APP_EMAIL');
    const invalidPassword = process.env.APP_INVALID_PASSWORD ?? 'WrongPassword!';

    await loginPage.loginWith(email, invalidPassword);
    await loginPage.expectInvalidCredentialsError();

    // Expected: user is not logged in
    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Validate email field is required (empty email)', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.submitEmptyEmail();
    await loginPage.expectEmailRequiredValidation();

    // Expected: user is not logged in
    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Validate password field is required (empty password)', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const email = getEnvOrThrow('APP_EMAIL');

    await loginPage.submitEmptyPassword(email);
    await loginPage.expectPasswordRequiredValidation();

    // Expected: user is not logged in
    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });
});

test.describe('Create Task', () => {
  test('Create a new Jira issue with summary, issue type, description, and project', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithValidCredentials();
    await ensureOnJiraSite(page);
    await taskPage.gotoHome();

    await taskPage.openCreateIssue();
    await taskPage.fillCreateIssueForm({
      project: testData.createIssue.project,
      issueType: testData.createIssue.issueTypeTask,
      summary: testData.createIssue.summary,
      description: testData.createIssue.description,
    });
    await taskPage.submitCreate();

    // Expected results: issue created and displays entered values
    await taskPage.expectIssueCreated();
    await expect(page.getByText(testData.createIssue.project, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(testData.createIssue.issueTypeTask, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(testData.createIssue.summary, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(testData.createIssue.description, { exact: false }).first()).toBeVisible();
  });

  test('Show validation error when creating an issue with empty summary', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithValidCredentials();
    await ensureOnJiraSite(page);
    await taskPage.gotoHome();

    await taskPage.openCreateIssue();
    await taskPage.fillCreateIssueForm({
      project: testData.createIssue.project,
      issueType: testData.createIssue.issueTypeBug,
      summary: '',
    });
    await taskPage.submitCreate();

    // Expected: validation error displayed, no issue created
    const summaryError = page.getByText(/summary.*required|required.*summary/i).first();
    await expect(summaryError).toBeVisible();
    await expect(page.getByRole('alert').getByText(/created/i)).toHaveCount(0);
  });
});

test.describe('Edit Task', () => {
  test('Edit an existing issue: update summary, description, issue type, and priority', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithValidCredentials();
    await ensureOnJiraSite(page);
    await taskPage.gotoHome();

    // Arrange: create an issue to edit
    await taskPage.openCreateIssue();
    await taskPage.fillCreateIssueForm({
      project: testData.createIssue.project,
      issueType: testData.createIssue.issueTypeTask,
      summary: `${testData.createIssue.summary} (edit)`,
      description: testData.createIssue.description,
    });
    await taskPage.submitCreate();
    await taskPage.expectIssueCreated();

    // Act: edit fields
    await taskPage.openEditIssue();
    await taskPage.updateIssueFields({
      summary: testData.editIssue.newSummary,
      description: testData.editIssue.newDescription,
      issueType: testData.editIssue.newIssueType,
      priority: testData.editIssue.newPriority,
    });
    await taskPage.saveEdit();

    // Assert expected results
    await expect(page.getByText(testData.editIssue.newSummary, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(testData.editIssue.newDescription, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(testData.editIssue.newIssueType, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(testData.editIssue.newPriority, { exact: false }).first()).toBeVisible();
  });

  test('Cancel editing an issue without saving changes', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithValidCredentials();
    await ensureOnJiraSite(page);
    await taskPage.gotoHome();

    // Arrange: create issue
    const originalSummary = `${testData.createIssue.summary} (cancel-edit)`;
    await taskPage.openCreateIssue();
    await taskPage.fillCreateIssueForm({
      project: testData.createIssue.project,
      issueType: testData.createIssue.issueTypeTask,
      summary: originalSummary,
      description: testData.createIssue.description,
    });
    await taskPage.submitCreate();
    await taskPage.expectIssueCreated();

    // Act: open edit and cancel
    await taskPage.openEditIssue();
    await taskPage.updateIssueFields({ summary: testData.editIssue.attemptedSummaryChange });
    await taskPage.cancelEdit();

    // Assert: summary unchanged
    await expect(page.getByText(originalSummary, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(testData.editIssue.attemptedSummaryChange, { exact: false })).toHaveCount(0);
  });
});

test.describe('Delete Task', () => {
  test('Delete an existing issue after confirming deletion', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithValidCredentials();
    await ensureOnJiraSite(page);
    await taskPage.gotoHome();

    // Arrange: create issue to delete
    await taskPage.openCreateIssue();
    await taskPage.fillCreateIssueForm({
      project: testData.createIssue.project,
      issueType: testData.createIssue.issueTypeTask,
      summary: `${testData.createIssue.summary} (delete)`,
      description: testData.createIssue.description,
    });
    await taskPage.submitCreate();
    await taskPage.expectIssueCreated();
    const issueKey = taskPage.lastCreatedIssueKey!;

    // Act: initiate delete and confirm
    await taskPage.initiateDelete();
    // Expected: confirmation prompt shown
    await expect(page.getByRole('dialog').filter({ hasText: /delete/i }).first()).toBeVisible();
    await taskPage.confirmDelete();

    // Assert: issue deleted and no longer accessible
    await taskPage.expectIssueDeleted(issueKey);
  });

  test('Cancel deletion when confirmation is shown', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithValidCredentials();
    await ensureOnJiraSite(page);
    await taskPage.gotoHome();

    // Arrange: create issue
    await taskPage.openCreateIssue();
    await taskPage.fillCreateIssueForm({
      project: testData.createIssue.project,
      issueType: testData.createIssue.issueTypeTask,
      summary: `${testData.createIssue.summary} (cancel-delete)`,
      description: testData.createIssue.description,
    });
    await taskPage.submitCreate();
    await taskPage.expectIssueCreated();
    const issueKey = taskPage.lastCreatedIssueKey!;

    // Act: initiate delete but cancel
    await taskPage.initiateDelete();
    await expect(page.getByRole('dialog').filter({ hasText: /delete/i }).first()).toBeVisible();
    await taskPage.cancelDelete();

    // Assert: issue not deleted and remains visible
    await expect(page.getByText(issueKey)).toBeVisible();
    await expect(page.getByText(/you can't view this issue|does not exist|was not found/i)).toHaveCount(0);
  });
});

test.describe('Mark Task as Completed', () => {
  test('Transition an issue status to Done and verify it is visually indicated as Done', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithValidCredentials();
    await ensureOnJiraSite(page);
    await taskPage.gotoHome();

    // Arrange: create issue to transition
    await taskPage.openCreateIssue();
    await taskPage.fillCreateIssueForm({
      project: testData.createIssue.project,
      issueType: testData.createIssue.issueTypeTask,
      summary: `${testData.createIssue.summary} (done)`,
      description: testData.createIssue.description,
    });
    await taskPage.submitCreate();
    await taskPage.expectIssueCreated();

    // Act
    await taskPage.transitionToDone();

    // Assert
    await taskPage.expectStatusDone();
    await expect(page.getByText(/^done$/i).first()).toBeVisible();
  });

  test('Filter and view only completed (Done) issues', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    await loginPage.loginWithValidCredentials();
    await ensureOnJiraSite(page);

    // Act: open issues list with done-only filter
    await taskPage.openIssuesWithJql(testData.jql.doneOnly);

    // Assert: only Done issues displayed
    await taskPage.expectOnlyDoneIssuesVisible();

    // And statuses other than Done are not displayed (best-effort assertion)
    await expect(page.getByText(/in progress|to do|selected for development|backlog/i)).toHaveCount(0);
  });
});
