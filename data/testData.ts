export const testData = {
  baseUrl: process.env.APP_BASE_URL,
  jiraUrl: process.env.APP_BASE_URL,
  user: {
    email: process.env.APP_EMAIL,
    password: process.env.APP_PASSWORD
  },
  login: {
    invalidEmail: 'valid.user@example.com',
    invalidPassword: 'WrongPassword!',
    anyPassword: 'AnyPassword123!',
    anyEmail: 'valid.user@example.com'
  },
  issue: {
    project: 'Sample Project',
    issueTypeTask: 'Task',
    issueTypeBug: 'Bug',
    issueTypeStory: 'Story',
    summary: 'Create test issue summary',
    description: 'Create test issue description',
    updatedSummary: 'Updated summary text',
    updatedDescription: 'Updated description text',
    updatedPriority: 'High',
    attemptedSummaryChange: 'This change should not be saved'
  }
} as const;

export type TestData = typeof testData;
