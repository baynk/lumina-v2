import { expect, test } from '@playwright/test';

test.describe('Core navigation and route protection', () => {
  test('public pages load', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Lumina').first()).toBeVisible();

    await page.goto('/synastry');
    await expect(page.getByRole('heading', { name: 'Relationship Reading' })).toBeVisible();

    await page.goto('/consultation');
    await expect(page.getByRole('heading', { name: 'Personal Consultation' })).toBeVisible();
  });

  test.describe('protected routes redirect unauthenticated users', () => {
    const protectedPaths = ['/admin', '/admin/client/test-client'];

    for (const protectedPath of protectedPaths) {
      test(`${protectedPath} redirects to auth with callback`, async ({ page }) => {
        await page.goto(protectedPath);

        const url = new URL(page.url());
        expect(url.pathname).toBe('/auth/signin');
        expect(url.searchParams.get('callbackUrl')).toBe(protectedPath);
      });
    }
  });
});
