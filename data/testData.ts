export const testData = {
  app: {
    url: process.env.APP_URL ?? 'https://snowgift.atlassian.net',
    email: process.env.APP_EMAIL ?? process.env.JIRA_EMAIL ?? 'valid.user@example.com',
    password: process.env.APP_PASSWORD ?? process.env.JIRA_PASSWORD ?? 'ValidPassword123!',
    projectName: process.env.APP_PROJECT_NAME ?? 'Sample Project',
    existingIssueKey: process.env.APP_EXISTING_ISSUE_KEY ?? '',
  },
  auth: {
    invalidPassword: 'WrongPassword!',
    anyPassword: 'AnyPassword123!',
  },
  issue: {
    create: {
      issueType: 'Task',
      summary: 'Create issue - automation test',
      description: 'Description for create issue test',
    },
    createNegative: {
      issueType: 'Bug',
    },
    edit: {
      updatedSummary: 'Updated summary - automation',
      updatedDescription: 'Updated description - automation',
      updatedIssueType: 'Story',
      updatedPriority: 'High',
      temporarySummaryChange: 'This change should not be saved',
    },
  },
};
