/** Settings read from the environment (see `.env.example`). */
export interface Config {
  prenotami: {
    email: string;
    password: string;
  };
  telegram: {
    botToken: string;
    chatId: string;
  };
  checkIntervalMs: number;
}

export class ConfigError extends Error {
  override name = 'ConfigError';
}

const REQUIRED = ['PRENOTAMI_EMAIL', 'PRENOTAMI_PASSWORD', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'] as const;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const missing = REQUIRED.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new ConfigError(`Missing ${missing.join(', ')}. Copy .env.example to .env and fill in your credentials.`);
  }
  const required = (key: (typeof REQUIRED)[number]) => env[key] ?? '';

  return {
    prenotami: { email: required('PRENOTAMI_EMAIL'), password: required('PRENOTAMI_PASSWORD') },
    telegram: { botToken: required('TELEGRAM_BOT_TOKEN'), chatId: required('TELEGRAM_CHAT_ID') },
    checkIntervalMs: Number(env.CHECK_INTERVAL_MS ?? '600000'),
  };
}
