# Jira Task Management - Playwright Automation

> Generated Playwright + TypeScript automation framework (POM).

## Prerequisites

- Node.js 20+

## Environment variables

Set these in your terminal or CI secrets:

- `APP_URL` - Jira site base URL (e.g. your `*.atlassian.net` site)
- `APP_EMAIL` - Atlassian account email
- `APP_PASSWORD` - Atlassian account password

Optional:

- `APP_PROJECT_NAME` - Jira project name to select in Create Issue dialog (if not set, tests will keep the default selected project when possible)

## Install

```bash
npm install
npx playwright install --with-deps
```

## Run tests

```bash
npm test
```

Headed:

```bash
npm run test:headed
```

Report:

```bash
npm run report
```

## Notes

- Atlassian login is implemented using the required flow:
  - navigate to `https://id.atlassian.com/login`
  - email → Continue → password → Log in → wait for redirect to `*.atlassian.net`
- Some Jira UI elements vary across instances; the framework uses resilient locators and fallbacks.

_TBD_
