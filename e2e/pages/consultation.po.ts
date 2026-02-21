import { expect, Page } from '@playwright/test';

export class ConsultationPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/consultation');
    await expect(this.page.getByRole('heading', { name: 'Personal Consultation' })).toBeVisible();
  }

  async chooseWrittenReading() {
    await this.page.getByRole('button', { name: 'Written Reading' }).click();
    await expect(this.page.getByRole('heading', { name: 'Written Reading · €25' })).toBeVisible();
  }

  async fillRequiredFields(params: { name: string; email: string; question: string }) {
    await this.page.getByPlaceholder('Name').fill(params.name);
    await this.page.getByPlaceholder('you@example.com').first().fill(params.email);
    await this.page
      .getByPlaceholder("Tell us what you'd like to know...")
      .fill(params.question);
  }

  async fillBirthDetails(params: { birthDate?: string; birthTime?: string }) {
    if (params.birthDate) {
      await this.page.getByPlaceholder('DD.MM.YYYY').fill(params.birthDate);
    }

    if (params.birthTime) {
      await this.page.getByPlaceholder('HH:MM').fill(params.birthTime);
    }
  }

  async submitWrittenRequest() {
    await this.page.getByRole('button', { name: 'Submit Request · €25' }).click();
  }
}
