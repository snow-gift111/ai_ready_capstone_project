import { expect, Page } from '@playwright/test';
import { getEnvOrThrow, waitForAtlassianNetRedirect } from '../utils/helpers';

export class LoginPage {
  constructor(private readonly page: Page) {}

  private emailInput() {
    return this.page.getByLabel(/email/i).or(this.page.getByPlaceholder(/email/i));
  }

  private continueButton() {
    return this.page.getByRole('button', { name: /continue/i });
  }

  private passwordInput() {
    return this.page.getByLabel(/password/i).or(this.page.getByPlaceholder(/password/i));
  }

  private loginButton() {
    return this.page.getByRole('button', { name: /log in/i });
  }

  async goto(): Promise<void> {
    // Required: Navigate to Atlassian login
    await this.page.goto('https://id.atlassian.com/login', { waitUntil: 'domcontentloaded' });
  }

  async loginWithValidCredentials(): Promise<void> {
    const email = getEnvOrThrow('APP_EMAIL');
    const password = getEnvOrThrow('APP_PASSWORD');

    await this.goto();

    // Required: never enter email and password together.
    await this.emailInput().fill(email);
    await this.continueButton().click();

    await expect(this.passwordInput()).toBeVisible({ timeout: 30_000 });
    await this.passwordInput().fill(password);
    await this.loginButton().click();

    // Required: wait until redirected to *.atlassian.net
    await waitForAtlassianNetRedirect(this.page);
  }

  async loginWith(email: string, password: string): Promise<void> {
    await this.goto();
    await this.emailInput().fill(email);
    await this.continueButton().click();

    await expect(this.passwordInput()).toBeVisible({ timeout: 30_000 });
    await this.passwordInput().fill(password);
    await this.loginButton().click();
  }

  async submitEmptyEmail(): Promise<void> {
    await this.goto();
    await this.emailInput().fill('');
    await this.continueButton().click();
  }

  async submitEmptyPassword(email: string): Promise<void> {
    await this.goto();
    await this.emailInput().fill(email);
    await this.continueButton().click();
    await expect(this.passwordInput()).toBeVisible({ timeout: 30_000 });
    await this.passwordInput().fill('');
    await this.loginButton().click();
  }
    const error = this.page.getByText(
      /incorrect|invalid|wrong|couldn\'t log you in|unable to log in|email address and\/?or password/i
    );
  async expectInvalidCredentialsError(): Promise<void> {
    const error = this.page.getByText(/incorrect|invalid|wrong|couldn\'t log you in|unable to log in/i);
    await expect(error).toBeVisible();
  }
    const error = this.page.getByText(/enter your email|email.*required|required.*email/i);
  async expectEmailRequiredValidation(): Promise<void> {
    const error = this.page.getByText(/email.*required|required.*email/i);
    await expect(error).toBeVisible();
  }
    const error = this.page.getByText(/enter your password|password.*required|required.*password/i);
  async expectPasswordRequiredValidation(): Promise<void> {
    const error = this.page.getByText(/password.*required|required.*password/i);
    await expect(error).toBeVisible();
  }
}
