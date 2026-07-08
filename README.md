# Jira Task Management — Playwright Automation

## Overview
Playwright + TypeScript automation for Jira Cloud (Atlassian authentication).

## Prerequisites
- Node.js 20+

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Install Playwright browsers:
   ```bash
   npx playwright install --with-deps
   ```

## Environment variables
Create a `.env` file (or set CI secrets):

- `JIRA_BASE_URL` (default: https://snowgift.atlassian.net)
- `JIRA_EMAIL` (required for tests that need login)
- `JIRA_PASSWORD` (required for tests that need login)
- `JIRA_PROJECT` (optional; if not set the first project in the Create dialog is used)

## Run tests
```bash
npm test
```

## Notes
- Jira UI can vary by tenant and permissions; selectors prefer accessibility roles and common Jira data-testid attributes.
- MFA/CAPTCHA flows are not automatable; ensure the test account can log in without interactive challenges.
