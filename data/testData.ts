export type CreateIssueData = {
  project?: string;
  issueType?: string;
  summary?: string;
  description?: string;
};

export type EditIssueData = {
  updatedSummary?: string;
  updatedDescription?: string;
  updatedIssueType?: string;
  updatedPriority?: string;
};

export const testData = {
  auth: {
    // NOTE: Atlassian credentials must come from environment variables.
    // These values are placeholders used only when APP_EMAIL is not set.
    emailFallback: 'valid.user@example.com',
    invalidPassword: 'WrongPassword!'
  },

  create: {
    project: 'Sample Project',
    issueType: 'Task',
    summary: 'Create issue - automation',
    description: 'Issue description for automation'
  } satisfies CreateIssueData,

  createEmptySummary: {
    project: 'Sample Project',
    issueType: 'Bug'
  } satisfies CreateIssueData,

  edit: {
    updatedSummary: 'Updated summary - automation',
    updatedDescription: 'Updated description - automation',
    updatedIssueType: 'Story',
    updatedPriority: 'High'
  } satisfies EditIssueData,

  cancelEdit: {
    unsavedSummary: 'Unsaved summary change - should not persist'
  },

  misc: {
    anyPassword: 'AnyPassword123!'
  }
} as const;