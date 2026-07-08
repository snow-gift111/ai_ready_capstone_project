import { expect, Locator, Page } from '@playwright/test';
import { requireEnv } from '../utils/helpers';

export class LoginPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private emailInput(): Locator {
    // Atlassian ID login: input[name=username]
    return this.page.locator('input[name="username"], input[type="email"]');
  }

  private continueButton(): Locator {
    return this.page.getByRole('button', { name: /^continue$/i });
  }

  private passwordInput(): Locator {
    return this.page.locator('input[name="password"], input#password, input[type="password"]');
  }

  private loginButton(): Locator {
    return this.page.getByRole('button', { name: /^log in$/i });
  }

  private errorAlert(): Locator {
    return this.page.getByRole('alert').or(this.page.locator('[data-testid="form-error"]')).or(this.page.locator('[aria-live="polite"], [aria-live="assertive"]'));
  }

  async goto(): Promise<void> {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    // Jira will typically redirect to id.atlassian.com
    await expect(this.page).toHaveURL(/atlassian\.com\/login|atlassian\.com\/login\?/i);
  }

  async submitEmail(email: string): Promise<void> {
    await this.emailInput().fill(email);
    await this.continueButton().click();
  }

  async submitPassword(password: string): Promise<void> {
    await this.passwordInput().waitFor({ state: 'visible' });
    await this.passwordInput().fill(password);
    await this.loginButton().click();
  }

  async loginWithEnv(): Promise<void> {
    const email = requireEnv('JIRA_EMAIL');
    const password = requireEnv('JIRA_PASSWORD');

    await this.goto();
    await this.submitEmail(email);
    await this.submitPassword(password);

    // Successful login should land back on Jira domain.
    await expect(this.page).toHaveURL(/snowgift\.atlassian\.net/i);
  }

  async login(email: string, password: string): Promise<void> {
    await this.goto();
    await this.submitEmail(email);
    await this.submitPassword(password);
  }

  async expectInvalidLoginError(): Promise<void> {
    await expect(this.errorAlert()).toBeVisible();
    await expect(this.page.getByText(/incorrect|invalid|couldn\s*t log you in|wrong/i)).toBeVisible();
    await expect(this.page).toHaveURL(/id\.atlassian\.com\/login/i);
  }

  async expectEmailRequiredError(): Promise<void> {
    await this.continueButton().click();
    await expect(this.page.getByText(/enter an email|email.*required/i)).toBeVisible();
    await expect(this.page).toHaveURL(/id\.atlassian\.com\/login/i);
  }

  async expectPasswordRequiredError(anyEmail: string): Promise<void> {
    await this.goto();
    await this.submitEmail(anyEmail);

    await this.passwordInput().waitFor({ state: 'visible' });
    await this.loginButton().click();

    await expect(this.page.getByText(/enter your password|password.*required/i)).toBeVisible();
    await expect(this.page).toHaveURL(/id\.atlassian\.com\/login/i);
  }
}
