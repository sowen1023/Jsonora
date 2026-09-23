import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

const src = fileURLToPath(new URL('./src', import.meta.url))
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

/**
 * Dev-only config. `npm run dev` serves the standalone viewer so the whole UI can be
 * iterated on in a normal browser tab — `src/platform/env.ts` falls back to
 * localStorage when the `chrome.*` APIs are unavailable.
 *
 * The real extension bundle is produced by `tools/build.mjs`.
 */
export default defineConfig({
  root: src,
  publicDir: false,
  base: './',
  resolve: {
    alias: { '@': src },
  },
  // JSX is configured in tsconfig.json (`jsx: react-jsx`, `jsxImportSource: preact`);
  // Vite 8's Oxc transform picks those up, so no extra transform options are needed here.
  server: {
    port: 5188,
    open: '/pages/viewer/index.html',
  },
  build: {
    outDir: r('./dist-dev'),
    emptyOutDir: true,
    target: 'chrome120',
  },
})
