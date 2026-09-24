import type { JsonKind } from './types'

export type IndentOption = 2 | 4 | 'tab'

export function stringify(value: unknown, indent: IndentOption = 2): string {
  return JSON.stringify(value, null, indent === 'tab' ? '\t' : indent) ?? String(value)
}

/**
 * Adds display-only indentation to an already validated, single-line JSON source.
 * Unlike JSON.parse + JSON.stringify, this keeps numeric literals and string escapes
 * byte-for-byte intact. The caller retains the original source for export.
 */
export function indentJsonSource(text: string, indent: IndentOption = 2): string {
  if (/[\r\n]/.test(text)) return text

  const unit = indent === 'tab' ? '\t' : ' '.repeat(indent)
  const parts: string[] = []
  const nonEmpty: boolean[] = []
  let depth = 0
  let inString = false
  let escaped = false

  const newline = () => parts.push('\n', unit.repeat(depth))

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inString) {
      parts.push(char)
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }

    if (char === '"') {
      inString = true
      parts.push(char)
    } else if (/\s/.test(char)) {
      continue
    } else if (char === '{' || char === '[') {
      parts.push(char)
      let next = i + 1
      while (next < text.length && /\s/.test(text[next])) next++
      const hasChildren = text[next] !== (char === '{' ? '}' : ']')
      nonEmpty.push(hasChildren)
      if (hasChildren) {
        depth++
        newline()
      }
    } else if (char === '}' || char === ']') {
      if (nonEmpty.pop()) {
        depth--
        newline()
      }
      parts.push(char)
    } else if (char === ',') {
      parts.push(char)
      newline()
    } else if (char === ':') {
      parts.push(': ')
    } else {
      parts.push(char)
    }
  }

  return parts.join('')
}

export function minify(value: unknown): string {
  return JSON.stringify(value) ?? String(value)
}

/** Returns a copy with object keys sorted, recursively. Arrays keep their order. */
export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value && typeof value === 'object') {
    const src = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(src).sort()) out[key] = sortKeysDeep(src[key])
    return out
  }
  return value
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function formatCount(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}

export function formatMs(ms: number): string {
  return ms < 1 ? '<1 ms' : `${Math.round(ms)} ms`
}

/** A node's type label, used in the detail sheet and status bar. */
export function typeLabel(kind: JsonKind): string {
  switch (kind) {
    case 'object':
      return '对象'
    case 'array':
      return '数组'
    case 'string':
      return '字符串'
    case 'number':
      return '数字'
    case 'boolean':
      return '布尔值'
    case 'null':
      return 'null'
    default:
      return kind
  }
}

/** Warns when an integer cannot survive a round-trip through IEEE-754. */
export function isUnsafeInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && !Number.isSafeInteger(value)
}

export function downloadText(filename: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5_000)
}

const FILENAME_SAFE = /[^\w.\-]+/g

export function suggestFilename(source?: string): string {
  const base = (source ?? 'data')
    .replace(/^https?:\/\//, '')
    .replace(FILENAME_SAFE, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
  return `${base || 'data'}.json`
}
