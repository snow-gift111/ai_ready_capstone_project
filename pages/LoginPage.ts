import { expect, Locator, Page } from '@playwright/test';
import { ensureEnv, waitForAtlassianRedirect } from '../utils/helpers';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly continueButton: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.continueButton = page.getByRole('button', { name: /continue/i });
    this.passwordInput = page.getByLabel('Password');
    this.loginButton = page.getByRole('button', { name: /log in/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('https://id.atlassian.com/login', { waitUntil: 'domcontentloaded' });
    await expect(this.emailInput).toBeVisible();
  }

  /**
   * Implements Atlassian login flow exactly:
   * Fill Email -> Continue -> wait for password -> Fill Password -> Log in -> wait redirect to *.atlassian.net
   */
  async login(email: string, password: string): Promise<void> {
    await this.goto();
    await this.emailInput.fill(email);
    await this.continueButton.click();
    await expect(this.passwordInput).toBeVisible({ timeout: 30_000 });
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await waitForAtlassianRedirect(this.page);
  }
}
