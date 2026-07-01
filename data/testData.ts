export const testData = {
  jiraBaseUrl: process.env.APP_BASE_URL, // should be set in CI/local env
  auth: {
    // Credentials must come from env vars; values below are placeholders for negative tests only
    invalidEmail: 'invalid.user@example.com',
    invalidPassword: 'WrongPassword!',
    anyPassword: 'AnyPassword123!',
  },
  createIssue: {
    project: 'Any Available Project',
    issueTypeTask: 'Task',
    issueTypeBug: 'Bug',
    summary: 'Automation - Create issue with required fields',
    description: 'Created by automated test',
  },
  editIssue: {
    newSummary: 'Automation - Updated summary',
    newDescription: 'Automation - Updated description',
    newIssueType: 'Story',
    newPriority: 'High',
    attemptedSummaryChange: 'Automation - Change should not be saved',
  },
};

export type TestData = typeof testData;
