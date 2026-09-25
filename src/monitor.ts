import { log, logError, timestamp } from './log.js';
import { CaptchaError, SERVICES_URL } from './prenotami/session.js';
import type { Notify } from './telegram.js';

/** What the monitor needs from a Prenotami session; faked in tests. */
export interface SlotChecker {
  login(): Promise<void>;
  hasAvailableSlots(): Promise<boolean>;
  reset(): Promise<void>;
}

export interface MonitorOptions {
  intervalMs: number;
  /** Send a heartbeat every this many checks. */
  heartbeatEvery: number;
  /** Log in again after this many errors in a row. */
  maxConsecutiveErrors: number;
  captchaPauseMs: number;
}

export interface MonitorDependencies {
  checker: SlotChecker;
  notify: Notify;
  sleep: (ms: number) => Promise<void>;
  random: () => number;
}

export const DEFAULT_OPTIONS: Omit<MonitorOptions, 'intervalMs' | 'heartbeatEvery'> = {
  maxConsecutiveErrors: 3,
  captchaPauseMs: 30 * 60 * 1000,
};

/** Checks for slots until `signal` is aborted. */
export async function runMonitor(
  { checker, notify, sleep, random }: MonitorDependencies,
  options: MonitorOptions,
  signal: AbortSignal,
): Promise<void> {
  let loggedIn = false;
  let consecutiveErrors = 0;
  let checkCount = 0;
  let slotsOpen = false;

  while (!signal.aborted) {
    try {
      if (!loggedIn) {
        await checker.login();
        loggedIn = true;
        consecutiveErrors = 0;
      }

      const available = await checker.hasAvailableSlots();
      checkCount++;

      // Alert when slots open and when they're gone, not on every check in between.
      if (available && !slotsOpen) {
        const message = `SLOT AVAILABLE! Book NOW: ${SERVICES_URL}`;
        log(message);
        await notify(message);
      } else if (!available && slotsOpen) {
        log('Slots are gone again.');
        await notify('The open slots are gone again. Still watching.');
      } else {
        log(`Check #${checkCount} - ${available ? 'Slots still open.' : 'No slots available.'}`);
      }
      slotsOpen = available;

      consecutiveErrors = 0;

      if (checkCount % options.heartbeatEvery === 0) {
        const status = slotsOpen ? 'Slots are open right now!' : 'No slots so far.';
        await notify(`Heartbeat: ${checkCount} checks completed. ${status} (${timestamp()})`);
      }
    } catch (error) {
      consecutiveErrors++;

      if (error instanceof CaptchaError) {
        const minutes = Math.round(options.captchaPauseMs / 60_000);
        logError(`CAPTCHA detected! Waiting ${minutes} min before retrying...`);
        await notify(
          `CAPTCHA detected! Paused for ${minutes} min. If it keeps happening, check less often or run with HEADLESS=false to solve it yourself.`,
        );
        loggedIn = false;
        await checker.reset();
        await sleep(options.captchaPauseMs);
        consecutiveErrors = 0;
        continue;
      }

      logError(`Error (#${consecutiveErrors}): ${(error as Error).message}`);

      if (consecutiveErrors >= options.maxConsecutiveErrors) {
        log(`Re-authenticating after ${consecutiveErrors} errors...`);
        await notify(`Re-authenticating after ${consecutiveErrors} consecutive errors.`);
        loggedIn = false;
        consecutiveErrors = 0;
        await checker.reset();
      }
    }

    // Random interval jitter of ±20%.
    await sleep(options.intervalMs * (0.8 + random() * 0.4));
  }
}
