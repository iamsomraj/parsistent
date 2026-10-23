import { DecodeCache, encode } from '@/lib/codec';
import { Emitter } from '@/lib/emitter';
import { INTERNAL, type StoreInternals } from '@/lib/internal';
import type { inferInput, inferValue, Schema } from '@/types';

/**
 * Where a {@link TypedStorage} reads and writes: `'local'` (`localStorage`),
 * `'session'` (`sessionStorage`), any `Storage` object, or a function returning one.
 *
 * Prefer `'local'` / `'session'` in server-rendered apps: they resolve lazily, so
 * creating the store at module level doesn't throw on the server.
 */
export type StorageSource = 'local' | 'session' | Storage | (() => Storage);

/** Options for {@link createStorage}. */
export type CreateStorageOptions = {
  /** Remove the key when a value equal to its default is set (default: `true`) */
  clearOnDefault?: boolean;
  /** Prefix added to every key in storage, e.g. `'my-app:'` */
  prefix?: string;
};

/** Event passed to `change` listeners, with parsed values. */
export type StorageChangeEvent<S extends Schema> = {
  [K in keyof S & string]: {
    /** The key that changed */
    readonly key: K;
    /** The value before the change */
    readonly oldValue: inferValue<S[K]>;
    /** The value after the change */
    readonly newValue: inferValue<S[K]>;
    /** `true` when the change was made in another tab or window */
    readonly external: boolean;
  };
}[keyof S & string];

/** Listener for {@link TypedStorage} `change` events. */
export type StorageChangeListener<S extends Schema> = (event: StorageChangeEvent<S>) => void;

/**
 * A typed mirror of the Web Storage API (`localStorage` / `sessionStorage`),
 * limited to the keys of its schema.
 */
export type TypedStorage<S extends Schema> = {
  /** The schema the store was created with */
  readonly schema: S;
  /** Number of schema keys currently set */
  readonly length: number;
  /** Returns the value of a key, or its default when missing or invalid */
  getItem<K extends keyof S & string>(key: K): inferValue<S[K]>;
  /**
   * Stores a value. Setting the default removes the key (see `clearOnDefault`).
   * Like `localStorage.setItem`, throws when the storage is full.
   */
  setItem<K extends keyof S & string>(key: K, value: inferInput<S[K]>): void;
  /** Removes a key, so it reads as its default */
  removeItem<K extends keyof S & string>(key: K): void;
  /** Removes every schema key. Other keys in the storage are left untouched */
  clear(): void;
  /** Returns the name of the n-th schema key currently set, or `null` */
  key(index: number): (keyof S & string) | null;
  /** Listens to changes made in this tab and in other tabs */
  addEventListener(type: 'change', listener: StorageChangeListener<S>): void;
  /** Removes a listener added with `addEventListener` */
  removeEventListener(type: 'change', listener: StorageChangeListener<S>): void;
  /** @internal */
  readonly [INTERNAL]: StoreInternals;
};

/** The subset of `Storage` that stores rely on. */
type Area = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Payload of the internal change notifications. */
type AreaChange = { external: boolean };

/** In-memory storage, used in the browser when the real storage is blocked. */
class MemoryArea implements Area {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

/**
 * Storage used on the server: always empty, and writes are ignored, because a server
 * process is shared by every request and must never keep one user's values.
 */
const serverArea: Area = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

// Notifications are shared per storage area, so every store on the same area
// (e.g. two stores on `localStorage` with different prefixes) sees same-tab changes
const emitters = new WeakMap<Area, Emitter<AreaChange>>();
// One memory fallback per blocked built-in area, shared like the real one would be
const memoryAreas = new Map<'local' | 'session', MemoryArea>();
let warnedUnavailable = false;

/**
 * Returns the emitter of a storage area, creating it on first use. Creating it also
 * starts listening to the native `storage` event, which reports changes made in other
 * tabs (it never fires in the tab that made the change).
 */
function emitterFor(area: Area): Emitter<AreaChange> {
  const existing = emitters.get(area);
  if (existing) {
    return existing;
  }
  const emitter = new Emitter<AreaChange>();
  emitters.set(area, emitter);
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.storageArea !== area) {
        return;
      }
      // `key` is `null` when the other tab called `clear()`
      if (event.key === null) {
        emitter.emitAll({ external: true });
      } else {
        emitter.emit(event.key, { external: true });
      }
    });
  }
  return emitter;
}

/** Returns the shared memory fallback of a built-in area. */
function memoryAreaFor(name: 'local' | 'session'): MemoryArea {
  let area = memoryAreas.get(name);
  if (!area) {
    area = new MemoryArea();
    memoryAreas.set(name, area);
  }
  return area;
}

/** Warns once that storage is blocked and memory is used instead. */
function warnUnavailable(error: unknown): void {
  if (!warnedUnavailable) {
    warnedUnavailable = true;
    console.warn('[parsistent] Storage is unavailable, using memory instead', error);
  }
}

