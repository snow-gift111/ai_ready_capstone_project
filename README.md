# Jira Task Management – Playwright Automation Framework

> Playwright + TypeScript UI automation for Jira Cloud.

## Prerequisites
- Node.js 20+

## Environment variables
Create a `.env` file (or set GitHub Secrets) with:

- `APP_URL` (Jira site base URL, e.g. `https://your-domain.atlassian.net`)
- `APP_EMAIL`
- `APP_PASSWORD`
- `APP_PROJECT` (Jira project name visible in the Create issue dialog)

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
- Login uses Atlassian ID flow at `https://id.atlassian.com/login`.
