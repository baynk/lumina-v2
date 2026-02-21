import { expect, test } from '@playwright/test';
import { mockAuthenticatedSession, seedStateForSignOut } from './helpers/auth';
import { getLuminaKeys, getStorageSnapshot } from './helpers/storage';
import { UserMenu } from './pages/userMenu.po';

test.describe('Auth flow and sign-out state management', () => {
  test('unauthenticated /admin redirects to sign-in with callback', async ({ page }) => {
    await page.goto('/admin');

    const url = new URL(page.url());
    expect(url.pathname).toBe('/auth/signin');
    expect(url.searchParams.get('callbackUrl')).toBe('/admin');
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  });

  test('sign-out clears client state and stale data cannot be revived via back navigation', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await seedStateForSignOut(page);

    await page.goto('/profile');
    await expect(page.locator('input[value=\"Stale User\"]').first()).toBeVisible();

    const userMenu = new UserMenu(page);
    await userMenu.signOut();

    await expect(page).toHaveURL('/');

    const storageSnapshot = await getStorageSnapshot(page);
    expect(getLuminaKeys(storageSnapshot.localKeys)).toEqual([]);
    expect(storageSnapshot.sessionKeys).toEqual([]);

    await page.goBack();
    await page.waitForTimeout(300);

    await expect(page.getByText('Stale User')).toHaveCount(0);

    const afterBackSnapshot = await getStorageSnapshot(page);
    expect(getLuminaKeys(afterBackSnapshot.localKeys)).toEqual([]);
    expect(afterBackSnapshot.sessionKeys).toEqual([]);
  });
});
