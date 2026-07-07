import type { Page } from '@playwright/test';

export class TaskPage {
  constructor(private readonly page: Page) {}
}
