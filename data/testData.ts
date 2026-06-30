// Test data is intentionally environment-driven.
// Never hardcode URLs or real credentials.

export type JiraTestData = {
  baseUrl: string;
  userEmail: string;
  userPassword: string;
  invalidPassword: string;
  anyPassword: string;
  projectName: string;
  createIssueType: string;
  createSummary: string;
  createDescription: string;
  emptySummaryIssueType: string;
  updatedSummary: string;
  updatedDescription: string;
  updatedIssueType: string;
  updatedPriority: string;
  unsavedSummary: string;
};

export const testData: JiraTestData = {
  baseUrl: process.env.APP_URL || '',
  userEmail: process.env.APP_EMAIL || '',
  userPassword: process.env.APP_PASSWORD || '',

  // Negative/boundary inputs (non-secret)
  invalidPassword: process.env.APP_INVALID_PASSWORD || 'WrongPassword!',
  anyPassword: process.env.APP_ANY_PASSWORD || 'AnyPassword123!',

  // Jira-specific data (override via env when your instance differs)
  projectName: process.env.JIRA_PROJECT || 'Sample Project',
  createIssueType: process.env.JIRA_ISSUE_TYPE || 'Task',
  createSummary: process.env.JIRA_CREATE_SUMMARY || 'Create issue - automation summary',
  createDescription: process.env.JIRA_CREATE_DESCRIPTION || 'Create issue - automation description',
  emptySummaryIssueType: process.env.JIRA_EMPTY_SUMMARY_ISSUE_TYPE || 'Bug',

  updatedSummary: process.env.JIRA_UPDATED_SUMMARY || 'Updated summary - automation',
  updatedDescription: process.env.JIRA_UPDATED_DESCRIPTION || 'Updated description - automation',
  updatedIssueType: process.env.JIRA_UPDATED_ISSUE_TYPE || 'Story',
  updatedPriority: process.env.JIRA_UPDATED_PRIORITY || 'High',

  unsavedSummary: process.env.JIRA_UNSAVED_SUMMARY || 'Unsaved summary change - automation',
};
