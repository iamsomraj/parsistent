import type { Schema } from '@/types';

/**
 * Key of the internal interface shared by stores, used by `parsistent/react`.
 * @internal
 */
export const INTERNAL: unique symbol = Symbol.for('parsistent:internal');

/**
 * Raw cookie values from a request, for server rendering.
 * @internal
 */
export type CookieRecord = Record<string, string>;

/**
 * What `useItem` needs from a store.
 * @internal
 */
export type StoreInternals = {
  /** Reads the current value (cached, so unchanged keys keep their reference) */
  read(key: string): unknown;
  /** Reads the value to render on the server and during hydration */
  readServer(key: string, cookies: CookieRecord | null): unknown;
  /** Calls `onChange` when the key changes, in this tab or another one */
  subscribe(key: string, onChange: () => void): () => void;
  /** Writes a value, or removes the key with `null` */
  write(key: string, value: unknown): void | Promise<void>;
};

/**
 * A store usable with `useItem`.
 * @internal
 */
export type AnyStore<S extends Schema = Schema> = {
  readonly schema: S;
  readonly [INTERNAL]: StoreInternals;
};
