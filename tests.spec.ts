import { test, expect } from '@playwright/test';
import { testData } from './data/testData';
import { LoginPage } from './pages/LoginPage';
import { TaskPage } from './pages/TaskPage';
import { ensureEnv } from './utils/helpers';

test.describe('User Authentication', () => {
  test('Log in successfully with valid Atlassian email and password', async ({ page }) => {
    await ensureEnv('APP_URL', testData.baseUrl);
    await ensureEnv('APP_EMAIL', testData.userEmail);
    await ensureEnv('APP_PASSWORD', testData.userPassword);

    // Steps -> actions
    // Navigate to the Jira site URL
    await page.goto(testData.baseUrl, { waitUntil: 'domcontentloaded' });

    const loginPage = new LoginPage(page);

    // Enter a valid Atlassian email in the email field
    // Enter the matching valid password in the password field
    // Submit the login form
    await loginPage.login(testData.userEmail, testData.userPassword);

    // Expected results -> assertions
    // User is authenticated successfully
    // A logged-in landing page is displayed
    await expect(page).toHaveURL(/https:\/\/.*\.atlassian\.net\/.*/);
    await expect(page.getByRole('banner').or(page.getByRole('navigation'))).toBeVisible({ timeout: 60_000 });
  });

  test('Show error message for invalid login credentials', async ({ page }) => {
    await ensureEnv('APP_URL', testData.baseUrl);
    await ensureEnv('APP_EMAIL', testData.userEmail);

    const loginPage = new LoginPage(page);

    // Steps
    // Navigate to the Jira site URL
    await page.goto(testData.baseUrl, { waitUntil: 'domcontentloaded' });

    // Enter an Atlassian email in the email field
    // Enter an invalid password in the password field
    // Submit the login form
    await loginPage.gotoAtlassianLogin();
    await loginPage.attemptLogin(testData.userEmail, testData.invalidPassword);

    // Expected
    // An error message is displayed indicating the credentials are invalid
    await loginPage.assertLoginError();

    // User remains logged out
    await expect(page).toHaveURL(/id\.atlassian\.com\/login/);
  });

  test('Validate email is required on login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Steps
    // Navigate to the Jira site URL
    await loginPage.gotoAtlassianLogin();

    // Leave the email field empty
    // Enter any value in the password field
    // Submit the login form
    // Atlassian does not show password field unless Continue is clicked.
    await loginPage.attemptLogin('', null);

    // Expected
    // A validation message is displayed indicating the email field is required
    // Login is not submitted successfully
    await expect(page.getByText(/enter your email|email is required|please enter/i)).toBeVisible({ timeout: 30_000 });
  });

  test('Validate password is required on login', async ({ page }) => {
    await ensureEnv('APP_EMAIL', testData.userEmail);

    const loginPage = new LoginPage(page);

    // Steps
    // Navigate to the Jira site URL
    await loginPage.gotoAtlassianLogin();

    // Enter a valid Atlassian email in the email field
    // Leave the password field empty
    // Submit the login form
    await loginPage.attemptLogin(testData.userEmail, '');

    // Expected
    // A validation message is displayed indicating the password field is required
    // Login is not submitted successfully
    await expect(page.getByText(/password is required|enter your password|please enter/i)).toBeVisible({ timeout: 30_000 });
  });

  test('Log out successfully', async ({ page }) => {
    await ensureEnv('APP_URL', testData.baseUrl);
    await ensureEnv('APP_EMAIL', testData.userEmail);
    await ensureEnv('APP_PASSWORD', testData.userPassword);

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    // Preconditions: User is logged in
    await page.goto(testData.baseUrl, { waitUntil: 'domcontentloaded' });
    await loginPage.login(testData.userEmail, testData.userPassword);
    await taskPage.gotoBaseUrl(testData.baseUrl);

    // Steps
    // Open the user account/profile menu
    await taskPage.profileButton.first().click({ timeout: 30_000 });

    // Select the logout option
    await page.getByRole('menuitem', { name: /log out|logout/i }).click({ timeout: 10_000 });

    // Expected
    // User is logged out successfully
    // A logged-out page or login page is displayed
    await expect(page).toHaveURL(/id\.atlassian\.com\/login|\/login/i, { timeout: 60_000 });
  });
});

