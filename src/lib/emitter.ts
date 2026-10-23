/**
 * Minimal typed listener set, keyed by an arbitrary string.
 * @internal
 */
export class Emitter<Payload> {
  private readonly listeners = new Map<string, Set<(payload: Payload) => void>>();

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

  emit(key: string, payload: Payload): void {
    this.listeners.get(key)?.forEach((listener) => listener(payload));
  }

  emitAll(payload: Payload): void {
    this.listeners.forEach((set) => set.forEach((listener) => listener(payload)));
  }
}
