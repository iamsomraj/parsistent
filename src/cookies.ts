import { DecodeCache, encode } from '@/lib/codec';
import { Emitter } from '@/lib/emitter';
import { INTERNAL, type CookieRecord, type StoreInternals } from '@/lib/internal';
import type { inferInput, inferValue, Schema } from '@/types';

/**
 * Cookie attributes, named like the Cookie Store API and `Set-Cookie`.
 * Without `maxAge` or `expires`, the cookie is a session cookie.
 */
export type CookieOptions = {
  /** URL path the cookie is sent for (default: `'/'`) */
  path?: string;
  /** Domain the cookie is sent to, e.g. `'example.com'` to include subdomains */
  domain?: string;
  /** Lifetime in seconds */
  maxAge?: number;
  /** Expiry date, or a timestamp in milliseconds */
  expires?: Date | number;
  /** Cross-site sending policy. `'none'` requires `secure: true` in browsers */
  sameSite?: 'strict' | 'lax' | 'none';
  /** Only send the cookie over HTTPS */
  secure?: boolean;
  /** Partition the cookie per top-level site (CHIPS) */
  partitioned?: boolean;
};

/** Options for {@link createCookieStore}: default attributes for every cookie, and more. */
export type CreateCookieStoreOptions = CookieOptions & {
  /** Delete the cookie when a value equal to its default is set (default: `true`) */
  clearOnDefault?: boolean;
  /** Prefix added to every cookie name, e.g. `'app_'` */
  prefix?: string;
};

/**
 * Cookies from a request: a `Cookie` header, a `Request` or `Headers`, a record, or an
 * object with `getAll()` such as Next.js `cookies()`.
 */
export type CookieInput =
  | string
  | Request
  | Headers
  | Readonly<Record<string, string | undefined>>
  | { getAll(): ReadonlyArray<{ name: string; value: string }> };

/** Typed, read-only view of request cookies, returned by `fromHeader`. */
export type CookieSnapshot<S extends Schema> = {
  /** Returns the value of a key, or its default when missing or invalid */
  get<K extends keyof S & string>(key: K): inferValue<S[K]>;
  /**
   * The raw values of this store's cookies only (never other request cookies),
   * to pass to `<CookieProvider>` from `parsistent/react`
   */
  readonly cookies: CookieRecord;
};

/** Event passed to `change` listeners, with parsed values. */
export type CookieChangeEvent<S extends Schema> = {
  [K in keyof S & string]: {
    readonly key: K;
    readonly oldValue: inferValue<S[K]>;
    readonly newValue: inferValue<S[K]>;
    /** `true` when the change did not come from this store (another tab, the server…) */
    readonly external: boolean;
  };
}[keyof S & string];

/** Listener for {@link TypedCookieStore} `change` events. */
export type CookieChangeListener<S extends Schema> = (event: CookieChangeEvent<S>) => void;

/** A typed mirror of the Cookie Store API (`window.cookieStore`), limited to a schema. */
export type TypedCookieStore<S extends Schema> = {
  /** The schema the store was created with */
  readonly schema: S;
  /** Returns the value of a key, or its default when missing or invalid */
  get<K extends keyof S & string>(key: K): Promise<inferValue<S[K]>>;
  /** Sets a cookie. Setting the default deletes it (see `clearOnDefault`) */
  set<K extends keyof S & string>(
    key: K,
    value: inferInput<S[K]>,
    options?: CookieOptions
  ): Promise<void>;
  /** Deletes a cookie. Pass the same `path` / `domain` it was set with */
  delete<K extends keyof S & string>(
    key: K,
    options?: Pick<CookieOptions, 'path' | 'domain'>
  ): Promise<void>;
  /** Listens to changes. Changes from other tabs need the native Cookie Store API */
  addEventListener(type: 'change', listener: CookieChangeListener<S>): void;
  /** Removes a listener added with `addEventListener` */
  removeEventListener(type: 'change', listener: CookieChangeListener<S>): void;
  /** Reads typed values from request cookies, on the server (no `document` needed) */
  fromHeader(input: CookieInput): CookieSnapshot<S>;
  /**
   * Returns a `Set-Cookie` header value for a key, e.g. in a route handler.
   * Returns a deletion header when the value is `null` or equals the default.
   */
  serialize<K extends keyof S & string>(
    key: K,
    value: inferInput<S[K]> | null,
    options?: CookieOptions
  ): string;
  /** @internal */
  readonly [INTERNAL]: StoreInternals;
};

/** Payload of the internal change notifications. */
type CookieChange = { external: boolean };

/** Minimal typing of the native Cookie Store `change` event. */
type NativeCookieStore = {
  addEventListener(
    type: 'change',
    listener: (event: {
      changed: ReadonlyArray<{ name: string }>;
      deleted: ReadonlyArray<{ name: string }>;
    }) => void
  ): void;
};