test.describe('Create Task', () => {
  test('Create a new Jira issue with summary, issue type, description, and project assignment', async ({ page }) => {
    await ensureEnv('APP_URL', testData.baseUrl);
    await ensureEnv('APP_EMAIL', testData.userEmail);
    await ensureEnv('APP_PASSWORD', testData.userPassword);

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    // Preconditions
    await page.goto(testData.baseUrl, { waitUntil: 'domcontentloaded' });
    await loginPage.login(testData.userEmail, testData.userPassword);
    await taskPage.gotoBaseUrl(testData.baseUrl);

    // Steps
    // Open the create issue flow
    // Select a project
    // Select an issue type
    // Enter a summary
    // Enter a description
    // Submit the create issue form
    const issueKey = await taskPage.createIssue({
      project: testData.projectName,
      issueType: testData.createIssueType,
      summary: testData.createSummary,
      description: testData.createDescription,
    });

    // Expected
    // A new issue is created successfully
    expect(issueKey).toMatch(/[A-Z]+-\d+/);

    await taskPage.openIssueByKey(testData.baseUrl, issueKey);

    // The created issue displays the selected project
    // The created issue displays the selected issue type
    // The created issue displays the entered summary
    // The created issue displays the entered description
    await expect(page.getByText(testData.projectName)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(new RegExp(testData.createIssueType, 'i'))).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(testData.createSummary)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(testData.createDescription)).toBeVisible({ timeout: 60_000 });
  });

  test('Show validation error when creating an issue with empty summary', async ({ page }) => {
    await ensureEnv('APP_URL', testData.baseUrl);
    await ensureEnv('APP_EMAIL', testData.userEmail);
    await ensureEnv('APP_PASSWORD', testData.userPassword);

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    // Preconditions
    await page.goto(testData.baseUrl, { waitUntil: 'domcontentloaded' });
    await loginPage.login(testData.userEmail, testData.userPassword);
    await taskPage.gotoBaseUrl(testData.baseUrl);

    // Steps
    await taskPage.openCreateIssue();
    await (taskPage as any).selectFromCombobox?.(taskPage.projectField, testData.projectName);
    await (taskPage as any).selectFromCombobox?.(taskPage.issueTypeField, testData.emptySummaryIssueType);

    // Leave the summary field empty
    await taskPage.summaryField.fill('');

    // Submit the create issue form
    await taskPage.createSubmitButton.click();

    // Expected
    // A validation error is displayed indicating the summary is required
    await taskPage.assertCreateSummaryRequired();

    // No issue is created (assert dialog still open)
    await expect(taskPage.createModal).toBeVisible();
  });
});

test.describe('Edit Task', () => {
  test('Edit an existing issue: update summary, description, issue type, and priority', async ({ page }) => {
    await ensureEnv('APP_URL', testData.baseUrl);
    await ensureEnv('APP_EMAIL', testData.userEmail);
    await ensureEnv('APP_PASSWORD', testData.userPassword);

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    // Preconditions: create an issue to edit
    await page.goto(testData.baseUrl, { waitUntil: 'domcontentloaded' });
    await loginPage.login(testData.userEmail, testData.userPassword);
    await taskPage.gotoBaseUrl(testData.baseUrl);

    const issueKey = await taskPage.createIssue({
      project: testData.projectName,
      issueType: testData.createIssueType,
      summary: `${testData.createSummary} - for edit`,
      description: `${testData.createDescription} - for edit`,
    });

    await taskPage.openIssueByKey(testData.baseUrl, issueKey);

    // Steps
    // Enter edit mode for the issue (handled inline)
    // Update the summary
    await taskPage.editSummary(testData.updatedSummary);

    // Update the description
    await taskPage.editDescription(testData.updatedDescription);

    // Change the issue type
    await taskPage.changeIssueType(testData.updatedIssueType);

    // Change the priority
    await taskPage.changePriority(testData.updatedPriority);

    // Save the changes (inline saves as you confirm)

    // Expected
    await expect(page.getByText(testData.updatedSummary)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(testData.updatedDescription)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(new RegExp(testData.updatedIssueType, 'i'))).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(new RegExp(testData.updatedPriority, 'i'))).toBeVisible({ timeout: 60_000 });
  });

  test('Cancel editing an issue without saving changes', async ({ page }) => {
    await ensureEnv('APP_URL', testData.baseUrl);
    await ensureEnv('APP_EMAIL', testData.userEmail);
    await ensureEnv('APP_PASSWORD', testData.userPassword);

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    // Preconditions: create an issue
    await page.goto(testData.baseUrl, { waitUntil: 'domcontentloaded' });
    await loginPage.login(testData.userEmail, testData.userPassword);
    await taskPage.gotoBaseUrl(testData.baseUrl);

    const originalSummary = `${testData.createSummary} - cancel edit`;
    const issueKey = await taskPage.createIssue({
      project: testData.projectName,
      issueType: testData.createIssueType,
      summary: originalSummary,
      description: testData.createDescription,
    });

    await taskPage.openIssueByKey(testData.baseUrl, issueKey);

    // Steps
    // Enter edit mode for the issue
    const summaryEditable = page.locator('[data-testid*="summary"], [aria-label*="Summary"]').first();
    await summaryEditable.click();

    // Modify the summary field
    const summaryInput = page.getByRole('textbox', { name: /summary/i }).or(page.locator('input[name="summary"]'));
    await expect(summaryInput).toBeVisible({ timeout: 10_000 });
    await summaryInput.fill(testData.unsavedSummary);

    // Cancel editing
    await page.keyboard.press('Escape');

    // Expected
    // Edit mode is exited
    await expect(summaryInput).toBeHidden({ timeout: 10_000 });

    // The issue does not reflect the unsaved summary change
    await expect(page.getByText(originalSummary)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(testData.unsavedSummary)).toHaveCount(0);
  });
});