/**
 * Resolves a {@link StorageSource} to the area to use:
 * - on the server, the read-only {@link serverArea};
 * - the real storage when it is accessible;
 * - otherwise (blocked storage), an in-memory fallback.
 */
function resolveArea(source: StorageSource): Area {
  if (source === 'local' || source === 'session') {
    if (typeof window === 'undefined') {
      return serverArea;
    }
    try {
      const area = source === 'local' ? window.localStorage : window.sessionStorage;
      // Accessing storage throws when it is blocked (e.g. site data disabled)
      area.getItem('');
      return area;
    } catch (error) {
      warnUnavailable(error);
      return memoryAreaFor(source);
    }
  }
  try {
    return typeof source === 'function' ? source() : source;
  } catch (error) {
    warnUnavailable(error);
    // Custom sources get their own fallback, so unrelated stores never share values
    return new MemoryArea();
  }
}

/**
 * Creates a typed mirror of `localStorage` / `sessionStorage` for the keys of a schema.
 * Values are parsed when read, so a missing or invalid value reads as the default.
 *
 * On the server, reads return defaults and writes are ignored.
 *
 * @param source `'local'`, `'session'`, a `Storage`, or a function returning one
 * @param schema Each key and how its value is stored (see {@link string}, {@link number}…)
 * @param options `clearOnDefault` and `prefix`
 *
 * @example
 * ```ts
 * const local = createStorage('local', {
 *   theme: oneOf(['light', 'dark'], 'light'),
 *   count: number(0),
 * })
 *
 * local.getItem('count')    // 0
 * local.setItem('count', 3) // localStorage.count === '3'
 * local.addEventListener('change', (event) => console.log(event.key, event.newValue))
 * ```
 */
export function createStorage<S extends Schema>(
  source: StorageSource,
  schema: S,
  options: CreateStorageOptions = {}
): TypedStorage<S> {
  const { clearOnDefault = true, prefix = '' } = options;
  const keys = Object.keys(schema);
  // Client reads and server reads (hydration) are cached apart, so they never evict
  // each other and values keep a stable reference
  const cache = new DecodeCache();
  const serverCache = new DecodeCache();
  const listeners = new Set<StorageChangeListener<S>>();
  let stopListening: (() => void) | undefined;
  let resolved: Area | undefined;

  /** The storage area, resolved on first use (never at import time). */
  function area(): Area {
    resolved ??= resolveArea(source);
    return resolved;
  }

  /** Returns the value definition of a key, throwing for keys outside the schema. */
  function valueOf(key: string): NonNullable<S[string]> {
    if (!Object.prototype.hasOwnProperty.call(schema, key)) {
      throw new TypeError(`[parsistent] "${key}" is not a key of this storage`);
    }
    return schema[key] as NonNullable<S[string]>;
  }

  /** Returns the raw stored string of a key. */
  function raw(key: string): string | null {
    return area().getItem(prefix + key);
  }

  /** Returns the decoded value of a key (cached while the stored string is unchanged). */
  function read(key: string): unknown {
    return cache.read(key, valueOf(key), raw(key));
  }

  /** Encodes and stores a value (`null` removes the key), then notifies subscribers. */
  function write(key: string, value: unknown): void {
    const encoded = encode(valueOf(key), value, clearOnDefault);
    if (encoded === raw(key)) {
      return;
    }
    if (encoded === null) {
      area().removeItem(prefix + key);
    } else {
      area().setItem(prefix + key, encoded);
    }
    emitterFor(area()).emit(prefix + key, { external: false });
  }

  /** Calls `onChange` when a key changes, in this tab or another one. */
  function subscribe(key: string, onChange: (change: AreaChange) => void): () => void {
    valueOf(key);
    return emitterFor(area()).on(prefix + key, onChange);
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
        const event = { key, oldValue, newValue, external } as StorageChangeEvent<S>;
        listeners.forEach((listener) => listener(event));
      });
    });
    return () => offs.forEach((off) => off());
  }

  const internals: StoreInternals = {
    read,
    // Storage is not sent with requests: server rendering and hydration use defaults
    readServer: (key) => serverCache.read(key, valueOf(key), null),
    subscribe: (key, onChange) => subscribe(key, onChange),
    write,
  };

  return {
    schema,
    get length() {
      return keys.filter((key) => raw(key) !== null).length;
    },
    getItem: (key) => read(key) as never,
    setItem: (key, value) => write(key, value),
    removeItem: (key) => write(key, null),
    clear() {
      keys.forEach((key) => write(key, null));
    },
    key(index) {
      return keys.filter((key) => raw(key) !== null)[index] ?? null;
    },
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
      // Stop listening to storage when nobody listens anymore
      if (listeners.size === 0) {
        stopListening?.();
        stopListening = undefined;
      }
    },
    [INTERNAL]: internals,
  };
}
