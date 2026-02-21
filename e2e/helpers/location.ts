import { Page } from '@playwright/test';

export async function mockLocationApis(page: Page) {
  await page.route(/\/api\/geocode(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          place_id: 'nyc-1',
          display_name: 'New York, NY, USA',
          lat: '40.7128',
          lon: '-74.0060',
        },
      ]),
    });
  });

  await page.route(/\/api\/timezone(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ timezone: 'America/New_York' }),
    });
  });
}
