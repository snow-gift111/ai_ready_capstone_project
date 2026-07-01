export const testData = {
  createIssue: {
    project: 'Sample Project',
    issueTypeTask: 'Task',
    issueTypeBug: 'Bug',
    summary: 'Create issue - automation summary',
    description: 'Create issue - automation description',
  },
  editIssue: {
    newSummary: 'Updated summary - automation',
    newDescription: 'Updated description - automation',
    newIssueType: 'Story',
    newPriority: 'High',
    attemptedSummaryChange: 'This change should not be saved',
  },
  jql: {
    doneOnly: 'status = Done ORDER BY created DESC',
  },
} as const;
