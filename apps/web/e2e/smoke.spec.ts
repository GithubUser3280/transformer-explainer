import { expect, test } from '@playwright/test';

test('loads the app and exposes generate trace control', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Generate trace' })).toBeVisible();
  await expect(page.getByTestId('scene-shell')).toBeVisible();
});
