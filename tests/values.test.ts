import { parseAsInteger } from 'nuqs';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { decode, encode } from '@/lib/codec';
import { boolean, date, json, number, oneOf, string } from '@/values';

describe('value helpers', () => {
  it('string', () => {
    expect(string('x').parse('hello')).toBe('hello');
    expect(string('x').defaultValue).toBe('x');
    expect(string().defaultValue).toBeUndefined();
  });

  it('oneOf validates against the options', () => {
    const theme = oneOf(['light', 'dark'], 'light');
    expect(theme.parse('dark')).toBe('dark');
    expect(theme.parse('blue')).toBeNull();
    expect(theme.defaultValue).toBe('light');
  });

  it('number rejects non-finite and empty values', () => {
    const count = number(0);
    expect(count.parse('42')).toBe(42);
    expect(count.parse('-1.5')).toBe(-1.5);
    expect(count.parse('abc')).toBeNull();
    expect(count.parse('')).toBeNull();
    expect(count.parse('Infinity')).toBeNull();
    expect(count.serialize(3)).toBe('3');
  });

  it('boolean only accepts true and false', () => {
    expect(boolean(false).parse('true')).toBe(true);
    expect(boolean(false).parse('false')).toBe(false);
    expect(boolean(false).parse('yes')).toBeNull();
  });

  it('date round-trips ISO strings and compares by time', () => {
    const value = date(new Date(0));
    const moment = new Date('2025-01-02T03:04:05.000Z');
    expect(value.parse(value.serialize(moment))).toEqual(moment);
    expect(value.parse('nope')).toBeNull();
    expect(value.parse('2021-02-30T00:00:00.000Z')).toBeNull();
    expect(value.parse('2020-02-29T00:00:00.000Z')).toEqual(new Date('2020-02-29T00:00:00.000Z'));
    // The calendar check applies to the written date, not the UTC date
    expect(value.parse('2021-03-01T00:30:00+01:00')).toEqual(new Date('2021-02-28T23:30:00.000Z'));
    expect(value.eq?.(new Date(1), new Date(1))).toBe(true);
  });

  it('json validates with a function or a Standard Schema', () => {
    const withFunction = json((input) => (typeof input === 'number' ? input : null), 0);
    expect(withFunction.parse('42')).toBe(42);
    expect(withFunction.parse('"x"')).toBeNull();

    const withSchema = json(z.object({ q: z.string() }), { q: '' });
    expect(withSchema.parse('{"q":"vue"}')).toEqual({ q: 'vue' });
    expect(withSchema.parse('{"q":1}')).toBeNull();
    expect(withSchema.eq?.({ q: 'a' }, { q: 'a' })).toBe(true);
  });

  it('decode falls back to the default for missing, invalid and throwing values', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const withSchema = json(z.object({ q: z.string() }), { q: '' });
    expect(decode(number(7), null)).toBe(7);
    expect(decode(number(7), 'x')).toBe(7);
    expect(decode(withSchema, '{not json')).toEqual({ q: '' });
    expect(decode(number(), null)).toBeNull();
    warn.mockRestore();
  });

  it('encode removes null and default values with clearOnDefault', () => {
    expect(encode(number(0), 3, true)).toBe('3');
    expect(encode(number(0), 0, true)).toBeNull();
    expect(encode(number(0), 0, false)).toBe('0');
    expect(encode(number(0), null, false)).toBeNull();
  });

  it('accepts nuqs parsers as values', () => {
    const page = parseAsInteger.withDefault(1);
    expect(decode(page, '5')).toBe(5);
    expect(decode(page, 'x')).toBe(1);
    expect(encode(page, 1, true)).toBeNull();
  });
});
