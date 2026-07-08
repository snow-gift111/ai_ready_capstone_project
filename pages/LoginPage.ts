import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly continueButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByRole('textbox', { name: /email/i });
    this.continueButton = page.getByRole('button', { name: /^continue$/i });
  }

  async goto(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/id\.atlassian\.com\/login/);
  }

  async submitEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.continueButton.click();
  }

  passwordInput(): Locator {
    // Atlassian password input is typically type="password" without an ARIA role textbox.
    return this.page.getByLabel(/password/i).or(this.page.locator('input[type="password"]'));
  }

  loginButton(): Locator {
    // Atlassian uses "Log in" in the password step.
    return this.page.getByRole('button', { name: /^log in$/i }).or(this.page.getByRole('button', { name: /^continue$/i }));
  }

  async submitPassword(password: string): Promise<void> {
    await this.passwordInput().fill(password);
    await this.loginButton().click();
  }

  async login(url: string, email: string, password: string): Promise<void> {
    await this.goto(url);
    await this.submitEmail(email);
    await this.submitPassword(password);
    await expect(this.page).not.toHaveURL(/id\.atlassian\.com\/login/);
  }

  errorMessage(): Locator {
    return this.page
      .getByRole('alert')
      .or(this.page.locator('[data-testid="form-error"]'))
      .or(this.page.getByText(/incorrect|invalid|required|enter your email|enter your password/i));
  }
}
