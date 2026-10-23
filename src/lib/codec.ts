import type { Value } from '@/types';

let warnedParse = false;

/**
 * Parses a stored string, returning `null` instead of throwing.
 * @internal
 */
export function safeParse<T>(value: Value<T>, raw: string): T | null {
  try {
    return value.parse(raw) ?? null;
  } catch (error) {
    if (!warnedParse) {
      warnedParse = true;
      console.warn('[parsistent] A stored value failed to parse and was ignored', error);
    }
    return null;
  }
}

/**
 * Compares two values with the {@link Value}'s `eq`, or `===`.
 * @internal
 */
export function isEqual<T>(value: Value<T>, valueA: T, valueB: T): boolean {
  return value.eq ? value.eq(valueA, valueB) : valueA === valueB;
}

/**
 * Converts a raw stored string into the value read from a key: the parsed value,
 * or the default (or `null`) when the key is missing or invalid.
 * @internal
 */
export function decode<T>(value: Value<T>, raw: string | null): T | null {
  const parsed = raw === null ? null : safeParse(value, raw);
  return parsed ?? value.defaultValue ?? null;
}

/**
 * Converts a value into the string to store, or `null` when the key should be removed:
 * the value is `null`, or equals the default with `clearOnDefault`.
 * @internal
 */
export function encode<T>(value: Value<T>, next: T | null, clearOnDefault: boolean): string | null {
  if (next === null) {
    return null;
  }
  const { defaultValue } = value;
  if (clearOnDefault && defaultValue !== undefined && isEqual(value, next, defaultValue)) {
    return null;
  }
  return value.serialize(next);
}

/**
 * Caches the decoded value per raw string, so reading an unchanged key returns the
 * same reference (required by React's `useSyncExternalStore` for objects and dates).
 * @internal
 */
export class DecodeCache {
  private readonly entries = new Map<string, { raw: string | null; value: unknown }>();

  read<T>(key: string, value: Value<T>, raw: string | null): T | null {
    const cached = this.entries.get(key);
    if (cached?.raw === raw) {
      return cached.value as T | null;
    }
    const decoded = decode(value, raw);
    this.entries.set(key, { raw, value: decoded });
    return decoded;
  }
}
