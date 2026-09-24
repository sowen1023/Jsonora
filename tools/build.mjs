#!/usr/bin/env node
/**
 * Builds the unpacked Chrome extension into `dist/`.
 *
 * Three separate Vite passes, because MV3 has three different module rules:
 *   1. extension pages (viewer / popup / options / devtools) — ES modules, code-split
 *   2. content script — a single classic script; MV3 content scripts cannot use `import`
 *   3. service worker — a single classic script
 *
 * Splitting them is what lets the content script inline Preact and its CSS into one file
 * that can be injected into a shadow root without any web-accessible-resource plumbing.
 */
import { build } from 'vite'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const src = path.join(root, 'src')
const dist = path.join(root, 'dist')

const argv = new Set(process.argv.slice(2))
const watch = argv.has('--watch')
const zip = argv.has('--zip')

const pkg = JSON.parse(await fsp.readFile(path.join(root, 'package.json'), 'utf8'))

const shared = {
  configFile: false,
  root: src,
  publicDir: false,
  base: './',
  resolve: { alias: { '@': src } },
  // JSX comes from tsconfig.json (`jsxImportSource: preact`), which the Oxc transform reads.
  logLevel: 'warn',
}

/** Extension pages: real HTML documents, ESM, chunked. */
async function buildPages() {
  await build({
    ...shared,
    build: {
      outDir: dist,
      emptyOutDir: false,
      target: 'chrome120',
      cssCodeSplit: true,
      modulePreload: { polyfill: false },
      reportCompressedSize: false,
      rollupOptions: {
        input: {
          viewer: path.join(src, 'pages/viewer/index.html'),
          popup: path.join(src, 'pages/popup/index.html'),
          options: path.join(src, 'pages/options/index.html'),
          devtools: path.join(src, 'pages/devtools/devtools.html'),
          panel: path.join(src, 'pages/devtools/panel.html'),
        },
      },
    },
  })
}

/** Single-file classic scripts: content script + service worker. */
async function buildScript(entry, fileName) {
  await build({
    ...shared,
    build: {
      outDir: dist,
      emptyOutDir: false,
      target: 'chrome120',
      minify: true,
      reportCompressedSize: false,
      lib: {
        entry: path.join(src, entry),
        formats: ['iife'],
        name: fileName.replace(/[^a-zA-Z0-9]/g, '_'),
        fileName: () => fileName,
      },
      // Lib mode already disables code splitting, so the bundle is a single classic
      // script — which is what MV3 requires for content scripts.
      rollupOptions: { output: { extend: true } },
    },
  })
}

async function copyStatic() {
  const manifest = JSON.parse(await fsp.readFile(path.join(src, 'manifest.json'), 'utf8'))
  manifest.version = pkg.version
  await fsp.writeFile(path.join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  await fsp.copyFile(path.join(root, 'LICENSE'), path.join(dist, 'LICENSE'))
  await writeThirdPartyNotices()
  await fsp.cp(path.join(src, '_locales'), path.join(dist, '_locales'), { recursive: true })

  const iconsSrc = path.join(src, 'icons')
  if (!fs.existsSync(path.join(iconsSrc, 'icon128.png'))) {
    console.log('[build] icons missing — generating them first')
    execFileSync(process.execPath, [path.join(here, 'gen-icons.mjs')], { stdio: 'inherit' })
  }
  await fsp.cp(iconsSrc, path.join(dist, 'icons'), { recursive: true })
}

async function writeThirdPartyNotices() {
  const lock = JSON.parse(await fsp.readFile(path.join(root, 'package-lock.json'), 'utf8'))
  const notices = [
    'Third-party software distributed with Jsonora',
    'These notices are for runtime dependencies in package-lock.json. Jsonora itself is licensed under MIT; see LICENSE.',
  ]
  for (const [key, meta] of Object.entries(lock.packages)) {
    if (!key.startsWith('node_modules/') || meta.dev) continue
    const name = key.slice('node_modules/'.length)
    const dir = path.join(root, key)
    const licenseName = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING']
      .find((filename) => fs.existsSync(path.join(dir, filename)))
    if (!licenseName) throw new Error(`Missing license text for runtime dependency ${name}`)
    const license = (await fsp.readFile(path.join(dir, licenseName), 'utf8')).trim()
    notices.push(`\n${'='.repeat(72)}\n${name}@${meta.version} (${meta.license ?? 'license not specified'})\n${'='.repeat(72)}\n${license}`)
  }
  await fsp.writeFile(path.join(dist, 'THIRD_PARTY_NOTICES.txt'), notices.join('\n') + '\n')
}

async function runAll() {
  await fsp.rm(dist, { recursive: true, force: true })
  await fsp.mkdir(dist, { recursive: true })

  await buildPages()
  await buildScript('content/index.ts', 'content.js')
  await buildScript('background/index.ts', 'background.js')
  await copyStatic()
  await escapeScriptNoncharacters()

  if (zip) {
    const out = path.join(root, `jsonora-${pkg.version}.zip`)
    await fsp.rm(out, { force: true })
    try {
      execFileSync('zip', ['-r', '-X', '-q', out, '.'], { cwd: dist })
      console.log(`[build] packaged → ${path.relative(root, out)}`)
    } catch (error) {
      throw new Error('Could not create the Chrome Web Store ZIP package', { cause: error })
    }
  }

  const files = await walk(dist)
  const bytes = files.reduce((n, f) => n + f.size, 0)
  console.log(
    `[build] ${files.length} files, ${(bytes / 1024).toFixed(1)} kB → ${path.relative(root, dist)}/`,
  )
}

async function walk(dir) {
  const out = []
  for (const e of await fsp.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else out.push({ path: p, size: (await fsp.stat(p)).size })
  }
  return out
}

/**
 * CodeMirror uses U+FFFF as an internal sentinel. It is valid UTF-8, but Chrome's
 * content-script validator rejects Unicode noncharacters and reports them as an
 * encoding error. Keep the runtime character while making the bundle source safe.
 */
async function escapeScriptNoncharacters() {
  for (const file of await walk(dist)) {
    if (!file.path.endsWith('.js')) continue
    const source = new TextDecoder('utf-8', { fatal: true }).decode(await fsp.readFile(file.path))
    const escaped = source.replaceAll('\uFFFE', '\\uFFFE').replaceAll('\uFFFF', '\\uFFFF')
    for (const character of escaped) {
      const codepoint = character.codePointAt(0)
      if ((codepoint >= 0xfdd0 && codepoint <= 0xfdef) || (codepoint & 0xfffe) === 0xfffe) {
        throw new Error(`Unsupported Unicode noncharacter in ${path.relative(dist, file.path)}`)
      }
    }
    if (escaped !== source) await fsp.writeFile(file.path, escaped)
  }
}

await runAll()

if (watch) {
  console.log('[build] watching src/ for changes…')
  let timer = null
  let busy = false
  let queued = false
  const trigger = () => {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      if (busy) {
        queued = true
        return
      }
      busy = true
      try {
        await runAll()
      } catch (err) {
        console.error('[build] failed:', err?.message ?? err)
      } finally {
        busy = false
        if (queued) {
          queued = false
          trigger()
        }
      }
    }, 250)
  }
  fs.watch(src, { recursive: true }, trigger)
}
