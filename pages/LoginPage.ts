import { expect, Page } from '@playwright/test';
import { waitForAtlassianRedirectToProduct } from '../utils/helpers';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('https://id.atlassian.com/login');
    await expect(this.page).toHaveURL(/id\.atlassian\.com\/login/);
  }

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
    return this.page.getByRole('button', { name: /^log in$/i }).or(this.page.getByRole('button', { name: /log in/i }));
  }

  async login(email: string, password: string): Promise<void> {
    await this.goto();

    await this.emailInput().fill(email);
    await this.continueButton().click();

    await expect(this.passwordInput()).toBeVisible({ timeout: 30_000 });
    await this.passwordInput().fill(password);

    await this.loginButton().click();
    await waitForAtlassianRedirectToProduct(this.page);
  }

  async submitEmailOnly(email: string): Promise<void> {
    await this.goto();
    await this.emailInput().fill(email);
    await this.continueButton().click();
  }

  async submitPasswordOnly(password: string): Promise<void> {
    // Used for boundary tests where email is blank.
    await this.goto();
    await this.continueButton().click();
    await expect(this.emailInput()).toBeVisible();
    // Atlassian won't show password without email; this method exists for test case mapping.
    // We keep as no-op beyond triggering validation.
    void password;
  }

  async expectInvalidCredentialsError(): Promise<void> {
    // Atlassian messages vary; check common patterns.
    const error = this.page.getByText(/incorrect email|incorrect password|wrong email|wrong password|we couldn't log you in|unable to log in|log in failed/i);
    await expect(error.first()).toBeVisible({ timeout: 30_000 });
    await expect(this.page).toHaveURL(/id\.atlassian\.com\/login/);
  }

  async expectEmailRequiredValidation(): Promise<void> {
    const validation = this.page.getByText(/enter your email|required/i);
    await expect(validation.first()).toBeVisible();
    await expect(this.page).toHaveURL(/id\.atlassian\.com\/login/);
  }

  async expectPasswordRequiredValidation(): Promise<void> {
    // Trigger: provide email, continue, then click login without password
    const validation = this.page.getByText(/enter your password|required/i);
    await expect(validation.first()).toBeVisible({ timeout: 30_000 });
  }
}
