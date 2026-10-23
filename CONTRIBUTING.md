# Contributing to parsistent

Thanks for your interest in contributing! parsistent mirrors the browser storage APIs
([Web Storage](https://developer.mozilla.org/docs/Web/API/Web_Storage_API) and
[Cookie Store](https://developer.mozilla.org/docs/Web/API/Cookie_Store_API)): when proposing
a feature or behaviour change, check how the native API behaves first.

Please read and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Where to start

- Issues labelled [`good first issue`](https://github.com/iamsomraj/parsistent/labels/good%20first%20issue)
  are scoped for newcomers; [`help wanted`](https://github.com/iamsomraj/parsistent/labels/help%20wanted)
  issues are larger pieces of work where help is welcome.
- Comment on an issue before starting, so work isn't duplicated.

## Development

Requires Node 22.12+ and [Bun](https://bun.sh) 1.4+.

```sh
bun install
bun run test:watch   # tests in watch mode
```

Before opening a pull request, run:

```sh
bun run lint && bun run typecheck && bun run test && bun run build && bun run format
```

| Script               | Description                               |
| -------------------- | ----------------------------------------- |
| `bun run test`       | Unit, React and type-level tests (Vitest) |
| `bun run typecheck`  | TypeScript check                          |
| `bun run lint`       | ESLint                                    |
| `bun run format:fix` | Prettier                                  |
| `bun run build`      | Build `dist/` with tsup                   |

## Workflow

1. Open (or pick) an issue.
2. Create a branch named `<issue-number>-<short-slug>`, e.g. `42-fix-cookie-expiry`.
3. Make **one commit** using [Conventional Commits](https://www.conventionalcommits.org)
   (`feat:`, `fix:`, `docs:`, `chore:`, `test:`…, with `!` for breaking changes) and
   reference the issue (`Closes #42`). Amend and force-push instead of adding commits.
4. Open a pull request. It is squash-merged once CI passes.

## Release process (maintainers)

1. Open a `chore(release): vX.Y.Z` pull request that bumps `package.json` and adds a
   `CHANGELOG.md` section, then merge it.
2. Tag and create the GitHub release:
   ```sh
   git tag -a vX.Y.Z -m vX.Y.Z && git push origin vX.Y.Z
   gh release create vX.Y.Z --notes-file <notes>
   ```
3. Publish (`prepublishOnly` runs every check): `npm publish --otp=<code>`

## Reporting issues

- Bugs: include a minimal reproduction (StackBlitz or a repository).
- Security issues: see [SECURITY.md](SECURITY.md).
