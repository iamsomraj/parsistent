import { parseAsInteger, parseAsNativeArrayOf } from 'nuqs';
import { describe, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { createCookieStore, createStorage, date, json, number, oneOf, string } from '@/index';
import { useItem } from '@/react';

const local = createStorage('local', {
  theme: oneOf(['light', 'dark'], 'light'),
  count: number(0),
  name: string(),
  at: date(new Date(0)),
  filters: json(z.object({ q: z.string() }), { q: '' }),
  page: parseAsInteger.withDefault(1),
});

describe('types', () => {
  it('getItem returns the value type, nullable without a default', () => {
    expectTypeOf(local.getItem('theme')).toEqualTypeOf<'light' | 'dark'>();
    expectTypeOf(local.getItem('count')).toEqualTypeOf<number>();
    expectTypeOf(local.getItem('name')).toEqualTypeOf<string | null>();
    expectTypeOf(local.getItem('at')).toEqualTypeOf<Date>();
    expectTypeOf(local.getItem('filters')).toEqualTypeOf<{ q: string }>();
    expectTypeOf(local.getItem('page')).toEqualTypeOf<number>();
  });

  it('setItem only accepts schema keys and their value type', () => {
    local.setItem('count', 1);
    local.setItem('theme', 'dark');
    // @ts-expect-error wrong value type
    local.setItem('count', '1');
    // @ts-expect-error not one of the options
    local.setItem('theme', 'blue');
    // @ts-expect-error unknown key
    local.setItem('nope', 1);
    // @ts-expect-error use removeItem to remove a key
    local.setItem('count', null);
  });

  it('key() returns schema keys', () => {
    expectTypeOf(local.key(0)).toEqualTypeOf<
      'theme' | 'count' | 'name' | 'at' | 'filters' | 'page' | null
    >();
  });

  it('cookie stores are async', () => {
    const cookies = createCookieStore({ theme: oneOf(['light', 'dark'], 'light') });
    expectTypeOf(cookies.get('theme')).toEqualTypeOf<Promise<'light' | 'dark'>>();
    expectTypeOf(cookies.fromHeader('').get('theme')).toEqualTypeOf<'light' | 'dark'>();
  });

  it('useItem is typed like useState', () => {
    const [count, setCount] = useItem(local, 'count');
    expectTypeOf(count).toEqualTypeOf<number>();
    setCount(2);
    setCount((current) => current + 1);
    setCount(null);
    // @ts-expect-error wrong value type
    setCount('2');
    // @ts-expect-error unknown key
    useItem(local, 'nope');
  });

  it('rejects nuqs multi parsers', () => {
    // @ts-expect-error storage holds a single string per key
    createStorage('local', { ids: parseAsNativeArrayOf(parseAsInteger) });
  });
});
