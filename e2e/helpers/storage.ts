import { Page } from '@playwright/test';

export type BrowserStorageSnapshot = {
  localKeys: string[];
  sessionKeys: string[];
};

export async function getStorageSnapshot(page: Page): Promise<BrowserStorageSnapshot> {
  return page.evaluate(() => ({
    localKeys: Object.keys(window.localStorage),
    sessionKeys: Object.keys(window.sessionStorage),
  }));
}

export function getLuminaKeys(keys: string[]): string[] {
  return keys.filter((key) => key.startsWith('lumina_') || key.startsWith('lumina-'));
}
