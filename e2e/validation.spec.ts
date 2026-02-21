import { expect, test } from '@playwright/test';
import { mockLocationApis } from './helpers/location';
import { BirthDataFormPage } from './pages/birthDataForm.po';
import { ConsultationPage } from './pages/consultation.po';

test.describe('Form validation', () => {
  test('birth data form rejects impossible dates', async ({ page }) => {
    await mockLocationApis(page);

    const birthDataForm = new BirthDataFormPage(page);
    await birthDataForm.open();

    await birthDataForm.fillBirthDateAndTime({
      day: '31',
      month: '2',
      year: '2025',
      hour: '12',
      minute: '30',
    });
    await birthDataForm.chooseLocation();
    await birthDataForm.submit();

    await expect(page.getByText('Please enter a valid birth date')).toBeVisible();
  });

  test('consultation form validates email format', async ({ page }) => {
    const consultation = new ConsultationPage(page);
    await consultation.open();
    await consultation.chooseWrittenReading();

    await consultation.fillRequiredFields({
      name: 'Test User',
      email: 'invalid-email-format',
      question: 'I want clarity about my relationships and career timing.',
    });
    await consultation.submitWrittenRequest();

    await expect(page.getByText('Please enter a valid email')).toBeVisible();
  });

  test('consultation form validates birth time format', async ({ page }) => {
    const consultation = new ConsultationPage(page);
    await consultation.open();
    await consultation.chooseWrittenReading();

    await consultation.fillRequiredFields({
      name: 'Test User',
      email: 'valid@example.com',
      question: 'I want to understand my next major transit period.',
    });
    await consultation.fillBirthDetails({ birthDate: '15.08.1995', birthTime: '25:61' });
    await consultation.submitWrittenRequest();

    await expect(page.getByText('Invalid birth time format (HH:MM)')).toBeVisible();
  });
});