// `document.cookie` is global, so every store shares one emitter
let emitter: Emitter<CookieChange> | undefined;

/**
 * Returns the emitter shared by all cookie stores, creating it on first use. Where the
 * native Cookie Store API exists, it also reports changes from other tabs and from the
 * server (`Set-Cookie` responses).
 */
function sharedEmitter(): Emitter<CookieChange> {
  if (!emitter) {
    const created = new Emitter<CookieChange>();
    emitter = created;
    const native = (globalThis as { cookieStore?: NativeCookieStore }).cookieStore;
    native?.addEventListener('change', (event) => {
      [...event.changed, ...event.deleted].forEach(({ name }) =>
        created.emit(name, { external: true })
      );
    });
  }
  return emitter;
}

/** Creates a record without a prototype, so any cookie name is a plain key. */
function createRecord(): CookieRecord {
  return Object.create(null) as CookieRecord;
}

/** Decodes a percent-encoded cookie name or value, keeping it as is when malformed. */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Parses a `Cookie` header (or `document.cookie`). The first value of a name wins. */
function parseCookieHeader(header: string): CookieRecord {
  const record = createRecord();
  header.split(';').forEach((part) => {
    const index = part.indexOf('=');
    if (index === -1) {
      return;
    }
    const name = safeDecode(part.slice(0, index).trim());
    if (name !== '' && !Object.prototype.hasOwnProperty.call(record, name)) {
      record[name] = safeDecode(part.slice(index + 1).trim());
    }
  });
  return record;
}

/** Normalizes any {@link CookieInput} to a record of raw cookie values. */
function toCookieRecord(input: CookieInput): CookieRecord {
  if (typeof input === 'string') {
    return parseCookieHeader(input);
  }
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return parseCookieHeader(input.headers.get('cookie') ?? '');
  }
  if (typeof Headers !== 'undefined' && input instanceof Headers) {
    return parseCookieHeader(input.get('cookie') ?? '');
  }
  if (typeof (input as { getAll?: unknown }).getAll === 'function') {
    const record = createRecord();
    (input as { getAll(): ReadonlyArray<{ name: string; value: string }> })
      .getAll()
      .forEach(({ name, value }) => {
        record[name] ??= value;
      });
    return record;
  }
  const record = createRecord();
  Object.entries(input as Record<string, string | undefined>).forEach(([name, value]) => {
    if (value !== undefined) {
      record[name] = value;
    }
  });
  return record;
}

/** `'lax'` → `'Lax'`, as written in `Set-Cookie`. */
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Builds a `Set-Cookie` / `document.cookie` string. Name and value are percent-encoded. */
function serializeCookie(name: string, value: string, options: CookieOptions): string {
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  cookie += `; Path=${options.path ?? '/'}`;
  if (options.domain !== undefined) {
    cookie += `; Domain=${options.domain}`;
  }
  if (options.maxAge !== undefined) {
    cookie += `; Max-Age=${Math.floor(options.maxAge)}`;
  }
  if (options.expires !== undefined) {
    cookie += `; Expires=${new Date(options.expires).toUTCString()}`;
  }
  if (options.sameSite !== undefined) {
    cookie += `; SameSite=${capitalize(options.sameSite)}`;
  }
  if (options.secure === true) {
    cookie += '; Secure';
  }
  if (options.partitioned === true) {
    cookie += '; Partitioned';
  }
  return cookie;
}

/** Returns the cookies visible to this page (none on the server). */
function readDocumentCookies(): CookieRecord {
  return typeof document === 'undefined' ? createRecord() : parseCookieHeader(document.cookie);
}

