// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createCookieStore } from '@/cookies';
import { number, oneOf } from '@/values';

const cookies = createCookieStore({ theme: oneOf(['light', 'dark'], 'light'), count: number(0) });
const header = 'theme=dark; count=7; session=secret';

describe('cookie store on the server', () => {
  it('fromHeader reads a Cookie header, a Request, Headers, a record and getAll()', () => {
    const inputs = [
      header,
      new Request('http://localhost/', { headers: { cookie: header } }),
      new Headers({ cookie: header }),
      { theme: 'dark', count: '7', session: 'secret' },
      {
        getAll: () => [
          { name: 'theme', value: 'dark' },
          { name: 'count', value: '7' },
        ],
      },
    ];
    inputs.forEach((input) => {
      const snapshot = cookies.fromHeader(input);
      expect(snapshot.get('theme')).toBe('dark');
      expect(snapshot.get('count')).toBe(7);
    });
  });

  it('fromHeader only keeps this store’s cookies in the record', () => {
    expect(cookies.fromHeader(header).cookies).toEqual({ theme: 'dark', count: '7' });
  });

  it('fromHeader uses defaults for missing or invalid cookies', () => {
    const snapshot = cookies.fromHeader('theme=blue');
    expect(snapshot.get('theme')).toBe('light');
    expect(snapshot.get('count')).toBe(0);
  });

  it('get reads defaults, and set rejects with a pointer to serialize()', async () => {
    await expect(cookies.get('theme')).resolves.toBe('light');
    await expect(cookies.set('theme', 'dark')).rejects.toThrow('cookies.serialize()');
  });
});
