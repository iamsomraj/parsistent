# Changelog

## v0.0.1

First release: typed `localStorage`, `sessionStorage` and cookies, shaped like the browser APIs, with a React hook. The API may still change before 1.0.

### 🚀 Enhancements

- `createStorage`: typed mirror of `localStorage` / `sessionStorage` (`getItem`, `setItem`, `removeItem`, `clear`, `key`, `length`) with `change` events for this tab and other tabs, defaults for missing or invalid values, `clearOnDefault` and `prefix` options ([5168f28](https://github.com/iamsomraj/parsistent/commit/5168f28))
- `createCookieStore`: typed mirror of the async Cookie Store API (`get`, `set`, `delete`, `change` events) in every browser, with `fromHeader()` and `serialize()` for the server ([5168f28](https://github.com/iamsomraj/parsistent/commit/5168f28))
- Value helpers `string`, `oneOf`, `number`, `boolean`, `date` and `json` (function or Standard Schema validator); any `{ parse, serialize }` object works, including nuqs parsers ([5168f28](https://github.com/iamsomraj/parsistent/commit/5168f28))
- `parsistent/react`: `useItem(store, key)` works like `useState` and is safe for server rendering; `CookieProvider` renders request cookies ([5168f28](https://github.com/iamsomraj/parsistent/commit/5168f28))

### 🩹 Fixes

- Server rendering never shares storage values between requests; hydration keeps value references stable; `cookies.get()` rejects instead of throwing; `date()` rejects impossible calendar dates ([c90076b](https://github.com/iamsomraj/parsistent/commit/c90076b))

### ❤️ Contributors

- Somraj Mukherjee ([@iamsomraj](https://github.com/iamsomraj))
