#!/usr/bin/env node
/**
 * Minimal CDP driver used to verify the built extension in a real Chrome.
 *
 *   node tools/cdp-shot.mjs <url> <out.png> [--wait ms] [--width w] [--height h] [--scale n] [--port p] [--script file]
 *
 * `--script` evaluates a JS file in the page after load, which is how the tests drive
 * clicks and read back state. Uses Node's built-in WebSocket — no dependencies.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')

const argv = process.argv.slice(2)
const url = argv[0]
const out = argv[1]
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : fallback
}

const waitMs = Number(flag('wait', 2500))
const width = Number(flag('width', 1280))
const height = Number(flag('height', 860))
const scale = Number(flag('scale', 2))
const port = Number(flag('port', 9335))
const scriptFile = flag('script', null)
const profile = flag('profile', '/tmp/jsonora-cdp-profile')
const loadExtension = argv.includes('--extension')

if (!url || !out) {
  console.error('usage: node tools/cdp-shot.mjs <url> <out.png> [--wait ms] [--script file]')
  process.exit(1)
}

const args = [
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-features=Translate,MediaRouter',
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${port}`,
  `--window-size=${width},${height}`,
  '--window-position=0,0',
]
if (loadExtension) {
  args.push(`--load-extension=${path.join(root, 'dist')}`)
  args.push(`--disable-extensions-except=${path.join(root, 'dist')}`)
}
args.push('about:blank')

const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] })
let chromeErr = ''
chrome.stderr.on('data', (chunk) => (chromeErr += chunk))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function findPageTarget() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`)
      const targets = await res.json()
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) return page
    } catch {
      /* not up yet */
    }
    await sleep(250)
  }
  throw new Error('no page target; chrome stderr:\n' + chromeErr.slice(-2000))
}

let seq = 0
function makeClient(ws) {
  const pending = new Map()
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    const entry = pending.get(msg.id)
    if (!entry) return
    pending.delete(msg.id)
    if (msg.error) entry.reject(new Error(`${entry.method}: ${msg.error.message}`))
    else entry.resolve(msg.result)
  })
  return (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq
      pending.set(id, { resolve, reject, method })
      ws.send(JSON.stringify({ id, method, params }))
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id)
          reject(new Error(`${method} timed out`))
        }
      }, 20_000)
    })
}

async function main() {
  const target = await findPageTarget()
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })
  const send = makeClient(ws)

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: scale,
    mobile: false,
  })
  const navigation = await send('Page.navigate', { url })
  if (navigation.errorText) throw new Error(`Page navigation failed: ${navigation.errorText}`)
  await sleep(waitMs)

  const logs = []
  if (scriptFile) {
    const source = await fs.readFile(scriptFile, 'utf8')
    const result = await send('Runtime.evaluate', {
      expression: source,
      awaitPromise: true,
      returnByValue: true,
    })
    if (result.exceptionDetails) {
      console.error('script error:', JSON.stringify(result.exceptionDetails, null, 2))
    } else {
      logs.push(result.result?.value)
    }
    await sleep(600)
  }

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  await fs.writeFile(out, Buffer.from(shot.data, 'base64'))
  console.log(`saved ${out}`)
  if (logs.length) console.log('script result:', JSON.stringify(logs[0], null, 2))

  ws.close()
}

try {
  await main()
} finally {
  chrome.kill('SIGTERM')
  await sleep(400)
  try {
    chrome.kill('SIGKILL')
  } catch {
    /* already gone */
  }
}
