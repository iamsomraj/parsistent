# parsistent docs

The documentation site, built with [Next.js](https://nextjs.org) and
[Nextra](https://nextra.site), and deployed to GitHub Pages when a release is published.

```sh
# From the repository root
bun run docs:dev     # build the library, then start the site in development
bun run docs:build   # build the library, then export the static site to docs/out
```

- **Pages** are MDX files in `content/`; `content/_meta.ts` sets their order.
- **Live demos** (`components/demos.tsx`) use parsistent itself.
- **The API reference** (`content/api.mdx`) is generated from the published type declarations
  with `nextra/tsdoc`.
- **parsistent** is installed from the repository root as a packaged copy (`file:..` with
  `install-links`), exactly as from npm. A symlink would load a second copy of React.

## Workarounds

Remove these once Nextra supports them:

- **`overrides.zod` is pinned to `4.1.12`** in `package.json`. With later Zod 4 releases,
  `nextra-theme-docs` 4.6's `Layout` fails validation (`expected nonoptional … at children`).
- **`turbopack.resolveAlias['next-mdx-import-source-file']`** in `next.config.mjs`: Nextra 4.6
  points it at a module Next.js 16 no longer ships.
