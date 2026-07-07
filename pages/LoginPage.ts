import { expect, type Locator, type Page } from '@playwright/test';

import { ensureEnv, waitForAtlassianRedirect } from '../utils/helpers';

export class LoginPage {
  constructor(private readonly page: Page) {}

  private emailInput(): Locator {
    return this.page.getByLabel(/email/i).or(this.page.getByPlaceholder(/email/i));
  }

  private continueButton(): Locator {
    return this.page.getByRole('button', { name: /continue/i });
  }

  private passwordInput(): Locator {
    return this.page.getByLabel(/password/i).or(this.page.getByPlaceholder(/password/i));
  }

  private loginButton(): Locator {
    return this.page.getByRole('button', { name: /^log in$/i }).or(this.page.getByRole('button', { name: /log in/i }));
  }

  private errorBanner(): Locator {
    return this.page.getByText(/incorrect email address and\/or password|we couldn't log you in|log in failed|sorry, we couldn\x27t log you in/i);
  }

  async gotoAtlassianLogin(): Promise<void> {
    await this.page.goto('https://id.atlassian.com/login', { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/id\.atlassian\.com\/login/);
  }

  /**
   * Login flow MUST be:
   * - Navigate to https://id.atlassian.com/login
   * - Fill Email
   * - Click Continue
   * - Wait for password field
   * - Fill Password
   * - Click Log in
   * - Wait until redirected to *.atlassian.net
   */
  async loginWithEnvCreds(): Promise<void> {
    const email = await ensureEnv('APP_EMAIL');
    const password = await ensureEnv('APP_PASSWORD');
    await this.login(email, password);
  }

  async login(email: string, password: string): Promise<void> {
    await this.gotoAtlassianLogin();
    await this.emailInput().fill(email);
    await this.continueButton().click();
    await this.passwordInput().waitFor({ state: 'visible', timeout: 30_000 });
    await this.passwordInput().fill(password);
    await this.loginButton().click();
    await waitForAtlassianRedirect(this.page);
  }

  async expectInvalidCredentialsError(): Promise<void> {
    await expect(this.errorBanner()).toBeVisible({ timeout: 30_000 });
  }
}
