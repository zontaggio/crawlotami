/** Settings read from the environment (see `.env.example`). */
export interface Config {
  prenotami: {
    email: string;
    password: string;
    /** 1-based row of the service in Prenotami's "Book" table (1 is usually passports). */
    serviceRow: number;
  };
  telegram: {
    botToken: string;
    chatId: string;
  };
  checkIntervalMs: number;
  heartbeatIntervalMs: number;
  browser: {
    headless: boolean;
    timeZone: string;
    locale: string;
  };
  /** Adjustments made to the settings, worth telling the user about. */
  warnings: string[];
}

export class ConfigError extends Error {
  override name = 'ConfigError';
}

/** Checking more often than this adds load on Prenotami and invites CAPTCHAs. */
export const MIN_CHECK_INTERVAL_MINUTES = 5;
const MINUTE = 60_000;

const REQUIRED = ['PRENOTAMI_EMAIL', 'PRENOTAMI_PASSWORD', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'] as const;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const missing = REQUIRED.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new ConfigError(`Missing ${missing.join(', ')}. Copy .env.example to .env and fill in your credentials.`);
  }
  const required = (key: (typeof REQUIRED)[number]) => env[key] ?? '';
  const warnings: string[] = [];

  // CHECK_INTERVAL_MS is the 1.x name, still honoured when the new one isn't set.
  let intervalMinutes = env.CHECK_INTERVAL_MINUTES
    ? number(env, 'CHECK_INTERVAL_MINUTES')
    : env.CHECK_INTERVAL_MS
      ? number(env, 'CHECK_INTERVAL_MS') / MINUTE
      : 10;
  if (intervalMinutes < MIN_CHECK_INTERVAL_MINUTES) {
    warnings.push(
      `Check interval raised from ${intervalMinutes} to ${MIN_CHECK_INTERVAL_MINUTES} minutes, the minimum crawlotami allows.`,
    );
    intervalMinutes = MIN_CHECK_INTERVAL_MINUTES;
  }

  const serviceRow = env.PRENOTAMI_SERVICE_ROW ? number(env, 'PRENOTAMI_SERVICE_ROW') : 1;
  if (!Number.isInteger(serviceRow) || serviceRow < 1) {
    throw new ConfigError('PRENOTAMI_SERVICE_ROW must be a whole number, starting at 1.');
  }

  return {
    prenotami: { email: required('PRENOTAMI_EMAIL'), password: required('PRENOTAMI_PASSWORD'), serviceRow },
    telegram: { botToken: required('TELEGRAM_BOT_TOKEN'), chatId: required('TELEGRAM_CHAT_ID') },
    checkIntervalMs: intervalMinutes * MINUTE,
    heartbeatIntervalMs: (env.HEARTBEAT_HOURS ? number(env, 'HEARTBEAT_HOURS') : 1) * 60 * MINUTE,
    browser: {
      headless: boolean(env, 'HEADLESS', true),
      timeZone: env.TIMEZONE ?? 'America/Sao_Paulo',
      locale: env.LOCALE ?? 'pt-BR',
    },
    warnings,
  };
}

function number(env: NodeJS.ProcessEnv, key: string): number {
  const value = Number(env[key]);
  if (!Number.isFinite(value) || value <= 0) {
    throw new ConfigError(`${key} must be a positive number, got "${env[key] ?? ''}".`);
  }
  return value;
}

function boolean(env: NodeJS.ProcessEnv, key: string, fallback: boolean): boolean {
  const value = env[key]?.trim().toLowerCase();
  if (value === undefined || value === '') return fallback;
  if (['true', '1', 'yes'].includes(value)) return true;
  if (['false', '0', 'no'].includes(value)) return false;
  throw new ConfigError(`${key} must be true or false, got "${env[key] ?? ''}".`);
}
