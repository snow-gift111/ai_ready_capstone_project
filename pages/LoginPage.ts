import { expect, Locator, Page } from '@playwright/test';
import { expectRedirectedToAtlassianNet, requireEnv } from '../utils/helpers';

export class LoginPage {
  readonly page: Page;

  readonly emailInput: Locator;
  readonly continueButton: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Atlassian ID login page
    this.emailInput = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i));
    this.continueButton = page.getByRole('button', { name: /continue/i });
    this.passwordInput = page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i));
    this.loginButton = page.getByRole('button', { name: /log in/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('https://id.atlassian.com/login', { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/id\.atlassian\.com\/login/);
  }

  async fillEmailAndContinue(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.continueButton.click();
  }

  async fillPasswordAndLogin(password: string): Promise<void> {
    await this.passwordInput.waitFor({ state: 'visible', timeout: 30_000 });
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async loginWithEnvCreds(): Promise<void> {
    const email = requireEnv('APP_EMAIL');
    const password = requireEnv('APP_PASSWORD');

    await this.goto();
    await this.fillEmailAndContinue(email);
    await this.fillPasswordAndLogin(password);
    await expectRedirectedToAtlassianNet(this.page);
  }

  async login(email: string, password: string): Promise<void> {
    await this.goto();
    await this.fillEmailAndContinue(email);
    await this.fillPasswordAndLogin(password);
  }

  async expectInvalidCredentialsError(): Promise<void> {
    // Atlassian varies message text; assert common patterns.
    await expect(
      this.page.getByText(/incorrect|invalid|can't log you in|wrong email|password/i)
    ).toBeVisible({ timeout: 30_000 });
  }

  async expectEmailRequiredValidation(): Promise<void> {
    await expect(this.page.getByText(/enter your email|email is required|required/i)).toBeVisible();
  }

  async expectPasswordRequiredValidation(): Promise<void> {
    await expect(this.page.getByText(/enter your password|password is required|required/i)).toBeVisible();
  }
}
