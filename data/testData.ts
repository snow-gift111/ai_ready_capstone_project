export const testData = {
  jira: {
    // Base URL must come from process.env.APP_URL
    // Do not hardcode tenant URLs in code.
  },
  auth: {
    valid_email: 'valid.user@example.com',
    valid_password: 'ValidPassword123!',
    invalid_email: 'invalid.user@example.com',
    invalid_password: 'WrongPassword!',
    any_email: 'valid.user@example.com',
    any_password: 'AnyPassword123!',
  },
  createIssue: {
    project_name: 'Sample Project',
    issue_type_to_select: 'Task',
    summary: 'Automation - Create issue summary',
    description: 'Automation - Create issue description',
  },
  createIssueValidation: {
    project_name: 'Sample Project',
    issue_type_to_select: 'Bug',
  },
  editIssue: {
    updated_summary: 'Automation - Updated summary',
    updated_description: 'Automation - Updated description',
  },
  cancelEdit: {
    unsaved_summary_edit: 'Automation - Unsaved summary change',
  },
};

export type TestData = typeof testData;
