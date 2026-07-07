import { expect, Locator, Page } from '@playwright/test';
import { expectRedirectedToAtlassianNet, requireCredentials } from '../utils/helpers';

export class LoginPage {
  readonly page: Page;

  // Atlassian login
  readonly emailInput: Locator;
  readonly continueButton: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Atlassian ID login form
    this.emailInput = page.getByLabel('Email');
    this.continueButton = page.getByRole('button', { name: /continue/i });
    this.passwordInput = page.getByLabel('Password');
    this.loginButton = page.getByRole('button', { name: /log in/i });
  }

  async goto() {
    await this.page.goto('https://id.atlassian.com/login', { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/id\.atlassian\.com\/login/);
  }

  /**
   * Implement login exactly as required:
   * - Navigate to https://id.atlassian.com/login
   * - Fill Email
   * - Click Continue
   * - Wait for password field
   * - Fill Password
   * - Click Log in
   * - Wait until redirected to *.atlassian.net
   */
  async login(email?: string, password?: string) {
    const creds = email && password ? { email, password } : requireCredentials();

    await this.goto();

    await this.emailInput.fill(creds.email);
    await this.continueButton.click();

    await expect(this.passwordInput).toBeVisible();
    await this.passwordInput.fill(creds.password);
    await this.loginButton.click();

    await expectRedirectedToAtlassianNet(this.page);
  }

  async loginWithValidEnvCredentials() {
    const { email, password } = requireCredentials();
    await this.login(email, password);
  }

  async attemptLoginInvalidPassword(email: string, wrongPassword: string) {
    await this.goto();
    await this.emailInput.fill(email);
    await this.continueButton.click();

    await expect(this.passwordInput).toBeVisible();
    await this.passwordInput.fill(wrongPassword);
    await this.loginButton.click();
  }

  async submitWithEmptyEmail(password: string) {
    await this.goto();
    // Do not fill email
    await this.continueButton.click();

    // Atlassian email required validation; ensure we stayed on login.
    await expect(this.page).toHaveURL(/id\.atlassian\.com\/login/);

    // Some flows won't show password until email is provided, but test expects
    // email required. We keep this method focused on email validation.
    await expect(this.page.getByText(/enter your email/i)).toBeVisible();

    // If password is visible due to previous session state, fill it to align with steps.
    if (await this.passwordInput.isVisible().catch(() => false)) {
      await this.passwordInput.fill(password);
      await this.loginButton.click();
    }
  }

  async submitWithEmptyPassword(email: string) {
    await this.goto();
    await this.emailInput.fill(email);
    await this.continueButton.click();

    await expect(this.passwordInput).toBeVisible();
    // Leave password empty
    await this.loginButton.click();
  }

  async assertInvalidCredentialsError() {
    // Atlassian may show different copy based on policy.
    const possibleErrors = [
      /incorrect email address and\/or password/i,
      /we couldn't log you in/i,
      /wrong password/i,
      /there was a problem logging you in/i,
    ];

    const errorRegion = this.page.getByRole('alert').first();
    await expect(errorRegion).toBeVisible();

    const text = (await errorRegion.textContent()) || '';
    expect(possibleErrors.some((re) => re.test(text))).toBeTruthy();
  }

  async assertPasswordRequiredValidation() {
    // Atlassian typically shows inline validation near password field
    await expect(this.page.getByText(/enter your password|required/i)).toBeVisible();
  }

  async assertStillUnauthenticated() {
    await expect(this.page).toHaveURL(/id\.atlassian\.com\/login/);
  }
}
