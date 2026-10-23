import { defineConfig } from 'tsup';

const shared = {
  format: ['esm', 'cjs'],
  dts: {
    // tsup injects `baseUrl` into the declaration build, which TypeScript 6 deprecates
    compilerOptions: { ignoreDeprecations: '6.0' },
  },
  // `dist` is cleaned by the build script: both configs build in parallel
  clean: false,
  external: ['react'],
} as const;

export default defineConfig([
  { ...shared, entry: { index: 'src/index.ts' } },
  // Hooks and providers are client-only in React Server Components
  { ...shared, entry: { react: 'src/react.ts' }, banner: { js: "'use client';" } },
]);
