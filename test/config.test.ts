import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../src/config.js';

const valid = {
  PRENOTAMI_EMAIL: 'me@example.com',
  PRENOTAMI_PASSWORD: 'secret',
  TELEGRAM_BOT_TOKEN: '123:abc',
  TELEGRAM_CHAT_ID: '42',
};

describe('loadConfig', () => {
  it('uses sensible defaults', () => {
    const config = loadConfig(valid);
    expect(config.prenotami).toEqual({ email: 'me@example.com', password: 'secret', serviceRow: 1 });
    expect(config.telegram).toEqual({ botToken: '123:abc', chatId: '42' });
    expect(config.checkIntervalMs).toBe(10 * 60_000);
    expect(config.heartbeatIntervalMs).toBe(60 * 60_000);
    expect(config.browser).toEqual({ headless: true, timeZone: 'America/Sao_Paulo', locale: 'pt-BR' });
    expect(config.warnings).toEqual([]);
  });

  it('reads optional settings', () => {
    const config = loadConfig({
      ...valid,
      CHECK_INTERVAL_MINUTES: '15',
      HEARTBEAT_HOURS: '6',
      PRENOTAMI_SERVICE_ROW: '2',
      HEADLESS: 'false',
      TIMEZONE: 'Europe/Rome',
      LOCALE: 'it-IT',
    });
    expect(config.checkIntervalMs).toBe(15 * 60_000);
    expect(config.heartbeatIntervalMs).toBe(6 * 60 * 60_000);
    expect(config.prenotami.serviceRow).toBe(2);
    expect(config.browser).toEqual({ headless: false, timeZone: 'Europe/Rome', locale: 'it-IT' });
  });

  it('still accepts the 1.x CHECK_INTERVAL_MS', () => {
    expect(loadConfig({ ...valid, CHECK_INTERVAL_MS: '900000' }).checkIntervalMs).toBe(15 * 60_000);
  });

  it('raises intervals below the minimum and says so', () => {
    const config = loadConfig({ ...valid, CHECK_INTERVAL_MINUTES: '1' });
    expect(config.checkIntervalMs).toBe(5 * 60_000);
    expect(config.warnings).toHaveLength(1);
  });

  it('names every missing variable', () => {
    expect(() => loadConfig({ PRENOTAMI_EMAIL: 'me@example.com' })).toThrow(
      new ConfigError(
        'Missing PRENOTAMI_PASSWORD, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID. Copy .env.example to .env and fill in your credentials.',
      ),
    );
  });

  it.each([
    [{ CHECK_INTERVAL_MINUTES: 'soon' }, 'CHECK_INTERVAL_MINUTES must be a positive number, got "soon".'],
    [{ HEADLESS: 'maybe' }, 'HEADLESS must be true or false, got "maybe".'],
    [{ PRENOTAMI_SERVICE_ROW: '1.5' }, 'PRENOTAMI_SERVICE_ROW must be a whole number, starting at 1.'],
  ])('rejects invalid values: %o', (overrides, message) => {
    expect(() => loadConfig({ ...valid, ...overrides })).toThrow(new ConfigError(message));
  });
});
