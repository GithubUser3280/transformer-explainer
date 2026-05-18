import { expect, test } from '@playwright/test';

test('loads the app and exposes fake trace control', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Use fake trace' })).toBeVisible();
  await page.getByRole('button', { name: 'Use fake trace' }).click();
  await expect(page.getByTestId('scene-shell')).toBeVisible();
});
