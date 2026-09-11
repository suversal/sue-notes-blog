import { test, expect } from '@playwright/test';

test.describe('博客前台', () => {
  test('根路径直接进入博客首页', async ({ page }) => {
    await page.goto('http://127.0.0.1:3100/');

    await expect(page).toHaveURL('http://127.0.0.1:3100/blog');
    await expect(page).toHaveTitle(/苏码手记/);
    await expect(page.getByRole('navigation', { name: '博客导航' })).toBeVisible();
  });
});
