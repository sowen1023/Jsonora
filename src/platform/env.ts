/**
 * Runtime environment probes. The same UI code runs in four places — extension pages, a
 * shadow root inside an arbitrary web page, the devtools panel, and a plain browser tab
 * during `npm run dev` — so every platform capability is probed rather than assumed.
 */

export const hasChrome = typeof chrome !== 'undefined' && !!chrome?.runtime?.id

export const isExtensionPage = hasChrome && location.protocol === 'chrome-extension:'

/* ------------------------------------------------------------- messaging -- */

export interface ProbeResult {
  isJson: boolean
  mounted: boolean
  blocks: number
  source: string
  bytes: number
}

export type ContentMessage =
  | { type: 'jsonora:probe' }
  | { type: 'jsonora:render'; text?: string; source?: string }
  | { type: 'jsonora:restore' }
  | { type: 'jsonora:settings'; autoRender?: boolean }

export async function sendToTab(tabId: number, message: ContentMessage): Promise<ProbeResult | null> {
  if (!hasChrome) return null
  try {
    return (await chrome.tabs.sendMessage(tabId, message)) ?? null
  } catch {
    // No content script in that tab (chrome:// pages, the web store, a PDF viewer…).
    return null
  }
}

export async function activeTab(): Promise<chrome.tabs.Tab | null> {
  if (!hasChrome || !chrome.tabs?.query) return null
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab ?? null
}

export async function openViewer(query: Record<string, string> = {}): Promise<void> {
  if (!hasChrome) return
  const url = chrome.runtime.getURL('pages/viewer/index.html') + toQuery(query)
  await chrome.tabs.create({ url })
}

export async function openOptions(): Promise<void> {
  if (hasChrome) {
    await chrome.runtime.openOptionsPage()
    return
  }
  // Keep plain Vite previews useful. The embedded viewer has its own settings sheet;
  // popup/options development still needs a real navigation target without Chrome APIs.
  window.open(new URL('/pages/options/index.html', location.origin).href, '_blank', 'noopener')
}

export function toQuery(params: Record<string, string>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  if (!entries.length) return ''
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
}

/* ------------------------------------------------------------- clipboard -- */

export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsText(file)
  })
}
