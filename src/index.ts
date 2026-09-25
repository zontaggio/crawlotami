import 'dotenv/config';
import { ConfigError, loadConfig } from './config.js';
import { DEFAULT_OPTIONS, runMonitor } from './monitor.js';
import { launchBrowser } from './prenotami/browser.js';
import { PrenotamiSession } from './prenotami/session.js';
import { createTelegramNotifier } from './telegram.js';

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  const notify = createTelegramNotifier(config.telegram.botToken, config.telegram.chatId);
  const browser = await launchBrowser();
  const session = new PrenotamiSession(browser, config.prenotami);
  const stop = new AbortController();

  const shutdown = async () => {
    console.log('\nShutting down...');
    stop.abort();
    await notify('Bot stopped.');
    await browser.close().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  await notify(`Bot started! Monitoring Prenotami every ${config.checkIntervalMs / 60_000} min...`);

  try {
    await runMonitor(
      {
        checker: session,
        notify,
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
        random: Math.random,
      },
      { ...DEFAULT_OPTIONS, intervalMs: config.checkIntervalMs },
      stop.signal,
    );
  } catch (error) {
    console.error('Fatal error:', error);
    await notify(`Bot crashed: ${(error as Error).message}`);
    await browser.close().catch(() => {});
    process.exit(1);
  }
}

await main();
