import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCookieStore } from '@/cookies';
import { number, oneOf } from '@/values';

function createCookies() {
  return createCookieStore(
    { theme: oneOf(['light', 'dark'], 'light'), count: number(0) },
    { sameSite: 'lax' }
  );
}

function clearCookies() {
  document.cookie.split(';').forEach((part) => {
    const name = part.split('=')[0]?.trim();
    if (name) {
      document.cookie = `${name}=; Path=/; Max-Age=0`;
    }
  });
}

afterEach(clearCookies);

describe('createCookieStore', () => {
  it('reads defaults, then the values that were set', async () => {
    const cookies = createCookies();
    await expect(cookies.get('theme')).resolves.toBe('light');
    await cookies.set('theme', 'dark');
    await cookies.set('count', 2);
    await expect(cookies.get('theme')).resolves.toBe('dark');
    await expect(cookies.get('count')).resolves.toBe(2);
    expect(document.cookie).toContain('theme=dark');
  });

  it('reads invalid values as the default', async () => {
    const cookies = createCookies();
    document.cookie = 'theme=blue; Path=/';
    await expect(cookies.get('theme')).resolves.toBe('light');
  });

  it('deletes the cookie, and when the default is set', async () => {
    const cookies = createCookies();
    await cookies.set('count', 2);
    await cookies.delete('count');
    expect(document.cookie).not.toContain('count=');
    await cookies.set('theme', 'dark');
    await cookies.set('theme', 'light');
    expect(document.cookie).not.toContain('theme=');
  });

  it('writes attributes from store defaults and call options', async () => {
    const setter = vi.spyOn(document, 'cookie', 'set');
    const cookies = createCookies();
    await cookies.set('count', 3, { maxAge: 60, secure: true });
    expect(setter).toHaveBeenLastCalledWith('count=3; Path=/; Max-Age=60; SameSite=Lax; Secure');
    setter.mockRestore();
  });

  it('serialize returns Set-Cookie headers, including deletions', () => {
    const cookies = createCookies();
    expect(cookies.serialize('theme', 'dark', { maxAge: 10 })).toBe(
      'theme=dark; Path=/; Max-Age=10; SameSite=Lax'
    );
    expect(cookies.serialize('theme', null)).toBe(
      'theme=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
    );
  });

  it('encodes values and supports a prefix', async () => {
    const cookies = createCookieStore(
      { name: oneOf(['a b;c'], 'a b;c'), count: number(0) },
      { prefix: 'app_' }
    );
    await cookies.set('count', 4);
    expect(document.cookie).toContain('app_count=4');
    expect(cookies.serialize('count', 5)).toBe('app_count=5; Path=/');
  });

  describe('change events', () => {
    it('fires for changes made through any store', async () => {
      const cookies = createCookies();
      const other = createCookies();
      const listener = vi.fn();
      cookies.addEventListener('change', listener);
      await other.set('count', 1);
      expect(listener).toHaveBeenCalledWith({
        key: 'count',
        oldValue: 0,
        newValue: 1,
        external: false,
      });
      cookies.removeEventListener('change', listener);
      await other.set('count', 2);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
