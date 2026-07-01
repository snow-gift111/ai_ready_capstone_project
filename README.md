# Jira Task Management – Playwright Automation (TypeScript)

This repository contains Playwright Test automation for Jira Task Management.

## Prerequisites
- Node.js 20+

## Environment Variables
Set the following variables before running tests:

- `APP_URL` – Jira site base URL (e.g., your `https://<site>.atlassian.net`)
- `APP_EMAIL` – Atlassian account email
- `APP_PASSWORD` – Atlassian account password
- `APP_INVALID_PASSWORD` – (optional) invalid password used for negative login tests

## Install
```bash
npm install
npx playwright install --with-deps
```

## Run tests
```bash
npm test
```

## Notes
- Login is performed via `https://id.atlassian.com/login` as required.
- Tests use Page Object Model (POM).
