/**
 * Hands a payload between contexts that cannot share memory — a content script on some
 * API endpoint → the full-page viewer in a new tab, or the devtools panel → the viewer.
 * `chrome.storage.local` is the only bus all of those can reach, so a short-lived key
 * plus `?src=pending` on the viewer URL is the whole protocol.
 */
import { hasChrome } from './env'

const KEY = 'jsonora.pending'
const LOCAL_KEY = 'jsonora.pending'
export interface PendingPayload {
  text: string
  source?: string
  ts: number
}

export async function putPending(payload: { text: string; source?: string }): Promise<boolean> {
  const value: PendingPayload = { ...payload, ts: Date.now() }

  if (hasChrome) {
    try {
      await chrome.storage.local.set({ [KEY]: value })
      return true
    } catch {
      return false
    }
  }

  try {
    sessionStorage.setItem(LOCAL_KEY, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export async function takePending(): Promise<PendingPayload | null> {
  if (hasChrome) {
    try {
      const got = await chrome.storage.local.get(KEY)
      const value = got?.[KEY] as PendingPayload | undefined
      if (!value) return null
      await chrome.storage.local.remove(KEY)
      return value
    } catch {
      return null
    }
  }

  try {
    const raw = sessionStorage.getItem(LOCAL_KEY)
    if (!raw) return null
    sessionStorage.removeItem(LOCAL_KEY)
    return JSON.parse(raw) as PendingPayload
  } catch {
    return null
  }
}
