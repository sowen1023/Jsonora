/**
 * Deciding whether a page *is* JSON, and whether it merely *contains* some.
 *
 * Two different jobs with two different confidence levels:
 *
 *  - `detectJsonDocument` answers "should we take over this whole page?". It is
 *    deliberately conservative — the content type is trusted outright, everything else has
 *    to prove itself by parsing — because a false positive hides a page the user wanted.
 *  - `findJsonBlocks` answers "are there code samples worth offering to render?", which is
 *    a hint the user opts into, so a cheap heuristic is the right cost/benefit.
 */
import { parseJson } from '@/core/parse'

const JSON_CONTENT_TYPE = /^(application|text)\/(json|[\w.+-]*\+json)$/i

export interface JsonDocument {
  text: string
  source: string
  bytes: number
  /** Where the text came from, for the status bar. */
  origin: 'content-type' | 'pre'
}

export function isJsonContentType(): boolean {
  return JSON_CONTENT_TYPE.test(document.contentType || '')
}

export function byteLength(text: string): number {
  return new Blob([text]).size
}

/** The `<pre>` most likely to hold the payload — Chrome's own JSON viewer keeps one around. */
function bestPre(): HTMLPreElement | null {
  let best: HTMLPreElement | null = null
  let bestLength = 0
  for (const el of document.querySelectorAll('pre')) {
    const length = (el.textContent ?? '').length
    if (length > bestLength) {
      bestLength = length
      best = el as HTMLPreElement
    }
  }
  return best
}

export function detectJsonDocument(): JsonDocument | null {
  const pre = bestPre()
  const preText = pre?.textContent ?? ''
  const bodyText = document.body?.textContent ?? ''
  const source = location.href

  if (isJsonContentType()) {
    // A JSON content type is authoritative: don't spend a parse proving what the server
    // already told us. Prefer the <pre> because it preserves the original whitespace.
    const text = preText.trim() ? preText : bodyText
    if (!text.trim()) return null
    return { text, source, bytes: byteLength(text), origin: 'content-type' }
  }

  // Otherwise: a plain-text or HTML page that happens to be nothing but a JSON blob
  // (a .json file opened from disk, an endpoint served as text/plain).
  const trimmed = preText.trim()
  if (!pre || trimmed.length < 2) return null
  if (!/^[[{]/.test(trimmed)) return null

  const bodyTrimmed = bodyText.trim()
  // The <pre> must account for essentially all of the visible text.
  if (bodyTrimmed.length > trimmed.length + 16) return null
  if (trimmed.length > 4_000_000) return null

  const parsed = parseJson(trimmed)
  if (!parsed.ok) return null

  return { text: preText, source, bytes: byteLength(preText), origin: 'pre' }
}

const MAX_BLOCK_BYTES = 1_500_000
const MAX_BLOCKS_SCANNED = 400
/** Above this, skip the parse and trust a shape sniff — a code sample that big is rare. */
const SNIFF_THRESHOLD = 200_000

export function looksLikeJson(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.length < 2) return false
  if (trimmed[0] !== '{' && trimmed[0] !== '[') return false
  const closing = trimmed[0] === '{' ? '}' : ']'
  if (trimmed[trimmed.length - 1] !== closing) return false
  if (trimmed.length > SNIFF_THRESHOLD) {
    return trimmed[0] === '[' ? /[[{]\s*["\d[{]/.test(trimmed.slice(1, 2000)) : /"\s*:/.test(trimmed.slice(0, 2000))
  }
  return parseJson(trimmed).ok
}

export interface JsonBlock {
  el: HTMLElement
  text: string
}

export function findJsonBlocks(): JsonBlock[] {
  const out: JsonBlock[] = []
  let scanned = 0

  for (const node of document.querySelectorAll('pre')) {
    if (++scanned > MAX_BLOCKS_SCANNED) break
    const el = node as HTMLElement
    // Never touch our own inline viewers.
    if (el.closest('[data-jsonora]')) continue
    const text = el.textContent ?? ''
    if (text.length < 8 || text.length > MAX_BLOCK_BYTES) continue
    if (looksLikeJson(text)) out.push({ el, text })
  }

  return out
}
