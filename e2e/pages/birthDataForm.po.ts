import { expect, Page } from '@playwright/test';

export class BirthDataFormPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/?start=true');
    await expect(this.page.getByText('Enter your birth details')).toBeVisible();
  }

  async fillBirthDateAndTime(params: {
    day: string;
    month: string;
    year: string;
    hour: string;
    minute: string;
  }) {
    const selects = this.page.locator('form select');
    await selects.nth(0).selectOption(params.day);
    await selects.nth(1).selectOption(params.month);
    await selects.nth(2).selectOption(params.year);
    await selects.nth(3).selectOption(params.hour);
    await selects.nth(4).selectOption(params.minute);
  }

  async chooseLocation(query = 'New York') {
    await this.page.locator('#bdf-location').fill(query);
    await this.page.getByRole('button', { name: 'New York, NY, USA' }).click();
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Discover Your Stars' }).click();
  }
}
