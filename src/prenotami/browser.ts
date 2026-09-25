import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import type { Browser, BrowserContextOptions, LaunchOptions } from 'playwright';

chromium.use(stealth());

export interface BrowserSettings {
  headless: boolean;
  timeZone: string;
  locale: string;
}

export function launchBrowser({ headless }: BrowserSettings): Promise<Browser> {
  return chromium.launch({
    headless,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  } satisfies LaunchOptions);
}

export function contextOptions({ timeZone, locale }: BrowserSettings): BrowserContextOptions {
  return {
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale,
    timezoneId: timeZone,
  };
}
