import { test, expect } from '@playwright/test';
import { testData } from './data/testData';
import { LoginPage } from './pages/LoginPage';
import { TaskPage } from './pages/TaskPage';
import { attachScreenshotOnFailure, requireEnv, uniqueText } from './utils/helpers';

test.afterEach(async ({ page }, testInfo) => {
  await attachScreenshotOnFailure(page, testInfo);
});

test.describe('User Authentication', () => {
  test('Log in with valid Atlassian email and password', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Steps
    await loginPage.goto();
    await loginPage.fillEmailAndContinue(requireEnv('APP_EMAIL'));
    await loginPage.fillPasswordAndLogin(requireEnv('APP_PASSWORD'));

    // Expected results
    await expect(page).toHaveURL(/\.atlassian\.net\//);
    await expect(page).not.toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Show error message for invalid login credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Steps
    await loginPage.goto();
    await loginPage.fillEmailAndContinue(testData.auth.invalid_email);
    await loginPage.fillPasswordAndLogin(testData.auth.invalid_password);

    // Expected results
    await loginPage.expectInvalidCredentialsError();
    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Validate email field is not empty on login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Steps
    await loginPage.goto();
    // Leave email empty
    await loginPage.fillEmailAndContinue('');

    // Expected results
    await loginPage.expectEmailRequiredValidation();
  });

  test('Validate password field is not empty on login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Steps
    await loginPage.goto();
    await loginPage.fillEmailAndContinue(testData.auth.any_email);
    // Leave password empty
    await loginPage.fillPasswordAndLogin('');

    // Expected results
    await loginPage.expectPasswordRequiredValidation();
  });

  test('Log out successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    // Preconditions
    await loginPage.loginWithEnvCreds();

    // Steps
    await taskPage.logout();

    // Expected results
    await expect(page).toHaveURL(/login|id\.atlassian\.com\/login/);
  });
});

test.describe('Create Task', () => {
  test('Create a new Jira issue with summary, issue type selection, description, and project assignment', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    // Preconditions
    await loginPage.loginWithEnvCreds();
    await taskPage.gotoBase();

    // Steps
    await taskPage.openCreateIssueDialog();
    await taskPage.selectProject(testData.createIssue.project_name);
    await taskPage.openIssueTypeSelector();
    await taskPage.expectIssueTypeOptionsInclude(['Bug', 'Task', 'Story']);
    await taskPage.selectIssueType(testData.createIssue.issue_type_to_select);

    const summary = uniqueText(testData.createIssue.summary);
    await taskPage.fillSummary(summary);
    await taskPage.fillDescription(testData.createIssue.description);
    await taskPage.submitCreate();

    // Expected results
    await taskPage.expectSummaryVisible(summary);
    await expect(page.getByText(new RegExp(testData.createIssue.issue_type_to_select, 'i'))).toBeVisible();
    await expect(page.getByText(new RegExp(testData.createIssue.project_name, 'i'))).toBeVisible();
    await expect(page.getByText(new RegExp(testData.createIssue.description, 'i'))).toBeVisible();
  });

  test('Display validation error when creating an issue with empty summary', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    // Preconditions
    await loginPage.loginWithEnvCreds();
    await taskPage.gotoBase();

    // Steps
    await taskPage.openCreateIssueDialog();
    await taskPage.selectProject(testData.createIssueValidation.project_name);
    await taskPage.selectIssueType(testData.createIssueValidation.issue_type_to_select);
    // Leave summary empty
    await taskPage.submitCreate();

    // Expected results
    await expect(page.getByText(/summary is required|required/i)).toBeVisible();
    await expect(page).not.toHaveURL(/\/browse\//);
  });
});

