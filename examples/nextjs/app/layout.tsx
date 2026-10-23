import { cookies } from 'next/headers';
import { CookieProvider } from 'parsistent/react';
import type { ReactNode } from 'react';
import { appCookies } from './stores';
import { ThemeRoot } from './theme-root';
import './globals.css';

export const metadata = { title: 'parsistent + Next.js' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Typed request cookies, filtered to this store's keys (safe to pass to the client)
  const snapshot = appCookies.fromHeader(await cookies());

  return (
    <html lang="en">
      <body>
        {/* useItem renders these values on the server, so the theme never flashes */}
        <CookieProvider cookies={snapshot.cookies}>
          <ThemeRoot>{children}</ThemeRoot>
        </CookieProvider>
      </body>
    </html>
  );
}
