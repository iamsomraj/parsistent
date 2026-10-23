/**
 * Minimal listener registry, keyed by an arbitrary string (a storage key or cookie name).
 * @internal
 */
export class Emitter<Payload> {
  private readonly listeners = new Map<string, Set<(payload: Payload) => void>>();

  /** Adds a listener for a key. Returns a function that removes it. */
  on(key: string, listener: (payload: Payload) => void): () => void {
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }

  /** Calls the listeners of one key. */
  emit(key: string, payload: Payload): void {
    this.listeners.get(key)?.forEach((listener) => listener(payload));
  }

  /** Calls the listeners of every key, e.g. after the storage was cleared. */
  emitAll(payload: Payload): void {
    this.listeners.forEach((set) => set.forEach((listener) => listener(payload)));
  }
}
