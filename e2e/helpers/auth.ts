import { Page } from '@playwright/test';

type SessionUser = {
  name: string;
  email: string;
  image: string | null;
};

type MockSession = {
  user: SessionUser;
  expires: string;
};

const DEFAULT_SESSION: MockSession = {
  user: {
    name: 'Test User',
    email: 'tester@example.com',
    image: null,
  },
  expires: '2099-01-01T00:00:00.000Z',
};

export async function mockAuthenticatedSession(page: Page, sessionOverride: Partial<MockSession> = {}) {
  const session: MockSession = {
    ...DEFAULT_SESSION,
    ...sessionOverride,
    user: {
      ...DEFAULT_SESSION.user,
      ...(sessionOverride.user || {}),
    },
  };

  await page.route(/\/api\/auth\/session(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session),
    });
  });

  await page.route(/\/api\/auth\/csrf(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: 'playwright-csrf-token' }),
    });
  });

  await page.route(/\/api\/auth\/providers(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        google: {
          id: 'google',
          name: 'Google',
          type: 'oauth',
          signinUrl: 'http://localhost:3000/api/auth/signin/google',
          callbackUrl: 'http://localhost:3000/api/auth/callback/google',
        },
      }),
    });
  });

  await page.route(/\/api\/auth\/signout(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: '/' }),
    });
  });
}

export async function seedStateForSignOut(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'lumina_profile',
      JSON.stringify({
        name: 'Stale User',
        locationName: 'Old City',
        savedAt: Date.now(),
        birthData: {
          year: 1990,
          month: 0,
          day: 1,
          hour: 12,
          minute: 0,
          latitude: 40.7128,
          longitude: -74.006,
          timezone: 'America/New_York',
        },
      })
    );
    localStorage.setItem(
      'lumina_birth_data',
      JSON.stringify({
        name: 'Stale User',
        locationName: 'Old City',
        birthData: {
          year: 1990,
          month: 0,
          day: 1,
          hour: 12,
          minute: 0,
          latitude: 40.7128,
          longitude: -74.006,
          timezone: 'America/New_York',
        },
      })
    );
    localStorage.setItem('lumina_synastry_result', JSON.stringify({ stale: true }));
    sessionStorage.setItem('lumina_temp_token', 'stale');
  });
}
