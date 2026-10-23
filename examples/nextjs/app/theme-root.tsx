'use client';

import { useItem } from 'parsistent/react';
import type { ReactNode } from 'react';
import { appCookies } from './stores';

/** Applies the theme cookie. Server-rendered with the request cookie, then live. */
export function ThemeRoot({ children }: { children: ReactNode }) {
  const [theme] = useItem(appCookies, 'theme');
  return <main className={theme}>{children}</main>;
}
