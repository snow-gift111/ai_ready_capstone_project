export const testData = {
  jira: {
    baseUrl: process.env.APP_BASE_URL,
  },
  login: {
    validEmail: process.env.APP_EMAIL,
    validPassword: process.env.APP_PASSWORD,
    invalidPassword: 'WrongPassword!',
    anyPassword: 'AnyPassword123!',
    anyEmail: 'valid.user@example.com',
  },
  issue: {
    create: {
      issueTypeTask: 'Task',
      issueTypeBug: 'Bug',
      issueTypeStory: 'Story',
      summary: 'Automation - Create issue happy path',
      description: 'Created via automated test.',
    },
    edit: {
      newSummary: 'Automation - Updated summary',
      newDescription: 'Automation - Updated description',
      newIssueType: 'Story',
      newPriority: 'High',
      unsavedSummary: 'Automation - Unsaved change',
    },
  },
} as const;
