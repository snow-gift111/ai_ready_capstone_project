# OrangeHRM Automation Framework

Playwright + TypeScript automation framework for the **OrangeHRM Demo** application, implemented using the **Page Object Model (POM)**.

## Tech Stack

- [Playwright Test](https://playwright.dev/docs/test-intro)
- TypeScript
- Page Object Model (POM)

## Project Structure

- `pages/` - Page Objects
- `tests/` - Playwright test specs
- `data/` - Test data
- `utils/` - Shared helpers

## Environment Variables

This framework uses environment variables (no hardcoded URLs or credentials).

Create a `.env` file locally (or set CI secrets) with:

```bash
APP_URL=https://opensource-demo.orangehrmlive.com
APP_USERNAME=Admin
APP_PASSWORD=admin123
```

> In GitHub Actions, configure repository secrets `APP_URL`, `APP_USERNAME`, `APP_PASSWORD`.

## Install

```bash
npm ci
npx playwright install --with-deps
```

## Run Tests

```bash
npm test
```

Headed mode:

```bash
npm run test:headed
```

View HTML report:

```bash
npm run report
```

## GitHub Actions

Workflow: `.github/workflows/playwright.yml`

The pipeline installs dependencies, installs Playwright browsers, runs the test suite, and uploads the HTML report as an artifact.
