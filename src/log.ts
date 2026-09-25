let format = { locale: 'pt-BR', timeZone: 'America/Sao_Paulo' };

/** Sets the locale and time zone used for timestamps. */
export function configureLog(options: { locale: string; timeZone: string }): void {
  format = options;
}

export function timestamp(): string {
  return new Date().toLocaleString(format.locale, { timeZone: format.timeZone });
}

export function log(message: string): void {
  console.log(`[${timestamp()}] ${message}`);
}

export function logError(message: string): void {
  console.error(`[${timestamp()}] ${message}`);
}
