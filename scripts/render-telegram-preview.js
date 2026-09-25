// Renders docs/assets/telegram-preview.png: a Telegram-style chat showing the bot's
// real messages (from src/messages.ts), so the README never drifts from the code.
//
// Usage: npm run docs:preview   (builds first; uses the Chromium installed by Playwright)

import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { messages } from '../dist/messages.js';

const root = new URL('../', import.meta.url);
const avatar = (await readFile(new URL('docs/assets/avatar.png', root))).toString('base64');
const url = 'https://prenotami.esteri.it/Services';

const chat = [
  { time: '08:02', text: messages.started(10) },
  { time: '09:02', text: messages.heartbeat(6, false, '25/09/2026, 09:02:14') },
  { time: '14:37', text: messages.slotsOpen(url), highlight: true },
  { time: '14:58', text: messages.slotsGone() },
];

const bubbles = chat
  .map(
    ({ time, text, highlight }) => `
      <div class="bubble${highlight ? ' highlight' : ''}">
        <div class="text">${text.replaceAll('\n', '<br>').replace(url, `<a>${url}</a>`)}</div>
        <div class="time">${time}</div>
      </div>`,
  )
  .join('');

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { background: transparent; font: 15px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .window { width: 440px; border-radius: 16px; overflow: hidden; background: #0e1621;
            box-shadow: 0 20px 50px rgba(0,0,0,.35); margin: 30px; }
  header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #17212b; color: #fff; }
  header img { width: 40px; height: 40px; border-radius: 50%; }
  header b { display: block; font-size: 15px; }
  header span { color: #6d7f8f; font-size: 13px; }
  .chat { display: flex; flex-direction: column; gap: 8px; padding: 16px 14px 18px;
          background: radial-gradient(circle at 30% 20%, #16263a, #0e1621 60%); }
  .bubble { align-self: flex-start; max-width: 88%; background: #182533; color: #f5f5f5;
            padding: 8px 12px 6px; border-radius: 14px 14px 14px 4px; }
  .bubble.highlight { background: #1f3a2c; box-shadow: 0 0 0 1px #2f8f5b inset; }
  .text a { color: #6ab3f3; word-break: break-all; }
  .text code { font: 13px ui-monospace, Menlo, monospace; background: rgba(255,255,255,.08); padding: 1px 4px; border-radius: 4px; }
  .time { text-align: right; color: #6d7f8f; font-size: 12px; margin-top: 2px; }
</style></head><body>
  <div class="window">
    <header><img src="data:image/png;base64,${avatar}"><div><b>crawlotami</b><span>bot</span></div></header>
    <div class="chat">${bubbles}</div>
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.setContent(html);
await page
  .locator('body > div')
  .screenshot({ path: new URL('docs/assets/telegram-preview.png', root).pathname, omitBackground: true });
await browser.close();
console.log('Wrote docs/assets/telegram-preview.png');
