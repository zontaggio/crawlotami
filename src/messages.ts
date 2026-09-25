/** Telegram messages, formatted with Telegram's HTML subset. */

export function escapeHTML(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const messages = {
  started: (intervalMinutes: number) =>
    `🕷️ <b>crawlotami is watching Prenotami</b>\nChecking every ${intervalMinutes} min. You'll hear from me when slots open.`,

  slotsOpen: (url: string) => `🟢 <b>Slots available!</b>\nBook now, before they're gone:\n${url}`,

  slotsGone: () => '⚪️ The open slots are gone again. Still watching.',

  heartbeat: (checks: number, slotsOpen: boolean, time: string) =>
    `💓 Still running · ${checks} checks · ${slotsOpen ? '<b>slots open right now!</b>' : 'no slots yet'}\n<i>${escapeHTML(time)}</i>`,

  captcha: (minutes: number) =>
    `🧩 <b>CAPTCHA detected</b>\nPausing for ${minutes} min. If it keeps happening, check less often or run with <code>HEADLESS=false</code> to solve it yourself.`,

  reauthenticating: (errors: number) => `🔁 Logging in again after ${errors} errors in a row.`,

  stopped: () => '⏹️ crawlotami stopped.',

  crashed: (reason: string) => `💥 <b>crawlotami crashed</b>\n<code>${escapeHTML(reason)}</code>`,

  test: () => '✅ <b>crawlotami can reach you.</b>\nTelegram is set up correctly.',
};
