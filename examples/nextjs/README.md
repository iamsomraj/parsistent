# parsistent example: Next.js (App Router)

Server rendering with `parsistent` from npm.

![The theme cookie is server-rendered, so reloading never flashes](https://raw.githubusercontent.com/iamsomraj/parsistent/main/.github/assets/demo-nextjs.gif)

```sh
npm install
npm run dev
```

| File                     | Shows                                                                  |
| ------------------------ | ---------------------------------------------------------------------- |
| `app/stores.ts`          | A cookie store and a `localStorage` store, shared by server and client |
| `app/layout.tsx`         | `fromHeader(await cookies())` + `CookieProvider`: no theme flash       |
| `app/theme-root.tsx`     | `useItem` with a cookie store, server-rendered                         |
| `app/page.tsx`           | Reading a typed cookie in a server component                           |
| `app/theme-controls.tsx` | Setting the cookie in the browser, or through the route handler        |
| `app/api/theme/route.ts` | `fromHeader(request)` and `serialize()` in a route handler             |
| `app/visits.tsx`         | `useItem` with `localStorage`: default on the server, then stored      |

Try it:

- Toggle the theme and reload: the page renders dark from the first byte.
- Toggle on the server: the route handler sets the cookie, and the page updates.
- Reload a few times: the visit counter, kept in `localStorage`, goes up.
