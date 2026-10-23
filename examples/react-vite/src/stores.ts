import { boolean, createCookieStore, createStorage, number, oneOf, string } from 'parsistent';

export const local = createStorage('local', {
  count: number(0),
  note: string(''),
  compact: boolean(false),
});

export const cookies = createCookieStore(
  { theme: oneOf(['light', 'dark'], 'light') },
  { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' }
);
