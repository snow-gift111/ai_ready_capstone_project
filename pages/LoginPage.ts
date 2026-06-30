import { expect, Page } from '@playwright/test';
import { requireEnv, waitForAtlassianRedirect } from '../utils/helpers';

export class LoginPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoAtlassianLogin(): Promise<void> {
    // ATLASSIAN LOGIN
    // 1. Go to https://id.atlassian.com/login
    await this.page.goto('https://id.atlassian.com/login', {
      waitUntil: 'domcontentloaded'
    });
    await expect(this.page).toHaveURL(/id\.atlassian\.com\/login/);
  }

  async enterEmail(email: string): Promise<void> {
    // 2. Fill Email
    const emailField = this.page.getByLabel(/email/i).or(this.page.getByPlaceholder(/email/i));
    await emailField.fill(email);
  }

  async clickContinue(): Promise<void> {
    // 3. Click Continue
    const continueBtn = this.page.getByRole('button', { name: /continue/i });
    await continueBtn.click();
  }

  async waitForPasswordField(): Promise<void> {
    // 4. Wait for password field
    const passwordField = this.page.getByLabel(/password/i).or(this.page.getByPlaceholder(/password/i));
    await expect(passwordField).toBeVisible({ timeout: 30_000 });
  }

  async enterPassword(password: string): Promise<void> {
    // 5. Fill Password
    const passwordField = this.page.getByLabel(/password/i).or(this.page.getByPlaceholder(/password/i));
    await passwordField.fill(password);
  }

  async clickLogin(): Promise<void> {
    // 6. Click Log in
    const loginBtn = this.page.getByRole('button', { name: /log in/i });
    await loginBtn.click();
  }

  async loginWithEnvCredentials(appUrl?: string): Promise<void> {
    const email = process.env.APP_EMAIL;
    const password = process.env.APP_PASSWORD;
    if (!email || !password) {
      // Fail early: credentials are required for authenticated flows
      requireEnv('APP_EMAIL');
      requireEnv('APP_PASSWORD');
    }

    await this.gotoAtlassianLogin();
    await this.enterEmail(email!);
    await this.clickContinue();
    await this.waitForPasswordField();
    await this.enterPassword(password!);
    await this.clickLogin();

    // 7. Wait for redirect to *.atlassian.net
    await waitForAtlassianRedirect(this.page);

    // If caller provided a Jira base URL, ensure we're on that tenant.
    if (appUrl) {
      await this.page.goto(appUrl, { waitUntil: 'domcontentloaded' });
      await expect(this.page).toHaveURL(new RegExp(appUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  }

  async assertInvalidCredentialsError(): Promise<void> {
    // Atlassian error text varies; assert on common patterns.
    await expect(this.page.locator('body')).toContainText(
      /incorrect|invalid|couldn'?t log you in|wrong email|wrong password/i
    );
  }

  async assertEmailRequired(): Promise<void> {
    await expect(this.page.locator('body')).toContainText(/email.*required|enter.*email/i);
  }
}