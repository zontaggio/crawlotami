import { describe, expect, it } from 'vitest';
import { hasNoSlots, isCaptchaPage } from '../src/prenotami/pageState.js';

describe('page state', () => {
  it.each([
    "Stante l'elevata richiesta i posti disponibili per il servizio scelto sono esauriti. Si prega di riprovare.",
    'All appointments for this service are currently booked. Please try again later.',
  ])('recognises the no-slots message: %s', (text) => {
    expect(hasNoSlots(text)).toBe(true);
  });

  it('treats a booking calendar as available', () => {
    expect(hasNoSlots('Seleziona la data e l’ora del tuo appuntamento')).toBe(false);
  });

  it('recognises the bot-protection page', () => {
    expect(isCaptchaPage('Access temporarily restricted. Please complete the CAPTCHA below.')).toBe(true);
    expect(isCaptchaPage('Prenota il tuo appuntamento')).toBe(false);
  });
});
