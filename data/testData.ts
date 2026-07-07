export const testData = {
  issue: {
    project: 'Sample Project',
    issueTypeTask: 'Task',
    issueTypeBug: 'Bug',
    issueTypeStory: 'Story',
    summary: 'Create issue - automation summary',
    description: 'Create issue - automation description',
    updatedSummary: 'Updated summary - automation',
    updatedDescription: 'Updated description - automation',
    updatedPriority: 'High',
    tempSummaryChange: 'This change should not be saved',
  },
  login: {
    // Credentials are always sourced from process.env in the framework.
    // These values are only here to reflect approved test case data.
    validEmailExample: 'valid.user@example.com',
    invalidPasswordExample: 'WrongPassword!',
  },
};
