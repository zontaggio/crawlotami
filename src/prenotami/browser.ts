import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import type { Browser, BrowserContextOptions, LaunchOptions } from 'playwright';

chromium.use(stealth());

const LAUNCH_OPTIONS: LaunchOptions = {
  headless: true,
  args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
};

export const CONTEXT_OPTIONS: BrowserContextOptions = {
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  viewport: { width: 1280, height: 720 },
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
};

export function launchBrowser(): Promise<Browser> {
  return chromium.launch(LAUNCH_OPTIONS);
}
