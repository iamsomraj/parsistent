import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Uses the library source, so the example always matches the working tree
const src = (path: string) => fileURLToPath(new URL(`../../src/${path}`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: 'parsistent/react', replacement: src('react.ts') },
      { find: 'parsistent', replacement: src('index.ts') },
      { find: /^@\//, replacement: `${src('')}` },
    ],
  },
});
