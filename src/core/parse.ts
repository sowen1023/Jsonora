/**
 * Parsing with a graceful fallback ladder.
 *
 * Real API responses are frequently *almost* JSON: an XSSI guard prefix, a JSONP wrapper,
 * `//` comments left in a config dump, a trailing comma. Rather than failing with
 * "Unexpected token", Jsonora walks down a ladder of increasingly permissive strategies and
 * reports which one it used, so the user always sees their data plus an honest note.
 *
 * Every repair is length-preserving (comments and commas become spaces) which keeps
 * `JSON.parse` error offsets pointing at the right characters in the original text.
 */

export interface SnippetLine {
  no: number
  text: string
  isError: boolean
}

export interface ParseError {
  message: string
  /** A plain-language guess at the likely mistake, when V8's wording allows one. */
  hint: string | null
  /** Byte offset into the text that was parsed. */
  position: number
  line: number
  column: number
  /** A few lines around the failure, ready to render with a caret. */
  lines: SnippetLine[]
  /** Column (0-based) of the caret inside the error line after windowing. */
  caret: number
}

export interface ParseResult {
  ok: boolean
  value?: unknown
  /** The text that actually parsed — may differ from the input when repaired. */
  text: string
  notes: string[]
  format: 'json' | 'jsonl' | 'jsonp'
  error?: ParseError
}

const XSSI_PREFIXES = [/^\)\]\}',?\s*/, /^for\s*\(\s*;;\s*\)\s*;/, /^while\s*\(\s*1\s*\)\s*;/]

const JSONP_RE = /^\s*[A-Za-z_$][\w$.]*\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*$/

export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

/**
 * Repairs comments, trailing commas and single-quoted strings in one pass, replacing
 * removed characters with spaces so every offset stays valid.
 */
export function sanitize(text: string): { text: string; changed: boolean; notes: string[] } {
  let out = ''
  let changed = false
  let comments = false
  let trailing = false
  let quotes = false
  let inString = false
  let quote = '"'
  const n = text.length
  let i = 0

  while (i < n) {
    const c = text[i]

    if (inString) {
      if (c === '\\') {
        const next = text[i + 1]
        if (quote === "'" && next === "'") {
          out += "'"
          changed = true
          quotes = true
        } else {
          out += text.slice(i, i + 2)
        }
        i += 2
        continue
      }
      if (c === quote) {
        if (quote === "'") {
          out += '"'
          changed = true
          quotes = true
        } else {
          out += c
        }
        inString = false
        i++
        continue
      }
      if (quote === "'" && c === '"') {
        out += '\\"'
        changed = true
        quotes = true
        i++
        continue
      }
      out += c
      i++
      continue
    }

    if (c === '"' || c === "'") {
      if (c === "'") {
        out += '"'
        changed = true
        quotes = true
      } else {
        out += c
      }
      inString = true
      quote = c
      i++
      continue
    }

    if (c === '/' && text[i + 1] === '/') {
      let j = i
      while (j < n && text[j] !== '\n') j++
      out += ' '.repeat(j - i)
      changed = true
      comments = true
      i = j
      continue
    }

    if (c === '/' && text[i + 1] === '*') {
      let j = i + 2
      while (j < n && !(text[j] === '*' && text[j + 1] === '/')) j++
      j = Math.min(n, j + 2)
      out += text.slice(i, j).replace(/[^\n]/g, ' ')
      changed = true
      comments = true
      i = j
      continue
    }

    if (c === ',') {
      let j = i + 1
      while (j < n && /\s/.test(text[j])) j++
      if (j < n && (text[j] === '}' || text[j] === ']')) {
        out += ' '
        changed = true
        trailing = true
        i++
        continue
      }
    }

    out += c
    i++
  }

  const notes: string[] = []
  if (comments) notes.push('已忽略注释')
  if (trailing) notes.push('已忽略尾随逗号')
  if (quotes) notes.push('已转换单引号字符串')
  return { text: out, changed, notes }
}

function attempt(text: string): { ok: true; value: unknown } | { ok: false; error: unknown } {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (error) {
    return { ok: false, error }
  }
}

