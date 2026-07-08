import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { EmployeePage } from '../pages/EmployeePage';
import { requireEnv, expectToBeOnLoginPage } from '../utils/helpers';
import { testData } from '../data/testData';

test.describe('OrangeHRM Demo - Approved Test Cases', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure baseURL is configured for relative navigations.
    requireEnv('APP_URL');

    // Always start from login page for isolation.
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('TC-001: Login, add employee (auto Employee ID), search by name and ID, edit and save, delete with confirmation, verify removed, logout', async ({ page }) => {
    const appUsername = requireEnv('APP_USERNAME');
    const appPassword = requireEnv('APP_PASSWORD');

    const loginPage = new LoginPage(page);
    await loginPage.login(appUsername, appPassword);
    await expect(page).toHaveURL(/\/dashboard\/index/);

    const employeePage = new EmployeePage(page);

    // Navigate to PIM and Add Employee
    await employeePage.openPimModule();
    await employeePage.gotoAddEmployee();

    // Add employee and capture employee id
    const firstName = testData.employees.defaultFirstName;
    const lastName = testData.employees.defaultLastName;
    const { employeeId } = await employeePage.addEmployee(firstName, lastName);

    // Back to list and search by name (autocomplete)
    await employeePage.gotoEmployeeList();
    await employeePage.resetButton.click();
    await employeePage.searchByEmployeeName(`${firstName} ${lastName}`);

    // Search by ID and open record
    await employeePage.resetButton.click();
    await employeePage.searchByEmployeeId(employeeId);
    await expect(employeePage.tableRows).toHaveCount(1);
    await employeePage.openFirstSearchResultForEdit();

    // Edit personal info: update Middle Name as stable field
    const newMiddleName = `Mid-${Date.now()}`;
    await employeePage.updateMiddleNameAndSave(newMiddleName);
    await expect(employeePage.middleNameInput).toHaveValue(newMiddleName);

    // Back to list and delete
    await employeePage.gotoEmployeeList();
    await employeePage.resetButton.click();
    await employeePage.searchByEmployeeId(employeeId);
    await expect(employeePage.tableRows).toHaveCount(1);

    await employeePage.deleteFirstSearchResultAndConfirm(true);

    // Verify removed
    await employeePage.resetButton.click();
    await employeePage.searchByEmployeeId(employeeId);
    await employeePage.expectNoRecordsFound();

    // Logout
    await employeePage.logout();
    await expectToBeOnLoginPage(page);
  });

  test('TC-002: Invalid login credentials display an error message', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(testData.invalidLogin.username, testData.invalidLogin.password);

    await loginPage.expectInvalidCredentials();
  });

  test('TC-003: Empty username field validation prevents login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.usernameInput.fill('');
    await loginPage.passwordInput.fill(testData.boundary.anyPassword);
    await loginPage.loginButton.click();

    await loginPage.expectRequiredValidation('Username');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('TC-004: Empty password field validation prevents login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.usernameInput.fill(testData.boundary.anyUsername);
    await loginPage.passwordInput.fill('');
    await loginPage.loginButton.click();

    await loginPage.expectRequiredValidation('Password');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('TC-005: Missing mandatory employee details show validation error and prevent save', async ({ page }) => {
    const appUsername = requireEnv('APP_USERNAME');
    const appPassword = requireEnv('APP_PASSWORD');

    const loginPage = new LoginPage(page);
    await loginPage.login(appUsername, appPassword);
    await expect(page).toHaveURL(/\/dashboard\/index/);

    const employeePage = new EmployeePage(page);
    await employeePage.openPimModule();
    await employeePage.gotoAddEmployee();

    // Leave first name empty, fill last name
    await employeePage.firstNameInput.fill('');
    await employeePage.lastNameInput.fill(testData.employees.defaultLastName);
    await employeePage.saveButton.click();

    await expect(page.locator('span.oxd-input-field-error-message')).toContainText('Required');
    await expect(page).toHaveURL(/\/pim\/addEmployee/);
  });

  test("TC-006: Search with no matching employee shows 'No Records Found'", async ({ page }) => {
    const appUsername = requireEnv('APP_USERNAME');
    const appPassword = requireEnv('APP_PASSWORD');

    const loginPage = new LoginPage(page);
    await loginPage.login(appUsername, appPassword);
    await expect(page).toHaveURL(/\/dashboard\/index/);

    const employeePage = new EmployeePage(page);
    await employeePage.gotoEmployeeList();

    await employeePage.resetButton.click();
    await employeePage.searchByEmployeeId(testData.search.nonExistentEmployeeId);

    await employeePage.expectNoRecordsFound();
  });

  test('TC-007: Cancel editing employee personal information does not save changes', async ({ page }) => {
    const appUsername = requireEnv('APP_USERNAME');
    const appPassword = requireEnv('APP_PASSWORD');

    const loginPage = new LoginPage(page);
    await loginPage.login(appUsername, appPassword);
    await expect(page).toHaveURL(/\/dashboard\/index/);

    const employeePage = new EmployeePage(page);

    // Use first row as an existing employee record.
    await employeePage.gotoEmployeeList();
    await employeePage.openFirstSearchResultForEdit();

    // Capture original middle name and employee id.
    const originalMiddle = await employeePage.middleNameInput.inputValue();
    const employeeId = await employeePage.getEmployeeIdFromPersonalDetails();

    // Modify but do not save; navigate away.
    await employeePage.middleNameInput.fill(testData.existingEmployee.unsavedValue);
    await employeePage.gotoEmployeeList();

    // Re-open the same employee by searching with employee id.
    await employeePage.resetButton.click();
    await employeePage.searchByEmployeeId(employeeId);
    await expect(employeePage.tableRows).toHaveCount(1);
    await employeePage.openFirstSearchResultForEdit();

    await expect(employeePage.middleNameInput).not.toHaveValue(testData.existingEmployee.unsavedValue);
    await expect(employeePage.middleNameInput).toHaveValue(originalMiddle);
  });

  test('TC-008: Cancel deletion keeps employee record', async ({ page }) => {
    const appUsername = requireEnv('APP_USERNAME');
    const appPassword = requireEnv('APP_PASSWORD');

    const loginPage = new LoginPage(page);
    await loginPage.login(appUsername, appPassword);
    await expect(page).toHaveURL(/\/dashboard\/index/);

    const employeePage = new EmployeePage(page);
    await employeePage.gotoEmployeeList();

    // Capture first row employee id for re-search
    const firstRow = employeePage.tableRows.first();
    const employeeId = (await firstRow.locator('.oxd-table-cell').nth(1).innerText()).trim();

    // Search by captured employee id to make verification stable
    await employeePage.resetButton.click();
    await employeePage.searchByEmployeeId(employeeId);
    await expect(employeePage.tableRows).toHaveCount(1);

    await employeePage.deleteFirstSearchResultAndConfirm(false);

    // Ensure still present
    await employeePage.resetButton.click();
    await employeePage.searchByEmployeeId(employeeId);
    await expect(employeePage.tableRows).toHaveCount(1);
  });
});
