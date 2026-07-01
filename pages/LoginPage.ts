import { expect, Page } from '@playwright/test';
import { waitForAtlassianRedirect } from '../utils/helpers';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('https://id.atlassian.com/login', { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/id\.atlassian\.com\/login/);
  }

  async loginWithEnvCredentials(): Promise<void> {
    const email = process.env.APP_EMAIL;
    const password = process.env.APP_PASSWORD;
    if (!email) throw new Error('APP_EMAIL env var is required');
    if (!password) throw new Error('APP_PASSWORD env var is required');

    await this.login(email, password);
  }

  async login(
    email: string,
    password: string,
    options: {
      /**
       * For successful auth flows we must wait for redirect to *.atlassian.net.
       * For negative auth scenarios (invalid creds), set to false.
       */
      expectRedirect?: boolean;
    } = { expectRedirect: true }
  ): Promise<void> {
    // Atlassian login sequence requirement:
    // Fill Email -> Continue -> wait for password field -> Fill Password -> Log in -> redirect to *.atlassian.net
    const emailField = this.page.getByLabel(/email/i).or(this.page.getByPlaceholder(/email/i));
    await expect(emailField).toBeVisible({ timeout: 30_000 });
    await emailField.fill(email);

    await this.page.getByRole('button', { name: /continue/i }).click();

    const passwordField = this.page.getByLabel(/password/i).or(this.page.getByPlaceholder(/password/i));
    await expect(passwordField).toBeVisible({ timeout: 30_000 });
    await passwordField.fill(password);

    await this.page.getByRole('button', { name: /log in/i }).click();

    if (options.expectRedirect !== false) {
      await waitForAtlassianRedirect(this.page);
    }
  }

  async loginExpectFailure(email: string, password: string): Promise<void> {
    await this.login(email, password, { expectRedirect: false });
  }

  async submitWithoutEmail(password: string): Promise<void> {
    // Submit email step empty, then attempt continue
    const emailField = this.page.getByLabel(/email/i).or(this.page.getByPlaceholder(/email/i));
    await expect(emailField).toBeVisible({ timeout: 30_000 });
    await emailField.fill('');

    await this.page.getByRole('button', { name: /continue/i }).click();

    // Depending on Atlassian UX, it might block before password step.
    // If password is visible (rare), fill and attempt login.
    const passwordField = this.page.getByLabel(/password/i).or(this.page.getByPlaceholder(/password/i));
    if (await passwordField.isVisible().catch(() => false)) {
      await passwordField.fill(password);
      await this.page.getByRole('button', { name: /log in/i }).click();
    }
  }

  async submitWithoutPassword(email: string): Promise<void> {
    const emailField = this.page.getByLabel(/email/i).or(this.page.getByPlaceholder(/email/i));
    await expect(emailField).toBeVisible({ timeout: 30_000 });
    await emailField.fill(email);

    await this.page.getByRole('button', { name: /continue/i }).click();

    const passwordField = this.page.getByLabel(/password/i).or(this.page.getByPlaceholder(/password/i));
    await expect(passwordField).toBeVisible({ timeout: 30_000 });
    await passwordField.fill('');

    await this.page.getByRole('button', { name: /log in/i }).click();
  }

  async assertInvalidCredentialsError(): Promise<void> {
    // Common Atlassian error messages
    const error = this.page.getByText(/incorrect email address and\/or password|we couldn't log you in|invalid/i).first();
    await expect(error).toBeVisible({ timeout: 30_000 });
  }

  async assertEmailRequired(): Promise<void> {
    const validation = this.page.getByText(/enter your email|required/i).first();
    await expect(validation).toBeVisible({ timeout: 30_000 });
  }

  async assertPasswordRequired(): Promise<void> {
    const validation = this.page.getByText(/enter your password|required/i).first();
    await expect(validation).toBeVisible({ timeout: 30_000 });
  }
}