test.describe('Delete Task', () => {
  test('Delete an existing issue after confirmation', async ({ page }) => {
    await ensureEnv('APP_URL', testData.baseUrl);
    await ensureEnv('APP_EMAIL', testData.userEmail);
    await ensureEnv('APP_PASSWORD', testData.userPassword);

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    // Preconditions: create an issue to delete
    await page.goto(testData.baseUrl, { waitUntil: 'domcontentloaded' });
    await loginPage.login(testData.userEmail, testData.userPassword);
    await taskPage.gotoBaseUrl(testData.baseUrl);

    const issueKey = await taskPage.createIssue({
      project: testData.projectName,
      issueType: testData.createIssueType,
      summary: `${testData.createSummary} - for delete`,
      description: testData.createDescription,
    });

    await taskPage.openIssueByKey(testData.baseUrl, issueKey);

    // Steps
    // Initiate the delete action
    // Confirm deletion in the confirmation prompt
    await taskPage.deleteIssueConfirm();

    // Expected
    // A confirmation prompt is displayed before deletion (implicitly by dialog expect)
    // The issue is deleted successfully
    await expect(page.getByText(/issue deleted|deleted/i)).toBeVisible({ timeout: 30_000 });

    // The deleted issue is no longer accessible from its previous URL or key
    await taskPage.openIssueByKey(testData.baseUrl, issueKey);
    await expect(page.getByText(/you can't view this issue|issue does not exist|not found/i)).toBeVisible({ timeout: 30_000 });
  });

  test('Cancel deletion from the confirmation prompt', async ({ page }) => {
    await ensureEnv('APP_URL', testData.baseUrl);
    await ensureEnv('APP_EMAIL', testData.userEmail);
    await ensureEnv('APP_PASSWORD', testData.userPassword);

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    // Preconditions: create an issue to delete
    await page.goto(testData.baseUrl, { waitUntil: 'domcontentloaded' });
    await loginPage.login(testData.userEmail, testData.userPassword);
    await taskPage.gotoBaseUrl(testData.baseUrl);

    const issueKey = await taskPage.createIssue({
      project: testData.projectName,
      issueType: testData.createIssueType,
      summary: `${testData.createSummary} - cancel delete`,
      description: testData.createDescription,
    });

    await taskPage.openIssueByKey(testData.baseUrl, issueKey);

    // Steps
    // Initiate the delete action
    // Cancel deletion in the confirmation prompt
    await taskPage.deleteIssueCancel();

    // Expected
    // A confirmation prompt is displayed before deletion (implicitly by dialog expect)
    // The issue is not deleted
    // The issue remains accessible
    await expect(page.getByText(issueKey)).toBeVisible({ timeout: 60_000 });
  });
});

test.describe('Mark Task as Completed', () => {
  test('Transition an issue status to Done and verify visual indication', async ({ page }) => {
    await ensureEnv('APP_URL', testData.baseUrl);
    await ensureEnv('APP_EMAIL', testData.userEmail);
    await ensureEnv('APP_PASSWORD', testData.userPassword);

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    // Preconditions: create an issue in a status that can be transitioned
    await page.goto(testData.baseUrl, { waitUntil: 'domcontentloaded' });
    await loginPage.login(testData.userEmail, testData.userPassword);
    await taskPage.gotoBaseUrl(testData.baseUrl);

    const issueKey = await taskPage.createIssue({
      project: testData.projectName,
      issueType: testData.createIssueType,
      summary: `${testData.createSummary} - transition`,
      description: testData.createDescription,
    });

    await taskPage.openIssueByKey(testData.baseUrl, issueKey);

    // Steps
    // Change the issue status to Done
    await taskPage.transitionToDone();

    // Expected
    // The issue status is updated to Done
    // The issue is visually indicated as Done in the UI
    await expect(page.getByText(/^done$/i)).toBeVisible({ timeout: 60_000 });
  });

  test('Filter and view only completed (Done) issues', async ({ page }) => {
    await ensureEnv('APP_URL', testData.baseUrl);
    await ensureEnv('APP_EMAIL', testData.userEmail);
    await ensureEnv('APP_PASSWORD', testData.userPassword);

    const loginPage = new LoginPage(page);
    const taskPage = new TaskPage(page);

    // Preconditions: logged in
    await page.goto(testData.baseUrl, { waitUntil: 'domcontentloaded' });
    await loginPage.login(testData.userEmail, testData.userPassword);

    // Steps
    // Navigate to the issues list/search view
    await taskPage.gotoIssueSearch(testData.baseUrl);

    // Apply the filter to show only completed issues
    await taskPage.filterDoneIssues();

    // Expected
    // Only issues with status Done are displayed in the results
    // Issues with statuses other than Done are not displayed in the results
    await taskPage.assertOnlyDoneIssuesListed();
  });
});
