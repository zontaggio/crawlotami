# crawlotami

Checks [Prenotami](https://prenotami.esteri.it/) for available Italian consulate appointment slots every ~10 minutes and sends you a Telegram message when one opens up.

## Setup

```bash
git clone https://github.com/zontaggio/crawlotami.git
cd crawlotami
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | What it is |
|---|---|
| `PRENOTAMI_EMAIL` | Your Prenotami login email |
| `PRENOTAMI_PASSWORD` | Your Prenotami password |
| `TELEGRAM_BOT_TOKEN` | Create a bot with [@BotFather](https://t.me/BotFather), copy the token |
| `TELEGRAM_CHAT_ID` | Message [@userinfobot](https://t.me/userinfobot) to get your chat ID |
| `CHECK_INTERVAL_MS` | Check interval in ms (default: `600000` = 10 min) |

Send `/start` to your bot on Telegram before running. Otherwise it can't message you.

## Run

```bash
node index.js
```

The bot logs into Prenotami, navigates to the passport service page, and checks if there are open slots. If there are, you get a Telegram message. It also sends a heartbeat every ~1 hour so you know it's still running.

## CAPTCHA

Prenotami has bot detection. If it triggers, the bot pauses for 30 minutes and tells you on Telegram. If it keeps happening, set `headless: true` to `headless: false` in `index.js` so a browser window opens and you can solve the CAPTCHA yourself. Increasing the check interval also helps.

## How it works

Uses Playwright with a stealth plugin to control a real browser. Logs in through the `iam.esteri.it` SSO, clicks through to the passport service, and reads the page response. If the page says appointments are booked, it waits and tries again. If it doesn't, it pings you.

## License

MIT
