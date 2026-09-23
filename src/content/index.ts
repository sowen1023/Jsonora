/**
 * Content script entry point.
 *
 * Runs in every frame's page context and does exactly two things:
 *   1. if the document itself is a JSON response, hand the page over to the viewer
 *   2. otherwise, if the page merely contains JSON code samples, offer a button
 *
 * A page that is a JSON response gets a "guard" stylesheet installed at document_start so
 * the browser's own rendering never flashes before the viewer takes over. The guard is
 * always removed within a few seconds, whatever happens next.
 */
import { loadSettings, subscribeSettings, type Settings } from '@/platform/settings'
import type { ProbeResult } from '@/platform/env'
import {
  detectJsonDocument,
  findJsonBlocks,
  isJsonContentType,
  type JsonBlock,
  type JsonDocument,
} from './detect'
import { mountInline, mountOverlay, showPill } from './mount'
import type { InlineHandle, OverlayHandle, PillHandle } from './mount'

let settings: Settings | null = null
let detected: JsonDocument | null = null
let overlay: OverlayHandle | null = null
let pill: PillHandle | null = null
let inlines: InlineHandle[] = []
let blocks: JsonBlock[] = []
let removeGuard: (() => void) | null = null
let scanning = false

/* -------------------------------------------------------------- utilities -- */

function domReady(): Promise<void> {
  if (document.readyState !== 'loading') return Promise.resolve()
  return new Promise((resolve) => {
    document.addEventListener('DOMContentLoaded', () => resolve(), { once: true })
  })
}

function afterLoad(): Promise<void> {
  if (document.readyState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    window.addEventListener('load', () => resolve(), { once: true })
  })
}

function idle(): Promise<void> {
  return new Promise((resolve) => {
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: object) => number })
      .requestIdleCallback
    if (ric) ric(() => resolve(), { timeout: 1200 })
    else window.setTimeout(resolve, 200)
  })
}

/**
 * Hides the browser's own rendering of a JSON response. Injected at document_start and
 * self-destructing, so a failure anywhere downstream cannot leave the page blank.
 */
function installGuard(): () => void {
  const style = document.createElement('style')
  style.id = 'jsonora-guard'
  style.textContent =
    'html{background:#111318 !important;}body{visibility:hidden !important;}'

  const attach = () => {
    if (document.head) document.head.appendChild(style)
    else document.documentElement?.appendChild(style)
  }
  attach()

  let removed = false
  const remove = () => {
    if (removed) return
    removed = true
    style.remove()
  }
  window.setTimeout(remove, 5_000)
  return remove
}

/* ------------------------------------------------------------------ mount -- */

function mountDocument(doc: JsonDocument): void {
  if (overlay) return
  overlay = mountOverlay({
    text: doc.text,
    source: doc.source,
    onDestroy: () => {
      overlay = null
    },
  })
  removeGuard?.()
  removeGuard = null
}

function renderBlocks(list: JsonBlock[]): void {
  destroyInlines()
  blocks = list
  for (const block of list) {
    inlines.push(mountInline(block.el, block.text))
  }
}

function destroyInlines(): void {
  for (const inline of inlines) inline.destroy()
  inlines = []
}

function destroyAll(): void {
  overlay?.destroy()
  overlay = null
  pill?.destroy()
  pill = null
  destroyInlines()
}

/* -------------------------------------------------------------- detection -- */

async function scanBlocks(): Promise<void> {
  if (scanning || overlay || inlines.length) return
  scanning = true
  try {
    await afterLoad()
    await idle()
    if (overlay) return
    blocks = findJsonBlocks()
    if (!blocks.length) return
    pill?.destroy()
    pill = showPill(
      blocks.length,
      () => {
        pill = null
        renderBlocks(blocks)
      },
      settings ?? undefined,
    )
  } finally {
    scanning = false
  }
}

function probe(): ProbeResult {
  return {
    isJson: !!detected,
    mounted: !!overlay,
    blocks: blocks.length,
    source: location.href,
    bytes: detected?.bytes ?? 0,
  }
}

async function handleRender(): Promise<ProbeResult> {
  if (overlay) return probe()

  if (!detected) {
    await domReady()
    detected = detectJsonDocument()
  }
  if (detected) {
    mountDocument(detected)
    pill?.destroy()
    pill = null
    return probe()
  }

  const found = findJsonBlocks()
  if (found.length) renderBlocks(found)
  return probe()
}

/* ------------------------------------------------------------------- boot -- */

async function boot(): Promise<void> {
  if (isJsonContentType()) removeGuard = installGuard()

  settings = await loadSettings()

  if (isJsonContentType()) {
    await domReady()
    detected = detectJsonDocument()
  }

  if (detected && settings.autoRender) {
    mountDocument(detected)
    return
  }

  removeGuard?.()
  removeGuard = null

  if (settings.inlineBlocks) void scanBlocks()
}

/* --------------------------------------------------------------- messages -- */

chrome.runtime?.onMessage?.addListener(
  (
    message: { type?: string } | undefined,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ProbeResult) => void,
  ) => {
    switch (message?.type) {
      case 'jsonora:probe':
        sendResponse(probe())
        return false
      case 'jsonora:render':
        void handleRender().then(sendResponse)
        return true
      case 'jsonora:restore':
        destroyAll()
        sendResponse(probe())
        return false
      default:
        return false
    }
  },
)

subscribeSettings((next) => {
  const previous = settings
  settings = next

  if (previous?.autoRender && !next.autoRender) {
    overlay?.destroy()
    overlay = null
  }
  if (previous?.inlineBlocks && !next.inlineBlocks) {
    pill?.destroy()
    pill = null
  }
  if (previous && !previous.inlineBlocks && next.inlineBlocks) {
    void scanBlocks()
  }
})

void boot().catch(() => {
  // Never leave the page hidden because of our own failure.
  removeGuard?.()
})
