# Playwright E2E – Jira Task Management

Production-ready Playwright + TypeScript automation framework generated from approved test cases.

Generated on: 2026-07-07

## Prerequisites

- Node.js 20+
- An Atlassian account with access to the Jira Cloud site

## Required environment variables

Set these in your shell or GitHub Actions secrets:

- `APP_URL` – Jira Cloud base URL (example: `https://<your-site>.atlassian.net`)
- `APP_EMAIL` – Atlassian account email
- `APP_PASSWORD` – Atlassian account password

> Credentials and URLs are never hardcoded in tests.

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

## Notes

- Login flow follows Atlassian ID login at `https://id.atlassian.com/login` (email → continue → password → log in).
- Tests that require an existing issue create one on the fly to stay isolated.
- If your Jira UI differs (company-managed vs team-managed projects), you may need to adjust a few selectors in `pages/TaskPage.ts`.
