'use client';

import { createCookieStore, createStorage, number, oneOf, string } from 'parsistent';
import { useItem } from 'parsistent/react';
import { useEffect, useState, type ReactNode } from 'react';

/** The stores behind the live demos. The prefix keeps them apart from anything else. */
const local = createStorage(
  'local',
  { count: number(0), note: string('') },
  { prefix: 'parsistent-docs:' }
);
const cookies = createCookieStore(
  { theme: oneOf(['light', 'dark'], 'light') },
  { prefix: 'parsistent-docs-', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' }
);

/** Shows raw stored values, refreshed on every change (this tab or another one). */
function useRaw(read: () => string, subscribe: (onChange: () => void) => () => void): string {
  const [raw, setRaw] = useState('');
  useEffect(() => {
    const update = () => setRaw(read());
    update();
    return subscribe(update);
  }, [read, subscribe]);
  return raw;
}

const readStorage = () =>
  ['count', 'note']
    .map(
      (key) =>
        `localStorage['parsistent-docs:${key}'] = ${JSON.stringify(localStorage.getItem(`parsistent-docs:${key}`))}`
    )
    .join('\n');
const subscribeStorage = (onChange: () => void) => {
  local.addEventListener('change', onChange);
  return () => local.removeEventListener('change', onChange);
};
const readCookie = () => `document.cookie = ${JSON.stringify(document.cookie)}`;
const subscribeCookie = (onChange: () => void) => {
  cookies.addEventListener('change', onChange);
  return () => cookies.removeEventListener('change', onChange);
};

function Box({ children }: { children: ReactNode }) {
  return (
    // Interactive widgets: excluded from the search index
    <div
      data-pagefind-ignore
      style={{
        border: '1px solid rgba(128, 128, 128, 0.35)',
        borderRadius: 8,
        padding: '1rem',
        margin: '1rem 0',
        display: 'grid',
        gap: '0.75rem',
      }}
    >
      {children}
    </div>
  );
}

const buttonStyle = {
  border: '1px solid rgba(128, 128, 128, 0.5)',
  borderRadius: 6,
  padding: '0.25rem 0.75rem',
};

function Raw({ value }: { value: string }) {
  return (
    <pre style={{ margin: 0, fontSize: '0.8rem', whiteSpace: 'pre-wrap', opacity: 0.8 }}>
      {value || ' '}
    </pre>
  );
}

/** Typed localStorage: a counter and a note that persist and sync across tabs. */
export function StorageDemo() {
  const [count, setCount] = useItem(local, 'count');
  const [note, setNote] = useItem(local, 'note');
  const raw = useRaw(readStorage, subscribeStorage);

  return (
    <Box>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button style={buttonStyle} onClick={() => setCount((c) => c + 1)}>
          count: {count}
        </button>
        <button style={buttonStyle} onClick={() => setCount(null)}>
          reset
        </button>
        <input
          style={{ ...buttonStyle, minWidth: 0, flex: 1 }}
          value={note}
          placeholder="Type a note…"
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      <Raw value={raw} />
      <small>Reload the page, or open it in a second tab: the values stay and sync.</small>
    </Box>
  );
}

/** Invalid stored values read as the default. */
export function ValidationDemo() {
  const [count] = useItem(local, 'count');
  const raw = useRaw(readStorage, subscribeStorage);

  function corrupt() {
    // Written behind parsistent's back, like an old app version or DevTools would
    localStorage.setItem('parsistent-docs:count', 'not a number');
    // Same-tab writes to localStorage fire no event: notify like another tab would
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'parsistent-docs:count', storageArea: localStorage })
    );
  }

  return (
    <Box>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={buttonStyle} onClick={corrupt}>
          Write &quot;not a number&quot; to localStorage
        </button>
        <span>
          <code>local.getItem(&apos;count&apos;)</code> → <strong>{count}</strong>
        </span>
      </div>
      <Raw value={raw} />
    </Box>
  );
}

/** A typed cookie, set from the browser. */
export function CookieDemo() {
  const [theme, setTheme] = useItem(cookies, 'theme');
  const raw = useRaw(readCookie, subscribeCookie);

  return (
    <Box>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button style={buttonStyle} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          theme: {theme}
        </button>
        <button style={buttonStyle} onClick={() => setTheme(null)}>
          delete
        </button>
      </div>
      <Raw value={raw} />
    </Box>
  );
}
