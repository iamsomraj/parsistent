'use client';

import { useRouter } from 'next/navigation';
import { useItem } from 'parsistent/react';
import { appCookies } from './stores';

export function ThemeControls() {
  const [theme, setTheme] = useItem(appCookies, 'theme');
  const router = useRouter();

  async function toggleOnServer() {
    // The route handler sets the cookie with a Set-Cookie header
    await fetch('/api/theme', { method: 'POST' });
    // Re-render server components, so both sides show the new cookie
    router.refresh();
  }

  return (
    <section>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Toggle in the browser ({theme})
      </button>
      <button onClick={toggleOnServer}>Toggle on the server</button>
    </section>
  );
}