/** Runs `task` and returns its result as a Promise, turning a thrown error into a rejection. */
function attempt<T>(task: () => T): Promise<T> {
  try {
    return Promise.resolve(task());
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Creates a typed mirror of the Cookie Store API for the keys of a schema.
 * Methods are async like `window.cookieStore`, and work in every browser.
 *
 * @param schema Each cookie and how its value is stored (see {@link string}, {@link number}…)
 * @param options Default cookie attributes, `clearOnDefault` and `prefix`
 *
 * @example
 * ```ts
 * const cookies = createCookieStore(
 *   { theme: oneOf(['light', 'dark'], 'light') },
 *   { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' }
 * )
 *
 * await cookies.set('theme', 'dark')
 * await cookies.get('theme') // 'dark'
 *
 * // On the server
 * cookies.fromHeader(request).get('theme')
 * ```
 */
export function createCookieStore<S extends Schema>(
  schema: S,
  options: CreateCookieStoreOptions = {}
): TypedCookieStore<S> {
  const { clearOnDefault = true, prefix = '', ...defaults } = options;
  const keys = Object.keys(schema);
  // Client reads and server reads (hydration) are cached apart, so they never evict
  // each other and values keep a stable reference
  const cache = new DecodeCache();
  const serverCache = new DecodeCache();
  const listeners = new Set<CookieChangeListener<S>>();
  let stopListening: (() => void) | undefined;

  /** Returns the value definition of a key, throwing for keys outside the schema. */
  function valueOf(key: string): NonNullable<S[string]> {
    if (!Object.prototype.hasOwnProperty.call(schema, key)) {
      throw new TypeError(`[parsistent] "${key}" is not a key of this cookie store`);
    }
    return schema[key] as NonNullable<S[string]>;
  }

  /** Returns the raw value of a key's cookie in a record, or `null`. */
  function rawOf(record: CookieRecord, key: string): string | null {
    const name = prefix + key;
    return Object.prototype.hasOwnProperty.call(record, name) ? (record[name] ?? null) : null;
  }

  /** Returns the decoded value of a key from `document.cookie`. */
  function read(key: string): unknown {
    return cache.read(key, valueOf(key), rawOf(readDocumentCookies(), key));
  }

  /** Builds the cookie string for a value: a deletion when it is `null` or the default. */
  function headerFor(key: string, value: unknown, callOptions: CookieOptions): string {
    const attributes = { ...defaults, ...callOptions };
    const encoded = encode(valueOf(key), value, clearOnDefault);
    if (encoded === null) {
      return serializeCookie(prefix + key, '', { ...attributes, maxAge: 0, expires: 0 });
    }
    return serializeCookie(prefix + key, encoded, attributes);
  }

  /** Writes a cookie through `document.cookie`, then notifies subscribers. */
  function write(key: string, value: unknown, callOptions: CookieOptions = {}): void {
    const header = headerFor(key, value, callOptions);
    if (typeof document === 'undefined') {
      throw new Error(
        '[parsistent] Cookies can only be written in the browser. On the server, send ' +
          '`cookies.serialize()` as a Set-Cookie header'
      );
    }
    document.cookie = header;
    sharedEmitter().emit(prefix + key, { external: false });
  }

  /** Calls `onChange` when a key's cookie changes. */
  function subscribe(key: string, onChange: (change: CookieChange) => void): () => void {
    valueOf(key);
    return sharedEmitter().on(prefix + key, onChange);
  }

  /**
   * Subscribes once per key on behalf of all `change` listeners: old and new values are
   * computed once per change, then passed to every listener.
   */
  function startListening(): () => void {
    // Tracked apart from the decode cache, which other readers (React) also update
    const lastSeen = new Map<string, unknown>();
    const offs = keys.map((key) => {
      lastSeen.set(key, read(key));
      return subscribe(key, ({ external }) => {
        const oldValue = lastSeen.get(key);
        const newValue = read(key);
        if (oldValue === newValue) {
          return;
        }
        lastSeen.set(key, newValue);
        const event = { key, oldValue, newValue, external } as CookieChangeEvent<S>;
        listeners.forEach((listener) => listener(event));
      });
    });
    return () => offs.forEach((off) => off());
  }

  return {
    schema,
    // Async like `window.cookieStore`: errors are returned as rejections, never thrown
    get: (key) => attempt(() => read(key) as never),
    set: (key, value, callOptions) => attempt(() => write(key, value, callOptions)),
    delete: (key, callOptions) => attempt(() => write(key, null, callOptions)),
    addEventListener(type, listener) {
      // Runtime guard for untyped (JavaScript) callers
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (type !== 'change') {
        return;
      }
      listeners.add(listener);
      stopListening ??= startListening();
    },
    removeEventListener(type, listener) {
      // Runtime guard for untyped (JavaScript) callers
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (type !== 'change') {
        return;
      }
      listeners.delete(listener);
      // Stop listening to cookie changes when nobody listens anymore
      if (listeners.size === 0) {
        stopListening?.();
        stopListening = undefined;
      }
    },
    fromHeader(input) {
      // Keep only this store's cookies: the record is meant to be passed to the client,
      // and must never carry other (e.g. httpOnly session) cookies
      const all = toCookieRecord(input);
      // A plain object: the record is serialized into client-side props
      const cookies: CookieRecord = {};
      keys.forEach((key) => {
        const raw = rawOf(all, key);
        if (raw !== null) {
          cookies[prefix + key] = raw;
        }
      });
      const snapshotCache = new DecodeCache();
      return {
        cookies,
        get: (key) => snapshotCache.read(key, valueOf(key), rawOf(cookies, key)) as never,
      };
    },
    serialize: (key, value, callOptions = {}) => headerFor(key, value, callOptions),
    [INTERNAL]: {
      read,
      // Server rendering and hydration: the request cookies given to `CookieProvider`
      readServer: (key, cookies) =>
        serverCache.read(key, valueOf(key), cookies ? rawOf(cookies, key) : null),
      subscribe: (key, onChange) => subscribe(key, onChange),
      write: (key, value) => {
        write(key, value);
      },
    },
  };
}
