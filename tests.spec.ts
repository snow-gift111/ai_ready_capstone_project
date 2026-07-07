import { expect, test } from '@playwright/test';
import { testData } from './data/testData';
import { LoginPage } from './pages/LoginPage';
import { TaskPage } from './pages/TaskPage';
import { ensureEnv, uniqueSummary } from './utils/helpers';

// NOTE: Exactly one test() per provided test case.

async function loginValidUser(page) {
  const email = await ensureEnv('APP_EMAIL');
  const password = await ensureEnv('APP_PASSWORD');
  const loginPage = new LoginPage(page);
  await loginPage.login(email, password);
}

async function gotoApp(page) {
  const appUrl = await ensureEnv('APP_URL');
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
}

