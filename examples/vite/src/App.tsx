import { useEffect, useState } from 'react';
import { useItem } from 'parsistent/react';
import { cookies, local } from './stores';

/** Shows what is actually stored, refreshed on every change. */
function useRawStorage(): string {
  const read = () =>
    [
      ...['count', 'note', 'compact'].map(
        (key) => `localStorage.${key} = ${JSON.stringify(localStorage.getItem(key))}`
      ),
      `document.cookie = ${JSON.stringify(document.cookie)}`,
    ].join('\n');
  const [raw, setRaw] = useState(read);
  useEffect(() => {
    const update = () => setRaw(read());
    local.addEventListener('change', update);
    cookies.addEventListener('change', update);
    return () => {
      local.removeEventListener('change', update);
      cookies.removeEventListener('change', update);
    };
  }, []);
  return raw;
}

export function App() {
  const [count, setCount] = useItem(local, 'count');
  const [note, setNote] = useItem(local, 'note');
  const [compact, setCompact] = useItem(local, 'compact');
  const [theme, setTheme] = useItem(cookies, 'theme');
  const raw = useRawStorage();

  return (
    <main className={theme} style={{ padding: compact ? 8 : 24 }}>
      <h1>parsistent playground</h1>
      <p className="hint">Values survive a reload and sync across tabs. Open this page twice.</p>

      <section>
        <button onClick={() => setCount((c) => c + 1)}>count: {count}</button>
        <button onClick={() => setCount(null)}>reset</button>
      </section>
      <section>
        <input
          value={note}
          placeholder="Type a note…"
          onChange={(event) => setNote(event.target.value)}
        />
      </section>
      <section>
        <label>
          <input
            type="checkbox"
            checked={compact}
            onChange={(event) => setCompact(event.target.checked)}
          />{' '}
          compact
        </label>
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          theme: {theme}
        </button>
      </section>

      <pre>{raw}</pre>
    </main>
  );
}
