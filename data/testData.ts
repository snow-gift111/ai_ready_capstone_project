export const testData = {
  app: {
    baseUrl: 'https://snowgift.atlassian.net',
  },
  auth: {
    // NOTE: valid credentials must be provided via env vars (JIRA_EMAIL/JIRA_PASSWORD).
    validEmailPlaceholder: 'valid.user@example.com',
    validPasswordPlaceholder: 'ValidPassword123!',
    invalidEmail: 'invalid.user@example.com',
    invalidPassword: 'WrongPassword!',
    anyEmail: 'valid.user@example.com',
    anyPassword: 'AnyPassword123!',
  },
  issue: {
    projectName: 'Any existing project',
    issueTypeInitial: 'Task',
    issueTypeUpdated: 'Bug',
    summaryInitial: 'Automation - create issue summary',
    descriptionInitial: 'Automation - create issue description',
    summaryUpdated: 'Automation - updated summary',
    descriptionUpdated: 'Automation - updated description',
    priorityUpdated: 'High',
    editedSummaryValue: 'Automation - unsaved summary change',
  },
} as const;
