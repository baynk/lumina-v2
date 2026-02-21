import { expect, Page } from '@playwright/test';

export class UserMenu {
  constructor(
    private readonly page: Page,
    private readonly initials = 'TU'
  ) {}

  private get avatarButton() {
    return this.page.locator('nav').getByRole('button').filter({ hasText: this.initials }).first();
  }

  async open() {
    await this.avatarButton.click();
    await expect(this.page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  }

  async signOut() {
    await this.open();
    await this.page.getByRole('button', { name: 'Sign out' }).click();
  }
}
