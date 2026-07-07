import { test, expect } from '@playwright/test';

test('placeholder', async ({ page }) => {
  await page.goto('about:blank');
  await expect(page).toHaveURL('about:blank');
});
