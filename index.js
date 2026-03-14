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
