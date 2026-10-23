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
  /** Stores a value. Setting the default removes the key (see `clearOnDefault`) */
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

/** In-memory `Storage`, used when the real one is unavailable (server, blocked storage). */
class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
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

type Area = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type AreaChange = { external: boolean };

// Shared per storage area, so every store on the same area sees same-tab changes
const emitters = new WeakMap<object, Emitter<AreaChange>>();
const memoryAreas = new Map<string, MemoryStorage>();
let warnedUnavailable = false;

function emitterFor(area: Area): Emitter<AreaChange> {
  let emitter = emitters.get(area);
  if (!emitter) {
    emitter = new Emitter();
    emitters.set(area, emitter);
    // Other tabs: the native `storage` event only fires in the tabs that didn't make the change
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.storageArea !== area) {
          return;
        }
        if (event.key === null) {
          emitter?.emitAll({ external: true });
        } else {
          emitter?.emit(event.key, { external: true });
        }
      });
    }
  }
  return emitter;
}

function memoryArea(name: string): MemoryStorage {
  let area = memoryAreas.get(name);
  if (!area) {
    area = new MemoryStorage();
    memoryAreas.set(name, area);
  }
  return area;
}

function resolveArea(source: StorageSource): Area {
  const fallbackName = typeof source === 'string' ? source : 'custom';
  try {
    if (typeof source === 'function') {
      return source();
    }
    if (source === 'local' || source === 'session') {
      if (typeof window === 'undefined') {
        // Server rendering: reads return defaults
        return memoryArea(source);
      }
      const area = source === 'local' ? window.localStorage : window.sessionStorage;
      // Accessing storage can throw when it is blocked (e.g. disabled cookies)
      area.getItem('');
      return area;
    }
    return source;
  } catch (error) {
    if (!warnedUnavailable) {
      warnedUnavailable = true;
      console.warn('[parsistent] Storage is unavailable, using memory instead', error);
    }
    return memoryArea(fallbackName);
  }
}

/**
 * Creates a typed mirror of `localStorage` / `sessionStorage` for the keys of a schema.
 * Values are parsed when read, so a missing or invalid value reads as the default.
 *
 * @param source `'local'`, `'session'`, a `Storage`, or a function returning one
 * @param schema Each key and how its value is stored (see {@link string}, {@link number}…)
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
  const cache = new DecodeCache();
  const listeners = new Set<StorageChangeListener<S>>();
  let stopListening: (() => void) | undefined;
  let resolved: Area | undefined;

  function area(): Area {
    resolved ??= resolveArea(source);
    return resolved;
  }

  function assertKey(key: string): void {
    if (!Object.prototype.hasOwnProperty.call(schema, key)) {
      throw new TypeError(`[parsistent] "${key}" is not a key of this storage`);
    }
  }

  function raw(key: string): string | null {
    return area().getItem(prefix + key);
  }

  function read(key: string): unknown {
    assertKey(key);
    return cache.read(key, schema[key] as NonNullable<S[string]>, raw(key));
  }

  function write(key: string, value: unknown): void {
    assertKey(key);
    const encoded = encode(schema[key] as NonNullable<S[string]>, value, clearOnDefault);
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

  function subscribe(key: string, onChange: (change: AreaChange) => void): () => void {
    assertKey(key);
    return emitterFor(area()).on(prefix + key, onChange);
  }

  // One subscription per key for all `change` listeners: old and new values are computed
  // once per change, then passed to every listener
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
    readServer: (key) => {
      assertKey(key);
      return cache.read(key, schema[key] as NonNullable<S[string]>, null);
    },
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
      if (listeners.size === 0) {
        stopListening?.();
        stopListening = undefined;
      }
    },
    [INTERNAL]: internals,
  };
}
