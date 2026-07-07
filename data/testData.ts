export const testData = {
  jira: {
    // URL is intentionally not hardcoded; set APP_URL in env.
  },
  auth: {
    validEmail: process.env.APP_EMAIL || '',
    validPassword: process.env.APP_PASSWORD || ''
  },
  issue: {
    project: 'Sample Project',
    issueTypeTask: 'Task',
    issueTypeBug: 'Bug',
    issueTypeStory: 'Story',
    summaryCreate: 'Create issue - automation',
    descriptionCreate: 'Issue description entered by automated test.',
    summaryUpdated: 'Updated summary - automation',
    descriptionUpdated: 'Updated description - automation',
    priorityHigh: 'High',
    unsavedSummary: 'Unsaved change - should not persist'
  }
} as const;
