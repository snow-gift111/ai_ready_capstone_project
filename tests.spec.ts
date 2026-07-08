import { test, expect } from '@playwright/test';
import { testData } from './data/testData';
import { LoginPage } from './pages/LoginPage';
import { TaskPage } from './pages/TaskPage';
import { requireEnv } from './utils/helpers';

test('User logs in, creates an issue, edits it, marks it Done, filters completed issues, deletes the issue, and logs out', async ({ page, baseURL }) => {
  const loginPage = new LoginPage(page);
  const taskPage = new TaskPage(page);

  // Login
  await loginPage.loginWithEnv();
  await taskPage.dismissPostLoginPopups();

  // Create issue
  const { issueKey } = await taskPage.createIssue({
    projectName: process.env.JIRA_PROJECT || testData.issue.projectName,
    issueType: testData.issue.issueTypeInitial,
    summary: testData.issue.summaryInitial,
    description: testData.issue.descriptionInitial,
  });

  // Open created issue (in case modal didn't navigate)
  await taskPage.openIssue(issueKey);

  // Edit issue
  await taskPage.editIssue({
    summary: testData.issue.summaryUpdated,
    description: testData.issue.descriptionUpdated,
    issueType: testData.issue.issueTypeUpdated,
    priority: testData.issue.priorityUpdated,
  });

  await taskPage.expectSummaryToBe(testData.issue.summaryUpdated);
  await taskPage.expectDescriptionToContain(testData.issue.descriptionUpdated);

  // Mark Done
  await taskPage.transitionToDone();
  await expect(page.getByText(/^done$/i)).toBeVisible();

  // Completed issues view + filter
  const resolvedBase = baseURL || testData.app.baseUrl;
  await taskPage.openCompletedIssuesView(resolvedBase);
  await taskPage.expectIssuePresentInList(issueKey);

  // Open issue from list
  await taskPage.openIssue(issueKey);

  // Delete
  await taskPage.initiateDeleteIssue();
  // Confirmation visible is part of expected results
  await expect(page.getByRole('dialog').filter({ hasText: /delete/i })).toBeVisible();
  await taskPage.confirmDeletion();
  await taskPage.expectIssueNotAccessible(issueKey);

  // Logout
  await taskPage.logout();
});

test('Invalid login credentials display an error message', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.login(testData.auth.invalidEmail, testData.auth.invalidPassword);
  await loginPage.expectInvalidLoginError();
});

test('Email field is required for login', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.expectEmailRequiredError();
});

test('Password field is required for login', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.expectPasswordRequiredError(testData.auth.anyEmail);
});

test('Creating an issue with an empty summary shows a validation error and prevents creation', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const taskPage = new TaskPage(page);

  await loginPage.loginWithEnv();
  await taskPage.dismissPostLoginPopups();

  const dialog = await taskPage.openCreateIssue();

  // Select project (optional; best-effort)
  const project = process.env.JIRA_PROJECT;
  if (project) {
    await dialog.getByRole('combobox', { name: /project/i }).click();
    await page.getByRole('option', { name: new RegExp(project, 'i') }).first().click();
  }

  // Select issue type
  await dialog.getByRole('combobox', { name: /issue type/i }).click();
  await page.getByRole('option', { name: new RegExp(testData.issue.issueTypeInitial, 'i') }).first().click();

  // Leave summary empty
  await dialog.getByRole('textbox', { name: /summary/i }).fill('');

  // Submit
  await dialog.getByRole('button', { name: /^create$/i }).click();

  // Assert validation
  await expect(page.getByText(/summary.*required|enter a summary|provide a summary/i)).toBeVisible();
  await expect(dialog).toBeVisible();
});

test('Cancel editing without saving does not change the issue', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const taskPage = new TaskPage(page);

  await loginPage.loginWithEnv();
  await taskPage.dismissPostLoginPopups();

  // Ensure an issue exists to edit (self-contained precondition).
  const { issueKey } = await taskPage.createIssue({
    projectName: process.env.JIRA_PROJECT || testData.issue.projectName,
    issueType: testData.issue.issueTypeInitial,
    summary: `Automation - existing issue for edit (${Date.now()})`,
    description: 'Automation - baseline description',
  });

  await taskPage.openIssue(issueKey);

  // Capture original summary
  const originalSummary = (await page.getByRole('heading', { level: 1 }).innerText()).trim();

  // Start edit, modify summary, cancel
  await taskPage.cancelEdit({ summary: testData.issue.editedSummaryValue });

  // Assert unchanged
  await taskPage.expectSummaryToBe(originalSummary);

  // Cleanup
  await taskPage.initiateDeleteIssue();
  await taskPage.confirmDeletion();
});

test('Cancel deletion keeps the issue intact', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const taskPage = new TaskPage(page);

  await loginPage.loginWithEnv();
  await taskPage.dismissPostLoginPopups();

  // Ensure an issue exists to delete (self-contained precondition).
  const { issueKey } = await taskPage.createIssue({
    projectName: process.env.JIRA_PROJECT || testData.issue.projectName,
    issueType: testData.issue.issueTypeInitial,
    summary: `Automation - existing issue for delete (${Date.now()})`,
    description: 'Automation - baseline description',
  });

  await taskPage.openIssue(issueKey);

  // Initiate delete then cancel
  await taskPage.initiateDeleteIssue();
  await taskPage.cancelDeletion();

  // Assert still accessible and visible
  await taskPage.openIssue(issueKey);
  await expect(page.getByText(issueKey)).toBeVisible();

  // Cleanup (delete after asserting cancel behavior)
  await taskPage.initiateDeleteIssue();
  await taskPage.confirmDeletion();
});
