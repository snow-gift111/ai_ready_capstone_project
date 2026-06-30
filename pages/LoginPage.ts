import { expect, type Locator, type Page } from '@playwright/test';
import { ensureEnv, waitForAtlassianRedirect } from '../utils/helpers';

export class LoginPage {
  readonly page: Page;

  // Atlassian hosted login
  readonly emailInput: Locator;
  readonly continueButton: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  // Possible error text areas
  readonly formError: Locator;

  constructor(page: Page) {
    this.page = page;

    this.emailInput = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i));
    this.continueButton = page.getByRole('button', { name: /continue/i });
    this.passwordInput = page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i));
    this.loginButton = page.getByRole('button', { name: /log in/i });

    // Atlassian error containers vary; keep a broad locator for assertions.
    this.formError = page.locator('[role="alert"], [data-testid*="error"], .error, #error');
  }

  async gotoAtlassianLogin(): Promise<void> {
    await this.page.goto('https://id.atlassian.com/login', { waitUntil: 'domcontentloaded' });
    await expect(this.emailInput).toBeVisible({ timeout: 30_000 });
  }

  async login(email: string, password: string): Promise<void> {
    await ensureEnv('APP_EMAIL', email);
    await ensureEnv('APP_PASSWORD', password);

    await this.gotoAtlassianLogin();

    // Never enter email and password together.
    await this.emailInput.fill(email);
    await this.continueButton.click();

    await expect(this.passwordInput).toBeVisible({ timeout: 30_000 });
    await this.passwordInput.fill(password);

    await this.loginButton.click();
    await waitForAtlassianRedirect(this.page);
  }

  async attemptLogin(email: string | null, password: string | null): Promise<void> {
    await this.gotoAtlassianLogin();

    if (email !== null) {
      if (email.length) {
        await this.emailInput.fill(email);
      }
      await this.continueButton.click();
    }

    // password field exists only after continue (unless Atlassian changes); guard.
    if (password !== null) {
      if (await this.passwordInput.isVisible().catch(() => false)) {
        if (password.length) await this.passwordInput.fill(password);
        await this.loginButton.click();
      }
    }
  }

  async assertLoginError(): Promise<void> {
    // Atlassian can show inline text like "Incorrect email address and / or password."
    await expect(this.formError).toBeVisible({ timeout: 30_000 });
  }
}
