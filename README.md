# Jira Task Management — Playwright (TypeScript)

Playwright Test automation framework for Jira Cloud (Atlassian) covering authentication and issue (task) management.

## Prerequisites

- Node.js 20+
- An Atlassian Cloud site with Jira enabled

## Environment variables

Set the following environment variables before running tests:

- `APP_EMAIL` — Atlassian account email
- `APP_PASSWORD` — Atlassian account password
- `APP_BASE_URL` — your Jira site base URL (e.g. `https://<tenant>.atlassian.net`)

## Install

```bash
npm install
npx playwright install --with-deps
```

## Run tests

```bash
npm test
```

## Reports

- HTML report: `playwright-report/`

## Notes

- Login is implemented per Atlassian login flow: email → continue → password → log in.
- URLs and credentials are sourced from environment variables.
