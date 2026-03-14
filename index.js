require('dotenv').config();
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

chromium.use(stealth());

// --- Config ---
const {
  PRENOTAMI_EMAIL,
  PRENOTAMI_PASSWORD,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  CHECK_INTERVAL_MS = '600000',
} = process.env;

const REQUIRED = { PRENOTAMI_EMAIL, PRENOTAMI_PASSWORD, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID };
for (const [key, val] of Object.entries(REQUIRED)) {
  if (!val) {
    console.error(`Missing ${key}. Copy .env.example to .env and fill in your credentials.`);
    process.exit(1);
  }
}

const INTERVAL = Number(CHECK_INTERVAL_MS);
const HEARTBEAT_EVERY = 6; // every 6 checks (~1h with 10min interval)
const NO_SLOTS_MESSAGES = [
  'Stante l\'elevata richiesta i posti disponibili per il servizio scelto sono esauriti',
  'All appointments for this service are currently booked',
  'esauriti',
  'currently booked',
];
const CAPTCHA_SIGNALS = ['Access temporarily restricted', 'CAPTCHA', 'potentially automated'];

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

// --- Helpers ---
async function notify(msg) {
  try {
    await bot.sendMessage(TELEGRAM_CHAT_ID, msg);
  } catch (err) {
    console.error('Telegram send error:', err.message);
  }
}

function timestamp() {
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function randomDelay(min, max) {
  return new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
}

// Checks if the current page is a CAPTCHA/block page
async function isCaptchaPage(page) {
  const text = await page.textContent('body').catch(() => '');
  return CAPTCHA_SIGNALS.some((s) => text.includes(s));
}

// --- Login ---
async function login(page) {
  console.log(`[${timestamp()}] Logging in...`);
  await page.goto('https://prenotami.esteri.it/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await randomDelay(2000, 4000);

  if (await isCaptchaPage(page)) {
    throw new Error('CAPTCHA');
  }

  // Click "Effettuare il Login per accedere al portale" button
  const loginButton = page.locator('text=Effettuare il Login per accedere al portale');
  if (await loginButton.count() > 0) {
    await loginButton.click();
    await randomDelay(2000, 3000);
  }

  // Wait for redirect to SSO (iam.esteri.it)
  await page.waitForURL('**/iam.esteri.it/**', { timeout: 15000 });
  await page.waitForSelector('#floatingLabelInput33', { timeout: 15000 });
  await randomDelay(1000, 2000);

  await page.fill('#floatingLabelInput33', PRENOTAMI_EMAIL);
  await randomDelay(500, 1500);
  await page.fill('#floatingLabelInput38', PRENOTAMI_PASSWORD);
  await randomDelay(500, 1000);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/prenotami.esteri.it/**', { timeout: 30000 });
  await randomDelay(2000, 4000);
  console.log(`[${timestamp()}] Login OK`);
}

// --- Availability check ---
async function checkAvailability(page) {
  await page.goto('https://prenotami.esteri.it/Services', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await randomDelay(2000, 4000);

  if (await isCaptchaPage(page)) {
    throw new Error('CAPTCHA');
  }

  await page.waitForSelector('#advanced', { timeout: 15000 });
  await page.click('#advanced');
  await randomDelay(2000, 4000);

  // Click the first service in the table (passport)
  const firstServiceLink = page.locator('#dataTableServices tbody tr:first-child td:last-child a');
  if (await firstServiceLink.count() > 0) {
    await firstServiceLink.click();
  } else {
    await page.click('#dataTableServices tbody tr:first-child a');
  }

  await randomDelay(3000, 5000);

  const bodyText = await page.textContent('body');

  if (CAPTCHA_SIGNALS.some((s) => bodyText.includes(s))) {
    throw new Error('CAPTCHA');
  }

  const noSlots = NO_SLOTS_MESSAGES.some((msg) => bodyText.includes(msg));
  return !noSlots;
}

// --- Main ---
async function main() {
  const BROWSER_OPTS = {
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  };
  const CONTEXT_OPTS = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  };

  let browser = await chromium.launch(BROWSER_OPTS);
  let context = await browser.newContext(CONTEXT_OPTS);
  let page = await context.newPage();

  let consecutiveErrors = 0;
  let checkCount = 0;
  let loggedIn = false;

  await notify(`Bot started! Monitoring Prenotami every ${INTERVAL / 60000} min...`);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    await notify('Bot stopped.');
    await browser.close().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  while (true) {
    try {
      if (!loggedIn) {
        await login(page);
        loggedIn = true;
        consecutiveErrors = 0;
      }

      const available = await checkAvailability(page);
      checkCount++;

      if (available) {
        const msg = `SLOT AVAILABLE! Book NOW: https://prenotami.esteri.it/Services`;
        console.log(`[${timestamp()}] ${msg}`);
        await notify(msg);
        await notify(msg);
      } else {
        console.log(`[${timestamp()}] Check #${checkCount} - No slots available.`);
      }

      consecutiveErrors = 0;

      if (checkCount % HEARTBEAT_EVERY === 0) {
        await notify(`Heartbeat: ${checkCount} checks completed. No slots so far. (${timestamp()})`);
      }
    } catch (err) {
      consecutiveErrors++;
      const isCaptcha = err.message === 'CAPTCHA';

      if (isCaptcha) {
        console.error(`[${timestamp()}] CAPTCHA detected! Waiting 30min before retrying...`);
        await notify('CAPTCHA detected! Bot paused for 30min. If it persists, set headless: false to solve manually.');
        loggedIn = false;

        try { await context.close(); } catch (_) {}
        context = await browser.newContext(CONTEXT_OPTS);
        page = await context.newPage();

        await new Promise((r) => setTimeout(r, 30 * 60 * 1000));
        consecutiveErrors = 0;
        continue;
      }

      console.error(`[${timestamp()}] Error (#${consecutiveErrors}): ${err.message}`);

      if (consecutiveErrors >= 3) {
        console.log(`[${timestamp()}] Re-authenticating after ${consecutiveErrors} errors...`);
        await notify(`Re-authenticating after ${consecutiveErrors} consecutive errors.`);
        loggedIn = false;
        consecutiveErrors = 0;

        try { await context.close(); } catch (_) {}
        context = await browser.newContext(CONTEXT_OPTS);
        page = await context.newPage();
      }
    }

    // Random interval jitter ±20% to appear more human
    const jitter = INTERVAL * (0.8 + Math.random() * 0.4);
    await new Promise((r) => setTimeout(r, jitter));
  }
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await notify(`Bot crashed: ${err.message}`);
  process.exit(1);
});
