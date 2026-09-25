import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../src/config.js';

const valid = {
  PRENOTAMI_EMAIL: 'me@example.com',
  PRENOTAMI_PASSWORD: 'secret',
  TELEGRAM_BOT_TOKEN: '123:abc',
  TELEGRAM_CHAT_ID: '42',
};

describe('loadConfig', () => {
  it('reads credentials and the check interval', () => {
    const config = loadConfig({ ...valid, CHECK_INTERVAL_MS: '900000' });
    expect(config.prenotami).toEqual({ email: 'me@example.com', password: 'secret' });
    expect(config.telegram).toEqual({ botToken: '123:abc', chatId: '42' });
    expect(config.checkIntervalMs).toBe(900_000);
  });

  it('checks every 10 minutes by default', () => {
    expect(loadConfig(valid).checkIntervalMs).toBe(600_000);
  });

  it('names every missing variable', () => {
    expect(() => loadConfig({ PRENOTAMI_EMAIL: 'me@example.com' })).toThrow(
      new ConfigError(
        'Missing PRENOTAMI_PASSWORD, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID. Copy .env.example to .env and fill in your credentials.',
      ),
    );
  });
});
