import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runMonitor, type MonitorOptions, type SlotChecker } from '../src/monitor.js';
import { CaptchaError } from '../src/prenotami/session.js';

const options: MonitorOptions = {
  intervalMs: 600_000,
  heartbeatEvery: 3,
  maxConsecutiveErrors: 3,
  captchaPauseMs: 1_800_000,
};

/** Runs the monitor through a scripted list of check results, then stops it. */
async function run(results: Array<boolean | Error>) {
  const stop = new AbortController();
  const queue = [...results];
  const checker: SlotChecker & { logins: number; resets: number } = {
    logins: 0,
    resets: 0,
    async login() {
      this.logins++;
    },
    async hasAvailableSlots() {
      const next = queue.shift();
      if (queue.length === 0) stop.abort();
      if (next instanceof Error) throw next;
      return next ?? false;
    },
    async reset() {
      this.resets++;
    },
  };
  const messages: string[] = [];
  const sleeps: number[] = [];

  await runMonitor(
    {
      checker,
      notify: async (message) => void messages.push(message),
      sleep: async (ms) => void sleeps.push(ms),
      random: () => 0.5,
    },
    options,
    stop.signal,
  );
  return { checker, messages, sleeps };
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('runMonitor', () => {
  it('logs in once and keeps checking', async () => {
    const { checker, sleeps } = await run([false, false]);
    expect(checker.logins).toBe(1);
    expect(sleeps).toEqual([600_000, 600_000]);
  });

  it('alerts once when slots open, then once when they are gone', async () => {
    const { messages } = await run([false, true, true, false]);
    expect(messages.filter((m) => m.includes('Slots available'))).toHaveLength(1);
    expect(messages.filter((m) => m.includes('gone again'))).toHaveLength(1);
  });

  it('sends a heartbeat every few checks', async () => {
    const { messages } = await run([false, false, false]);
    expect(messages.filter((m) => m.includes('Still running'))).toHaveLength(1);
  });

  it('logs in again after repeated errors', async () => {
    const { checker, messages } = await run([new Error('timeout'), new Error('timeout'), new Error('timeout'), false]);
    expect(checker.resets).toBe(1);
    expect(checker.logins).toBe(2);
    expect(messages).toContain('🔁 Logging in again after 3 errors in a row.');
  });

  it('backs off for the CAPTCHA pause instead of retrying', async () => {
    const { checker, sleeps } = await run([new CaptchaError(), false]);
    expect(sleeps[0]).toBe(1_800_000);
    expect(checker.resets).toBe(1);
    expect(checker.logins).toBe(2);
  });
});
