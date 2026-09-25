import { describe, expect, it } from 'vitest';
import { escapeHTML, messages } from '../src/messages.js';

describe('messages', () => {
  it('escapes text that could break Telegram HTML', () => {
    expect(escapeHTML('<b>&</b>')).toBe('&lt;b&gt;&amp;&lt;/b&gt;');
    expect(messages.crashed('Timeout <30s> & retry')).toContain('<code>Timeout &lt;30s&gt; &amp; retry</code>');
  });

  it('links straight to the booking page when slots open', () => {
    expect(messages.slotsOpen('https://prenotami.esteri.it/Services')).toContain(
      'https://prenotami.esteri.it/Services',
    );
  });
});
