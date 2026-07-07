# Jira Task Management – Playwright Automation (TypeScript)

UI automation framework built with Playwright Test + TypeScript using Page Object Model (POM).

## Prerequisites
- Node.js 20+

## Environment Variables
Set these environment variables before running tests:

- `APP_URL` – Your Jira Cloud tenant base URL (e.g. `https://<tenant>.atlassian.net`)
- `APP_EMAIL` – Atlassian account email
- `APP_PASSWORD` – Atlassian account password

> Note: Login is performed via Atlassian ID at `https://id.atlassian.com/login` and then redirects back to `*.atlassian.net`.

## Install
```bash
npm install
npx playwright install --with-deps
```

## Run tests
```bash
npm test
```

### Headed
```bash
npm run test:headed
```

### Report
```bash
npm run report
```

## Project structure
- `data/` – test data
- `pages/` – Page Objects
- `utils/` – helpers
- `tests.spec.ts` – generated tests

## CI
GitHub Actions workflow: **Playwright Tests** (manual dispatch or on push to `main`).
