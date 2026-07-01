import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { TaskPage } from './pages/TaskPage';
import { testData } from './data/testData';
import { getEnvOrThrow } from './utils/helpers';

// NOTE: Exactly one test() per incoming test case.

test.describe('User Authentication', () => {
  // TODO: implement tests TC-001..TC-004
});

test.describe('Create Task', () => {
  // TODO: implement tests TC-005..TC-006
});

test.describe('Edit Task', () => {
  // TODO: implement tests TC-007..TC-008
});

test.describe('Delete Task', () => {
  // TODO: implement tests TC-009..TC-010
});

test.describe('Mark Task as Completed', () => {
  // TODO: implement tests TC-011..TC-012
});
