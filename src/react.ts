/**
 * parsistent/react - React hooks for typed storage and cookie stores.
 *
 * @example
 * ```tsx
 * const [count, setCount] = useItem(local, 'count')
 * <button onClick={() => setCount((c) => c + 1)}>{count}</button>
 * ```
 *
 * @packageDocumentation
 */

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { INTERNAL, type AnyStore, type CookieRecord } from '@/lib/internal';
import type { inferInput, inferValue, Schema } from '@/types';

// eslint-disable-next-line @typescript-eslint/naming-convention -- React contexts are PascalCase
const CookieContext = createContext<CookieRecord | null>(null);

/** Props of {@link CookieProvider}. */
export type CookieProviderProps = {
  /**
   * Request cookies, from `cookieStore.fromHeader(...).cookies`. Only pass that
   * filtered record: it ends up in client-side props.
   */
  cookies: CookieRecord;
  children?: ReactNode;
};

/**
 * Provides request cookies to `useItem` for server rendering and hydration, so the
 * first render already shows the cookie values instead of the defaults.
 *
 * @example
 * ```tsx
 * // app/layout.tsx (Next.js)
 * import { cookies } from 'next/headers'
 *
 * const { cookies: appCookieValues } = appCookies.fromHeader(await cookies())
 * return <CookieProvider cookies={appCookieValues}>{children}</CookieProvider>
 * ```
 */
// eslint-disable-next-line @typescript-eslint/naming-convention -- React components are PascalCase
export function CookieProvider({ cookies, children }: CookieProviderProps): ReactNode {
  return createElement(CookieContext.Provider, { value: cookies }, children);
}

/** New value for {@link useItem}'s setter: a value, an updater, or `null` to remove the key. */
export type SetItemAction<Value, Input> = Input | null | ((current: Value) => Input | null);

/**
 * Reads a key of a typed storage or cookie store, like `useState`.
 *
 * - Re-renders when the key changes: in this tab, in other tabs, or from other code.
 * - The setter accepts a value, an updater function, or `null` to remove the key.
 * - Server rendering and hydration use the default value (or the cookies given to
 *   {@link CookieProvider}), so hydration never mismatches.
 *
 * @example
 * ```tsx
 * const local = createStorage('local', { count: number(0) })
 *
 * function Counter() {
 *   const [count, setCount] = useItem(local, 'count')
 *   return <button onClick={() => setCount((c) => c + 1)}>{count}</button>
 * }
 * ```
 */
export function useItem<S extends Schema, K extends keyof S & string>(
  store: AnyStore<S>,
  key: K
): [
  value: inferValue<S[K]>,
  setValue: (action: SetItemAction<inferValue<S[K]>, inferInput<S[K]>>) => void,
] {
  const internals = store[INTERNAL];
  const cookies = useContext(CookieContext);

  const subscribe = useCallback(
    (onChange: () => void) => internals.subscribe(key, onChange),
    [internals, key]
  );
  const value = useSyncExternalStore(
    subscribe,
    () => internals.read(key),
    () => internals.readServer(key, cookies)
  ) as inferValue<S[K]>;

  const setValue = useCallback(
    (action: SetItemAction<inferValue<S[K]>, inferInput<S[K]>>) => {
      const next =
        typeof action === 'function'
          ? (action as (current: inferValue<S[K]>) => unknown)(
              internals.read(key) as inferValue<S[K]>
            )
          : action;
      void internals.write(key, next);
    },
    [internals, key]
  );

  return [value, setValue];
}
