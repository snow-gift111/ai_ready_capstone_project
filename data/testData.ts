export const testData = {
  employees: {
    defaultFirstName: 'Ava',
    defaultLastName: 'Quinn',
    updatedNickname: 'AQ-Test',
  },
  invalidLogin: {
    username: 'invalid_user',
    password: 'invalid_pass',
  },
  boundary: {
    anyUsername: 'someUser',
    anyPassword: 'somePassword123',
  },
  search: {
    nonExistentEmployeeId: '99999999',
  },
  existingEmployee: {
    searchTerm: 'Existing Employee',
    employeeIdentifierForSearch: 'Existing Employee or Employee ID',
    fieldToModify: 'Nickname',
    unsavedValue: 'ShouldNotSave',
  },
} as const;
