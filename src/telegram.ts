import { logError } from './log.js';

export type Notify = (message: string) => Promise<void>;

/**
 * Sends HTML-formatted messages (see `messages.ts`) to one Telegram chat through the Bot API. Failures are logged,
 * never thrown: a Telegram hiccup shouldn't stop the monitor.
 */
export function createTelegramNotifier(botToken: string, chatId: string, fetchImpl: typeof fetch = fetch): Notify {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  return async (message) => {
    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', disable_web_page_preview: true }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { description?: string };
        logError(`Telegram send error: ${response.status} ${body.description ?? response.statusText}`);
      }
    } catch (error) {
      logError(`Telegram send error: ${(error as Error).message}`);
    }
  };
}
