require('dotenv').config();
const { chromium } = require('playwright');
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
const NO_SLOTS_TEXT = 'Stante l\'elevata richiesta i posti disponibili per il servizio scelto sono esauriti';

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

  await page.waitForSelector('#login-email', { timeout: 15000 });
  await page.fill('#login-email', PRENOTAMI_EMAIL);
  await page.fill('#login-password', PRENOTAMI_PASSWORD);
  await page.press('#login-password', 'Enter');
  await page.waitForURL('**/UserArea**', { timeout: 30000 });
  console.log(`[${timestamp()}] Login OK`);
}

// --- Availability check ---
async function checkAvailability(page) {
  await page.goto('https://prenotami.esteri.it/Services', { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForSelector('#advanced', { timeout: 15000 });
  await page.click('#advanced');
  await page.waitForTimeout(3000);

  // Click the first service in the table (passport)
  const firstServiceLink = page.locator('#dataTableServices tbody tr:first-child td:last-child a');
  if (await firstServiceLink.count() > 0) {
    await firstServiceLink.click();
  } else {
    await page.click('#dataTableServices tbody tr:first-child a');
  }

  await page.waitForTimeout(3000);

  const bodyText = await page.textContent('body');

  if (bodyText.includes(NO_SLOTS_TEXT) || bodyText.includes('esauriti')) {
    return false;
  }

  return true;
}

// --- Main ---
async function main() {
  let browser = await chromium.launch({ headless: true });
  let context = await browser.newContext();
  let page = await context.newPage();

  let loggedIn = false;
  let checkCount = 0;

  await notify(`Bot started! Monitoring Prenotami every ${INTERVAL / 60000} min...`);

  while (true) {
    try {
      if (!loggedIn) {
        await login(page);
        loggedIn = true;
      }

      const available = await checkAvailability(page);
      checkCount++;

      if (available) {
        const msg = `SLOT AVAILABLE! Book NOW: https://prenotami.esteri.it/Services`;
        console.log(`[${timestamp()}] ${msg}`);
        await notify(msg);
      } else {
        console.log(`[${timestamp()}] Check #${checkCount} - No slots available.`);
      }
    } catch (err) {
      console.error(`[${timestamp()}] Error: ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, INTERVAL));
  }
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await notify(`Bot crashed: ${err.message}`);
  process.exit(1);
});
