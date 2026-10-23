import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    // A real origin, so `document.cookie` works
    environmentOptions: { happyDOM: { url: 'http://localhost:3000/' } },
    include: ['tests/**/*.test.{ts,tsx}'],
    globals: true,
    typecheck: {
      include: ['tests/**/*.test-d.ts'],
      tsconfig: './tsconfig.json',
    },
  },
});
