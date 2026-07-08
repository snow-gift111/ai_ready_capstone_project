# Jira Task Management - Playwright Automation

> Generated Playwright + TypeScript automation framework (POM).

## Setup

```bash
npm install
npx playwright install --with-deps
```

## Environment variables

Create a `.env` file (or set CI secrets):

- `APP_URL` (default: https://snowgift.atlassian.net)
- `APP_EMAIL`
- `APP_PASSWORD`
- `APP_PROJECT_NAME` (project used for create-issue scenarios)
- `APP_EXISTING_ISSUE_KEY` (issue key used for edit/delete/transition scenarios)

## Run tests

```bash
npm test
```

## Report

```bash
npm run report
```
