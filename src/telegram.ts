import TelegramBot from 'node-telegram-bot-api';

export type Notify = (message: string) => Promise<void>;

/** Sends messages to one Telegram chat. Failures are logged, never thrown. */
export function createTelegramNotifier(botToken: string, chatId: string): Notify {
  const bot = new TelegramBot(botToken);
  return async (message) => {
    try {
      await bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('Telegram send error:', (error as Error).message);
    }
  };
}
