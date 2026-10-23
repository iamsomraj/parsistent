import { createCookieStore, createStorage, number, oneOf } from 'parsistent';

/**
 * Cookies are sent with every request, so the server can render them.
 * This module has no 'use client': server components import it to read cookies.
 */
export const appCookies = createCookieStore(
  { theme: oneOf(['light', 'dark'], 'light') },
  { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' }
);

/**
 * localStorage only exists in the browser. 'local' resolves lazily, so this store can be
 * created here: on the server, it reads defaults and ignores writes.
 */
export const local = createStorage('local', { visits: number(0) });
