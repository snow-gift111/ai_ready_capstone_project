import { expect, Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly invalidCredentialsAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByRole('textbox', { name: 'Username' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.invalidCredentialsAlert = page.locator('.oxd-alert-content-text');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/auth/login');
    await expect(this.page.getByRole('heading', { name: 'Login' })).toBeVisible();
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectInvalidCredentials(): Promise<void> {
    await expect(this.invalidCredentialsAlert).toBeVisible();
    await expect(this.invalidCredentialsAlert).toContainText('Invalid credentials');
    await expect(this.page).toHaveURL(/\/auth\/login/);
  }

  async expectRequiredValidation(field: 'Username' | 'Password'): Promise<void> {
    const group = this.page.locator(`.oxd-input-group:has(label:has-text("${field}"))`);
    await expect(group.locator('span.oxd-input-field-error-message')).toContainText('Required');
  }
}