test.describe('Edit Task', () => {
  test('Edit an existing issue: update summary, description, issue type, and priority', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    // Preconditions
    await loginPage.loginWithEnvCreds();
    await taskPage.gotoBase();

    // Create an issue to edit
    const created = await taskPage.createIssueViaUi({
      projectName: testData.createIssue.project_name,
      issueType: 'Task',
      summary: uniqueText('Automation - Edit base'),
      description: 'Automation - Edit base description',
    });
    await taskPage.expectSummaryVisible(created.summary);

    // Steps
    const updatedSummary = uniqueText(testData.editIssue.updated_summary);
    await taskPage.updateSummaryAndSave(updatedSummary);

    await taskPage.updateDescriptionAndSave(testData.editIssue.updated_description);

    // Change issue type to a different available type and save
    await taskPage.changeIssueType('Bug');

    // Change priority to a different available priority and save
    await taskPage.changePriority('High');

    // Expected results
    await expect(page.getByText(updatedSummary)).toBeVisible();
    await expect(page.getByText(new RegExp(testData.editIssue.updated_description, 'i'))).toBeVisible();
    await expect(page.getByText(/^bug$/i)).toBeVisible();
    await expect(page.getByText(/^high$/i)).toBeVisible();
  });

  test('Cancel editing without saving changes', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    // Preconditions
    await loginPage.loginWithEnvCreds();
    await taskPage.gotoBase();

    const originalSummary = uniqueText('Automation - Cancel edit original');
    await taskPage.createIssueViaUi({
      projectName: testData.createIssue.project_name,
      issueType: 'Task',
      summary: originalSummary,
      description: 'Automation - Cancel edit base description',
    });
    await taskPage.expectSummaryVisible(originalSummary);

    // Steps
    const summaryInput = page.getByLabel(/summary/i).or(page.getByRole('textbox', { name: /summary/i }));
    await summaryInput.click();
    await summaryInput.fill(testData.cancelEdit.unsaved_summary_edit);
    await taskPage.cancelInlineEdit();

    // Expected results
    await expect(page.getByText(originalSummary)).toBeVisible();
    await expect(page.getByText(testData.cancelEdit.unsaved_summary_edit)).toHaveCount(0);
  });
});

test.describe('Delete Task', () => {
  test('Delete an existing issue after confirming deletion', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    // Preconditions
    await loginPage.loginWithEnvCreds();
    await taskPage.gotoBase();

    const summary = uniqueText('Automation - Delete me');
    await taskPage.createIssueViaUi({
      projectName: testData.createIssue.project_name,
      issueType: 'Task',
      summary,
      description: 'Automation - Delete description',
    });
    await taskPage.expectSummaryVisible(summary);

    const issueUrl = page.url();

    // Steps
    await taskPage.deleteIssueConfirm();

    // Expected results
    // Confirmation dialog assertion is inside deleteIssueConfirm()
    await page.goto(issueUrl, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/you can't view this issue|issue does not exist|not found/i)).toBeVisible({ timeout: 60_000 });
  });

  test('Cancel deletion and keep the issue', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    // Preconditions
    await loginPage.loginWithEnvCreds();
    await taskPage.gotoBase();

    const summary = uniqueText('Automation - Keep me');
    await taskPage.createIssueViaUi({
      projectName: testData.createIssue.project_name,
      issueType: 'Task',
      summary,
      description: 'Automation - Keep description',
    });
    await taskPage.expectSummaryVisible(summary);

    const issueUrl = page.url();

    // Steps
    await taskPage.deleteIssueCancel();

    // Expected results
    await page.goto(issueUrl, { waitUntil: 'domcontentloaded' });
    await taskPage.expectSummaryVisible(summary);
  });
});

test.describe('Mark Task as Completed', () => {
  test('Transition an issue status to Done and show visual indication', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    // Preconditions
    await loginPage.loginWithEnvCreds();
    await taskPage.gotoBase();

    const summary = uniqueText('Automation - Transition to Done');
    await taskPage.createIssueViaUi({
      projectName: testData.createIssue.project_name,
      issueType: 'Task',
      summary,
      description: 'Automation - Transition description',
    });
    await taskPage.expectSummaryVisible(summary);

    // Steps
    await taskPage.transitionToDone();

    // Expected results
    await expect(page.getByText(/^done$/i)).toBeVisible();
  });

  test('Filter and view only completed (Done) issues', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    // Preconditions
    await loginPage.loginWithEnvCreds();
    await taskPage.gotoBase();

    // Create one Done and one not Done issue
    const doneSummary = uniqueText('Automation - Done issue');
    await taskPage.createIssueViaUi({
      projectName: testData.createIssue.project_name,
      issueType: 'Task',
      summary: doneSummary,
      description: 'Automation - Done issue description',
    });
    await taskPage.transitionToDone();

    await taskPage.gotoBase();
    const todoSummary = uniqueText('Automation - Not done issue');
    await taskPage.createIssueViaUi({
      projectName: testData.createIssue.project_name,
      issueType: 'Task',
      summary: todoSummary,
      description: 'Automation - Not done description',
    });

    // Steps
    await taskPage.gotoIssueSearchWithJql('status = Done');

    // Expected results
    await taskPage.expectOnlyDoneIssuesDisplayed();
  });
});
