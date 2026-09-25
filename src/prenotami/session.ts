import type { Browser, BrowserContext, Page } from 'playwright';
import { log } from '../log.js';
import { contextOptions, type BrowserSettings } from './browser.js';
import { hasNoSlots, isCaptchaPage } from './pageState.js';

const PORTAL_URL = 'https://prenotami.esteri.it/';
export const SERVICES_URL = 'https://prenotami.esteri.it/Services';

/** Thrown when Prenotami shows its bot-protection page instead of the portal. */
export class CaptchaError extends Error {
  override name = 'CaptchaError';
}

function randomDelay(min: number, max: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)));
}

/** A signed-in browser session on Prenotami. */
export class PrenotamiSession {
  private context?: BrowserContext;
  private page?: Page;

  constructor(
    private readonly browser: Browser,
    private readonly settings: BrowserSettings,
    private readonly account: { email: string; password: string; serviceRow: number },
  ) {}

  async login(): Promise<void> {
    const page = await this.currentPage();
    log('Logging in...');
    await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await randomDelay(2000, 4000);
    await this.ensureNotBlocked(page);

    // "Effettuare il Login per accedere al portale"
    const loginButton = page.locator('text=Effettuare il Login per accedere al portale');
    if ((await loginButton.count()) > 0) {
      await loginButton.click();
      await randomDelay(2000, 3000);
    }

    // Sign-in happens on the iam.esteri.it SSO portal.
    await page.waitForURL('**/iam.esteri.it/**', { timeout: 15_000 });
    await page.waitForSelector('#floatingLabelInput33', { timeout: 15_000 });
    await randomDelay(1000, 2000);

    await page.fill('#floatingLabelInput33', this.account.email);
    await randomDelay(500, 1500);
    await page.fill('#floatingLabelInput38', this.account.password);
    await randomDelay(500, 1000);
    await page.click('button[type="submit"]');

    // After SSO, Radware's bot manager (validate.perfdrive.com) may run a JavaScript
    // check before redirecting back to Prenotami. Give it enough time to complete.
    await page.waitForURL('**/prenotami.esteri.it/**', { timeout: 120_000 });
    await randomDelay(2000, 4000);
    log('Login OK');
  }

  /** Opens the configured service (the first row, passports, by default) and reports whether it has open slots. */
  async hasAvailableSlots(): Promise<boolean> {
    const page = await this.currentPage();
    await page.goto(SERVICES_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await randomDelay(2000, 4000);
    await this.ensureNotBlocked(page);

    await page.waitForSelector('#advanced', { timeout: 15_000 });
    await page.click('#advanced');
    await randomDelay(2000, 4000);

    const row = `#dataTableServices tbody tr:nth-child(${this.account.serviceRow})`;
    const bookLink = page.locator(`${row} td:last-child a`);
    if ((await bookLink.count()) > 0) {
      await bookLink.click();
    } else {
      await page.click(`${row} a`);
    }
    await randomDelay(3000, 5000);

    const text = (await page.textContent('body')) ?? '';
    if (isCaptchaPage(text)) throw new CaptchaError();
    return !hasNoSlots(text);
  }

  /** Drops cookies and state so the next check starts from a fresh login. */
  async reset(): Promise<void> {
    await this.context?.close().catch(() => {});
    this.context = undefined;
    this.page = undefined;
  }

  private async currentPage(): Promise<Page> {
    if (!this.page) {
      this.context = await this.browser.newContext(contextOptions(this.settings));
      this.page = await this.context.newPage();
    }
    return this.page;
  }

  private async ensureNotBlocked(page: Page): Promise<void> {
    const text = (await page.textContent('body').catch(() => '')) ?? '';
    if (isCaptchaPage(text)) throw new CaptchaError();
  }
}
