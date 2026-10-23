import { act, render, renderHook, screen } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createCookieStore } from '@/cookies';
import { CookieProvider, useItem } from '@/react';
import { createStorage } from '@/storage';
import { json, number, oneOf } from '@/values';

const local = createStorage('local', {
  count: number(0),
  filters: json(z.object({ q: z.string() }), { q: '' }),
});
const cookies = createCookieStore({ theme: oneOf(['light', 'dark'], 'light') });

afterEach(() => {
  localStorage.clear();
  document.cookie = 'theme=; Path=/; Max-Age=0';
});

describe('useItem', () => {
  it('reads and writes like useState', () => {
    const { result } = renderHook(() => useItem(local, 'count'));
    expect(result.current[0]).toBe(0);
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
    expect(localStorage.getItem('count')).toBe('2');
    act(() => result.current[1]((count) => count + 1));
    expect(result.current[0]).toBe(3);
    act(() => result.current[1](null));
    expect(result.current[0]).toBe(0);
    expect(localStorage.getItem('count')).toBeNull();
  });

  it('keeps the setter stable and objects referentially stable', () => {
    const { result, rerender } = renderHook(() => useItem(local, 'filters'));
    const [, setFilters] = result.current;
    act(() => setFilters({ q: 'a' }));
    const first = result.current[0];
    rerender();
    expect(result.current[0]).toBe(first);
    expect(result.current[1]).toBe(setFilters);
  });

  it('syncs hooks reading the same key', () => {
    const first = renderHook(() => useItem(local, 'count'));
    const second = renderHook(() => useItem(local, 'count'));
    act(() => first.result.current[1](5));
    expect(second.result.current[0]).toBe(5);
  });

  it('updates on native setItem and on changes from other tabs', () => {
    const { result } = renderHook(() => useItem(local, 'count'));
    act(() => local.setItem('count', 4));
    expect(result.current[0]).toBe(4);
    act(() => {
      localStorage.setItem('count', '9');
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'count', storageArea: localStorage })
      );
    });
    expect(result.current[0]).toBe(9);
  });

  it('works with cookie stores', () => {
    const { result } = renderHook(() => useItem(cookies, 'theme'));
    expect(result.current[0]).toBe('light');
    act(() => result.current[1]('dark'));
    expect(result.current[0]).toBe('dark');
    expect(document.cookie).toContain('theme=dark');
  });

  describe('server rendering', () => {
    function Count() {
      const [count] = useItem(local, 'count');
      return <span>count:{count}</span>;
    }

    function Theme() {
      const [theme] = useItem(cookies, 'theme');
      return <span>theme:{theme}</span>;
    }

    it('renders the default on the server and hydrates without mismatch', async () => {
      localStorage.setItem('count', '3');
      const html = renderToString(<Count />);
      expect(html).toContain('count:<!-- -->0');

      const container = document.createElement('div');
      container.innerHTML = html;
      document.body.appendChild(container);
      const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      await act(async () => {
        hydrateRoot(container, <Count />);
      });
      expect(errors).not.toHaveBeenCalled();
      errors.mockRestore();
      // After hydration, the stored value shows
      expect(container.textContent).toBe('count:3');
      container.remove();
    });

    it('renders request cookies with CookieProvider', () => {
      const snapshot = cookies.fromHeader('theme=dark; session=secret');
      const html = renderToString(
        <CookieProvider cookies={snapshot.cookies}>
          <Theme />
        </CookieProvider>
      );
      expect(html).toContain('theme:<!-- -->dark');
    });
  });

  it('renders in a component', () => {
    function Counter() {
      const [count, setCount] = useItem(local, 'count');
      return <button onClick={() => setCount((c) => c + 1)}>count {count}</button>;
    }
    render(<Counter />);
    act(() => screen.getByRole('button').click());
    expect(screen.getByRole('button').textContent).toBe('count 1');
  });
});
