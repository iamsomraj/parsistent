import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createStorage } from '@/storage';
import { json, number, oneOf, string } from '@/values';

function createLocal() {
  return createStorage('local', {
    theme: oneOf(['light', 'dark'], 'light'),
    count: number(0),
    name: string(),
    filters: json(z.object({ q: z.string() }), { q: '' }),
  });
}

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('createStorage', () => {
  it('reads defaults for missing keys, and null without a default', () => {
    const local = createLocal();
    expect(local.getItem('theme')).toBe('light');
    expect(local.getItem('count')).toBe(0);
    expect(local.getItem('name')).toBeNull();
  });

  it('writes typed values as strings', () => {
    const local = createLocal();
    local.setItem('count', 3);
    local.setItem('filters', { q: 'vue' });
    expect(localStorage.getItem('count')).toBe('3');
    expect(localStorage.getItem('filters')).toBe('{"q":"vue"}');
    expect(local.getItem('count')).toBe(3);
    expect(local.getItem('filters')).toEqual({ q: 'vue' });
  });

  it('reads invalid stored values as the default', () => {
    const local = createLocal();
    localStorage.setItem('theme', 'blue');
    localStorage.setItem('count', 'abc');
    expect(local.getItem('theme')).toBe('light');
    expect(local.getItem('count')).toBe(0);
  });

  it('removes the key when the default is set, unless clearOnDefault is false', () => {
    const local = createLocal();
    local.setItem('count', 3);
    local.setItem('count', 0);
    expect(localStorage.getItem('count')).toBeNull();

    const keep = createStorage('local', { count: number(0) }, { clearOnDefault: false });
    keep.setItem('count', 0);
    expect(localStorage.getItem('count')).toBe('0');
  });

  it('removeItem, clear, key and length only touch schema keys', () => {
    const local = createLocal();
    localStorage.setItem('other-app', 'keep me');
    local.setItem('count', 1);
    local.setItem('theme', 'dark');
    expect(local.length).toBe(2);
    expect(local.key(0)).toBe('theme');
    expect(local.key(1)).toBe('count');
    expect(local.key(2)).toBeNull();

    local.removeItem('count');
    expect(local.getItem('count')).toBe(0);
    local.clear();
    expect(local.length).toBe(0);
    expect(localStorage.getItem('other-app')).toBe('keep me');
  });

  it('uses the prefix in storage', () => {
    const local = createStorage('local', { count: number(0) }, { prefix: 'app:' });
    local.setItem('count', 2);
    expect(localStorage.getItem('app:count')).toBe('2');
  });

  it('supports sessionStorage and custom Storage objects', () => {
    const session = createStorage('session', { count: number(0) });
    session.setItem('count', 5);
    expect(sessionStorage.getItem('count')).toBe('5');
    expect(localStorage.getItem('count')).toBeNull();

    const custom = createStorage(() => sessionStorage, { count: number(0) });
    expect(custom.getItem('count')).toBe(5);
  });

  it('returns the same reference while the stored value is unchanged', () => {
    const local = createLocal();
    local.setItem('filters', { q: 'a' });
    expect(local.getItem('filters')).toBe(local.getItem('filters'));
  });

  it('throws for keys outside the schema', () => {
    const local = createLocal();
    expect(() => local.getItem('nope' as 'count')).toThrow('"nope" is not a key');
  });

  it('falls back to memory when storage is unavailable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const blocked = createStorage(
      () => {
        throw new Error('SecurityError');
      },
      { count: number(0) }
    );
    blocked.setItem('count', 4);
    expect(blocked.getItem('count')).toBe(4);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  describe('change events', () => {
    it('fires for changes in this tab, with parsed values', () => {
      const local = createLocal();
      const listener = vi.fn();
      local.addEventListener('change', listener);
      local.setItem('count', 2);
      expect(listener).toHaveBeenCalledWith({
        key: 'count',
        oldValue: 0,
        newValue: 2,
        external: false,
      });
    });

    it('fires once per change, for every listener and across stores on the same area', () => {
      const local = createLocal();
      const other = createStorage('local', { count: number(0) });
      const first = vi.fn();
      const second = vi.fn();
      local.addEventListener('change', first);
      local.addEventListener('change', second);
      other.setItem('count', 1);
      expect(first).toHaveBeenCalledTimes(1);
      expect(second).toHaveBeenCalledTimes(1);
    });

    it('does not fire when the value does not change', () => {
      const local = createLocal();
      const listener = vi.fn();
      local.addEventListener('change', listener);
      local.setItem('count', 0);
      localStorage.setItem('count', 'abc'); // invalid, still reads as 0
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'count', storageArea: localStorage })
      );
      expect(listener).not.toHaveBeenCalled();
    });

    it('fires for changes from other tabs (storage events)', () => {
      const local = createLocal();
      const listener = vi.fn();
      local.addEventListener('change', listener);
      localStorage.setItem('theme', 'dark');
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'theme', storageArea: localStorage })
      );
      expect(listener).toHaveBeenCalledWith({
        key: 'theme',
        oldValue: 'light',
        newValue: 'dark',
        external: true,
      });
    });

    it('ignores storage events from another storage area', () => {
      const local = createLocal();
      const listener = vi.fn();
      local.addEventListener('change', listener);
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'theme', storageArea: sessionStorage })
      );
      expect(listener).not.toHaveBeenCalled();
    });

    it('handles clear() from another tab', () => {
      const local = createLocal();
      local.setItem('count', 3);
      const listener = vi.fn();
      local.addEventListener('change', listener);
      localStorage.clear();
      window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage }));
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ key: 'count', newValue: 0 }));
    });

    it('stops after removeEventListener', () => {
      const local = createLocal();
      const listener = vi.fn();
      local.addEventListener('change', listener);
      local.removeEventListener('change', listener);
      local.setItem('count', 1);
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
