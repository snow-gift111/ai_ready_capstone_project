// Test data and defaults for Jira Task Management

export const testData = {
  jira: {
    // Never hardcode credentials in code.
    email: process.env.APP_EMAIL ?? '',
    password: process.env.APP_PASSWORD ?? '',
    baseUrl: process.env.APP_URL ?? '',
    projectName: process.env.APP_PROJECT_NAME
  },
  auth: {
    invalidPassword: 'WrongPassword!',
    anyPassword: 'AnyPassword123'
  },
  issues: {
    create: {
      summary: 'Automation - Create issue summary',
      description: 'Automation - Create issue description'
    },
    edit: {
      newSummary: 'Automation - Updated summary',
      newDescription: 'Automation - Updated description',
      newIssueType: 'Bug' as const,
      newPriority: 'High' as const
    },
    cancelEdit: {
      attemptedSummary: 'Automation - Not saved summary',
      attemptedDescription: 'Automation - Not saved description'
    }
  }
} as const;

export type IssueTypeOption = 'Bug' | 'Task' | 'Story';
export type PriorityOption = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
