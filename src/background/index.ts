/**
 * Service worker. Deliberately thin: it only owns the context-menu entry and seeds
 * defaults on install. Everything else happens in the content script or the pages, so the
 * worker can be evicted at any moment without losing state.
 */
import { putPending } from '@/platform/handoff'
import { DEFAULT_SETTINGS } from '@/platform/settings'

const MENU_ID = 'jsonora-view-selection'
const VIEWER = 'pages/viewer/index.html'

async function ensureDefaults(): Promise<void> {
  try {
    const got = await chrome.storage.sync.get('settings')
    if (!got?.settings) await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS })
  } catch {
    /* sync may be unavailable; the viewer falls back to defaults */
  }
}

function ensureMenu(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: '用 Jsonora 查看选中的 JSON',
      contexts: ['selection'],
    })
  })
}

async function openViewerWith(text: string, source: string): Promise<void> {
  const stored = await putPending({ text, source })
  if (!stored) return
  await chrome.tabs.create({ url: chrome.runtime.getURL(VIEWER) + '?src=pending' })
}

chrome.runtime.onInstalled.addListener((details) => {
  void ensureDefaults()
  ensureMenu()
  if (details.reason === 'install') {
    void chrome.tabs.create({ url: chrome.runtime.getURL(VIEWER) })
  }
})

chrome.runtime.onStartup?.addListener(() => {
  ensureMenu()
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return
  const selected = info.selectionText ?? ''
  if (!selected.trim()) return
  void openViewerWith(selected, tab?.url ?? '选中内容')
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'jsonora:open-viewer' && typeof message.text === 'string') {
    void openViewerWith(message.text, message.source ?? '页面内容').then(() =>
      sendResponse({ ok: true }),
    )
    return true
  }
  return false
})
