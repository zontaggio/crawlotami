require('dotenv').config();
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');

chromium.use(stealth());
const TelegramBot = require('node-telegram-bot-api');

// --- Config ---
const {
  PRENOTAMI_EMAIL,
  PRENOTAMI_PASSWORD,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  CHECK_INTERVAL_MS = '300000',
} = process.env;

const REQUIRED = { PRENOTAMI_EMAIL, PRENOTAMI_PASSWORD, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID };
for (const [key, val] of Object.entries(REQUIRED)) {
  if (!val) {
    console.error(`Missing ${key}. Copy .env.example to .env and fill in your credentials.`);
    process.exit(1);
  }
}

const INTERVAL = Number(CHECK_INTERVAL_MS);
const HEARTBEAT_EVERY = 12;
const NO_SLOTS_MESSAGES = [
  'Stante l\'elevata richiesta i posti disponibili per il servizio scelto sono esauriti',
  'All appointments for this service are currently booked',
  'esauriti',
  'currently booked',
];

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

// --- Login ---
async function login(page) {
  console.log(`[${timestamp()}] Logging in...`);
  await page.goto('https://prenotami.esteri.it/', { waitUntil: 'domcontentloaded', timeout: 60000 });

  const loginButton = page.locator('text=Effettuare il Login per accedere al portale');
  if (await loginButton.count() > 0) {
    await loginButton.click();
  }

  await page.waitForURL('**/iam.esteri.it/**', { timeout: 15000 });
  await page.waitForSelector('#floatingLabelInput33', { timeout: 15000 });

  await page.fill('#floatingLabelInput33', PRENOTAMI_EMAIL);
  await page.fill('#floatingLabelInput38', PRENOTAMI_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/prenotami.esteri.it/**', { timeout: 30000 });
  console.log(`[${timestamp()}] Login OK`);
}

// --- Availability check ---
async function checkAvailability(page) {
  await page.goto('https://prenotami.esteri.it/Services', { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForSelector('#advanced', { timeout: 15000 });
  await page.click('#advanced');
  await page.waitForTimeout(3000);

  const firstServiceLink = page.locator('#dataTableServices tbody tr:first-child td:last-child a');
  if (await firstServiceLink.count() > 0) {
    await firstServiceLink.click();
  } else {
    await page.click('#dataTableServices tbody tr:first-child a');
  }

  await page.waitForTimeout(3000);

  const bodyText = await page.textContent('body');
  const noSlots = NO_SLOTS_MESSAGES.some((msg) => bodyText.includes(msg));
  return !noSlots;
}

// --- Main ---
async function main() {
  let browser = await chromium.launch({ headless: true });
  let context = await browser.newContext();
  let page = await context.newPage();

  let consecutiveErrors = 0;
  let checkCount = 0;
  let loggedIn = false;

  await notify(`Bot started! Monitoring Prenotami every ${INTERVAL / 60000} min...`);

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
      console.error(`[${timestamp()}] Error (#${consecutiveErrors}): ${err.message}`);

      if (consecutiveErrors >= 3) {
        console.log(`[${timestamp()}] Re-authenticating after ${consecutiveErrors} errors...`);
        await notify(`Re-authenticating after ${consecutiveErrors} consecutive errors.`);
        loggedIn = false;
        consecutiveErrors = 0;

        try { await context.close(); } catch (_) {}
        context = await browser.newContext();
        page = await context.newPage();
      }
    }

    await new Promise((r) => setTimeout(r, INTERVAL));
  }
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await notify(`Bot crashed: ${err.message}`);
  process.exit(1);
});
