// Type-checked against the built `dist` declarations (see the tsconfig.json next to this file),
// the way a project using the published package sees them. Run with `bun run test:dist`.
import type { ReactNode } from 'react';
import { createCookieStore, createStorage, number, oneOf } from 'parsistent';
import { CookieProvider, useItem } from 'parsistent/react';

const local = createStorage('local', { count: number(0) });
const cookies = createCookieStore({ theme: oneOf(['light', 'dark'], 'light') });

export function Example(): ReactNode {
  // Stores from the main entry must be accepted by the hooks from `parsistent/react`
  const [count, setCount] = useItem(local, 'count');
  const [theme, setTheme] = useItem(cookies, 'theme');
  const total: number = count + 1;
  const mode: 'light' | 'dark' = theme;
  return (
    <CookieProvider cookies={cookies.fromHeader('theme=dark').cookies}>
      <button onClick={() => setCount((c) => c + 1)}>{total}</button>
      <button onClick={() => setTheme(mode === 'light' ? 'dark' : 'light')}>{mode}</button>
    </CookieProvider>
  );
}
