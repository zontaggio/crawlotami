import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTelegramNotifier } from '../src/telegram.js';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('createTelegramNotifier', () => {
  it('posts the message to the chat through the Bot API', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"ok":true}'));
    await createTelegramNotifier('123:abc', '42', fetchMock)('Hello');

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://api.telegram.org/bot123:abc/sendMessage');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toMatchObject({ chat_id: '42', text: 'Hello' });
  });

  it('logs API errors instead of throwing', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('{"ok":false,"description":"Bad Request: chat not found"}', { status: 400 }));
    await expect(createTelegramNotifier('123:abc', '42', fetchMock)('Hello')).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('400 Bad Request: chat not found'));
  });

  it('logs network errors instead of throwing', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));
    await expect(createTelegramNotifier('123:abc', '42', fetchMock)('Hello')).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('ENOTFOUND'));
  });
});
