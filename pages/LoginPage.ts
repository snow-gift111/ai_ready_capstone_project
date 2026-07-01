import { expect, Page } from '@playwright/test';
import { expectRedirectedToAtlassianNet, requireEnv } from '../utils/helpers';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('https://id.atlassian.com/login', { waitUntil: 'domcontentloaded' });
  }

  private emailField() {
    return this.page.getByRole('textbox', { name: /email/i });
  }

  private continueButton() {
    return this.page.getByRole('button', { name: /continue/i });
  }

  private passwordField() {
    // Atlassian typically uses input[type=password] with accessible name 'Password'
    return this.page.getByRole('textbox', { name: /password/i });
  }

  private loginButton() {
    return this.page.getByRole('button', { name: /log in/i });
  }

  async login(email?: string, password?: string) {
    const effectiveEmail = email ?? requireEnv('APP_EMAIL');
    const effectivePassword = password ?? requireEnv('APP_PASSWORD');

    // Atlassian login flow must not enter email & password together.
    await this.goto();
    await this.emailField().fill(effectiveEmail);
    await this.continueButton().click();

    await expect(this.passwordField()).toBeVisible();
    await this.passwordField().fill(effectivePassword);
    await this.loginButton().click();

    await expectRedirectedToAtlassianNet(this.page);
  }

  async submitEmailOnly(email: string) {
    await this.goto();
    await this.emailField().fill(email);
    await this.continueButton().click();
  }

  async submitPasswordOnly(password: string) {
    await expect(this.passwordField()).toBeVisible();
    await this.passwordField().fill(password);
    await this.loginButton().click();
  }

  async expectInvalidCredentialsError() {
    // Error messaging varies; look for common wording.
    await expect(
      this.page.getByText(/incorrect|invalid|couldn\u2019t log you in|check your email|password/i).first(),
    ).toBeVisible();
  }

  async expectEmailRequiredValidation() {
    // Browser-level or Atlassian validation; handle either.
    const email = this.emailField();
    await expect(email).toBeVisible();

    // Attempt continue with empty email.
    await email.fill('');
    await this.continueButton().click();

    // If browser validation triggers, it won't navigate; email will be invalid.
    await expect(email).toHaveJSProperty('validationMessage', expect.any(String));
  }
}
