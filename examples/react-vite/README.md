# parsistent example: React (Vite)

A client-only React app using `parsistent` from npm.

![Two tabs of the example staying in sync](https://raw.githubusercontent.com/iamsomraj/parsistent/main/.github/assets/demo.gif)

```sh
npm install
npm run dev
```

- **`src/stores.ts`**: a `localStorage` store and a cookie store, declared once.
- **`src/App.tsx`**: `useItem` for each value, plus a panel showing what is actually stored.

Try it:

- Click, type and reload: values persist.
- Open the page in two tabs: they stay in sync, including the theme cookie (in browsers
  with the Cookie Store API, such as Chrome and Edge).
- In DevTools, set `localStorage.count` to `"abc"`: the counter falls back to `0`.
