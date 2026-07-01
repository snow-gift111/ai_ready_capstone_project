# Jira Task Management – Playwright (TypeScript)

Automated UI tests for Jira task management workflows using **Playwright Test**, **TypeScript**, and **Page Object Model**.

## Prerequisites

- Node.js 20+
- Environment variables set:
  - `APP_EMAIL`
  - `APP_PASSWORD`

> Credentials are never hardcoded; the framework always reads from `process.env.APP_EMAIL` / `process.env.APP_PASSWORD`.

## Install

```bash
npm install
npx playwright install --with-deps
```

## Run tests

```bash
npm test
```

Run with UI mode:

```bash
npx playwright test --ui
```

## Reports

HTML report:

```bash
npx playwright show-report
```

## Notes / Design

- Login flow follows Atlassian ID login sequence and waits for redirect to `*.atlassian.net`.
- Tests are grouped by feature using `test.describe()`.
- Where Jira UI varies by site configuration, selectors prefer accessibility locators (`getByRole`, `getByLabel`, `getByPlaceholder`, `getByText`).

