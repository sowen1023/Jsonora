import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

const src = fileURLToPath(new URL('./src', import.meta.url))

/**
 * Vitest runs against the repo root (unlike the extension builds, which use `src` as the
 * Vite root), so the core modules can be imported through the `@` alias in isolation.
 */
export default defineConfig({
  resolve: { alias: { '@': src } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
