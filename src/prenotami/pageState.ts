/** Text Prenotami shows when every slot for the service is taken (Italian and English). */
export const NO_SLOTS_MESSAGES = [
  "Stante l'elevata richiesta i posti disponibili per il servizio scelto sono esauriti",
  'All appointments for this service are currently booked',
  'esauriti',
  'currently booked',
];

/** Text of the bot-protection page Prenotami shows instead of the portal. */
export const CAPTCHA_SIGNALS = ['Access temporarily restricted', 'CAPTCHA', 'potentially automated'];

export function isCaptchaPage(text: string): boolean {
  return CAPTCHA_SIGNALS.some((signal) => text.includes(signal));
}

export function hasNoSlots(text: string): boolean {
  return NO_SLOTS_MESSAGES.some((message) => text.includes(message));
}