/** Parses `text` as newline-delimited JSON. Returns `null` when it isn't JSONL. */
export function tryJsonLines(text: string): { value: unknown[]; count: number } | null {
  const lines = text.split('\n')
  const values: unknown[] = []
  let seen = 0
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    seen++
    if (trimmed[0] !== '{' && trimmed[0] !== '[' && !/^["\d\-tfn]/.test(trimmed)) return null
    const res = attempt(trimmed)
    if (!res.ok) return null
    values.push(res.value)
  }
  if (seen < 2) return null
  return { value: values, count: seen }
}

export function parseJson(input: string, opts: { tolerant?: boolean } = {}): ParseResult {
  const tolerant = opts.tolerant ?? true
  const notes: string[] = []
  let text = stripBom(input)

  for (const re of XSSI_PREFIXES) {
    const m = re.exec(text)
    if (m) {
      text = text.slice(m[0].length)
      notes.push('已去掉 XSSI 前缀')
      break
    }
  }

  const strict = attempt(text)
  if (strict.ok) return { ok: true, value: strict.value, text, notes, format: 'json' }
  const firstError = strict.error

  if (tolerant) {
    const clean = sanitize(text)
    if (clean.changed) {
      const repaired = attempt(clean.text)
      if (repaired.ok) {
        return {
          ok: true,
          value: repaired.value,
          text: clean.text,
          notes: [...notes, ...clean.notes],
          format: 'json',
        }
      }
    }

    const jsonp = JSONP_RE.exec(text)
    if (jsonp) {
      const inner = jsonp[1]
      const direct = attempt(inner)
      if (direct.ok) {
        return {
          ok: true,
          value: direct.value,
          text: inner,
          notes: [...notes, '已解开 JSONP 包装'],
          format: 'jsonp',
        }
      }
      const cleaned = sanitize(inner)
      const repaired = attempt(cleaned.text)
      if (repaired.ok) {
        return {
          ok: true,
          value: repaired.value,
          text: cleaned.text,
          notes: [...notes, '已解开 JSONP 包装', ...cleaned.notes],
          format: 'jsonp',
        }
      }
    }

    const jsonl = tryJsonLines(text)
    if (jsonl) {
      return {
        ok: true,
        value: jsonl.value,
        text,
        notes: [...notes, `已按 JSON Lines 解析（${jsonl.count} 行）`],
        format: 'jsonl',
      }
    }
  }

  return {
    ok: false,
    text,
    notes,
    format: 'json',
    error: locateError(text, firstError),
  }
}

const SNIPPET_BEFORE = 2
const SNIPPET_AFTER = 2
const WINDOW_BACK = 70
const WINDOW_FORWARD = 130

export function locateError(text: string, error: unknown): ParseError {
  const message = error instanceof Error ? error.message : String(error)
  const posMatch = /position (\d+)/.exec(message)
  const lcMatch = /line (\d+) column (\d+)/.exec(message)

  let position = posMatch ? Number(posMatch[1]) : -1
  let line = lcMatch ? Number(lcMatch[1]) : -1
  let column = lcMatch ? Number(lcMatch[2]) : -1

  if (position < 0 && line < 0) position = text.length
  if (position > text.length) position = text.length

  if (line < 0) {
    let ln = 1
    let col = 1
    for (let i = 0; i < position; i++) {
      if (text[i] === '\n') {
        ln++
        col = 1
      } else col++
    }
    line = ln
    column = col
  } else if (position < 0) {
    const all = text.split('\n')
    let p = 0
    for (let i = 0; i < line - 1 && i < all.length; i++) p += all[i].length + 1
    position = p + Math.max(0, column - 1)
  }

  const all = text.split('\n')
  const errIdx = Math.min(Math.max(0, line - 1), Math.max(0, all.length - 1))
  const from = Math.max(0, errIdx - SNIPPET_BEFORE)
  const to = Math.min(all.length, errIdx + SNIPPET_AFTER + 1)

  const lines: SnippetLine[] = []
  let caret = Math.max(0, column - 1)

  for (let i = from; i < to; i++) {
    const raw = all[i] ?? ''
    const isError = i === errIdx
    if (isError && raw.length > WINDOW_BACK + WINDOW_FORWARD) {
      const start = Math.max(0, caret - WINDOW_BACK)
      const end = Math.min(raw.length, caret + WINDOW_FORWARD)
      lines.push({
        no: i + 1,
        text: (start > 0 ? '…' : '') + raw.slice(start, end) + (end < raw.length ? '…' : ''),
        isError,
      })
      caret = caret - start + (start > 0 ? 1 : 0)
    } else {
      lines.push({ no: i + 1, text: raw, isError })
      if (isError) caret = Math.min(caret, raw.length)
    }
  }

  return {
    message: cleanMessage(message),
    hint: hintFor(message, text, position, line),
    position,
    line,
    column,
    lines,
    caret,
  }
}

/**
 * V8 reports where the parser gave up, which is often several tokens past the actual
 * mistake. Translating its phrasing into the usual cause is usually more useful than the
 * offset itself.
 */
function hintFor(message: string, text: string, position: number, line: number): string | null {
  const commaMessage = /Expected ',' or '[}\]]'/i.test(message)
  const atCloser = text[position] === '}' || text[position] === ']'
  const blamesComma = commaMessage || atCloser

  // A missing comma is the most common hand-editing mistake by a wide margin, and the one
  // V8 describes worst — so try to name the offending line before falling back.
  if (blamesComma) {
    const named = missingCommaHint(text, line)
    if (named) return named
  }

  if (/Expected property name or '}'/i.test(message)) {
    return '对象里可能有尾随逗号，或键名没有加引号'
  }
  if (/Expected double-quoted property name/i.test(message)) {
    return '对象的键名必须用双引号包裹'
  }
  if (/Unterminated string/i.test(message)) {
    return '字符串缺少结束引号，或里面包含了没有转义的换行'
  }
  if (/Bad control character/i.test(message)) {
    return '字符串里有未转义的控制字符（例如真实的换行或制表符）'
  }
  if (/Unexpected end of JSON input/i.test(message)) {
    return '内容在结束前被截断了'
  }
  if (/Unexpected non-whitespace character after JSON/i.test(message)) {
    return 'JSON 已经结束，后面还有多余内容'
  }
  if (blamesComma) return '属性或数组元素之间可能缺少逗号'
  return null
}

/** Walks back to the last non-empty line before the failure and checks its terminator. */
function missingCommaHint(text: string, line: number): string | null {
  const lines = text.split('\n')
  for (let i = line - 2; i >= 0 && i >= line - 6; i--) {
    const trimmed = (lines[i] ?? '').trimEnd()
    if (!trimmed) continue
    const last = trimmed[trimmed.length - 1]
    if (last === ',' || last === '{' || last === '[' || last === ':') return null
    return `第 ${i + 1} 行末尾可能缺少逗号`
  }
  return null
}

/** V8's wording is noisy; keep the informative head of the sentence. */
function cleanMessage(message: string): string {
  return message
    .replace(/^JSON\.parse:\s*/i, '')
    .replace(/\s+in JSON at position \d+.*$/i, '')
    .replace(/\s+at position \d+.*$/i, '')
    .trim()
}
