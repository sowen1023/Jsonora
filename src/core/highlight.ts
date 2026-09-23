/**
 * Line-oriented JSON syntax highlighting.
 *
 * Because JSON strings cannot contain a literal newline, every line of a pretty-printed
 * document is a self-contained token stream. That lets the raw view tokenise only the
 * lines currently on screen instead of walking a multi-megabyte string, and it degrades
 * gracefully on malformed input (which is exactly when you most need to look at it).
 */

export type TokenType = 'key' | 'string' | 'number' | 'boolean' | 'null' | 'brace' | 'punct' | 'plain'

export interface Token {
  start: number
  end: number
  type: TokenType
}

export interface Segment {
  text: string
  type: TokenType
  /** True when this slice is inside a search hit. */
  hit: boolean
}

const NUMBER_CHARS = /[0-9eE+\-.]/
const DELIM_CHARS = /["\-0-9{},:[\]]/

export function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = []
  const n = line.length
  let i = 0

  while (i < n) {
    const c = line[i]

    if (c === ' ' || c === '\t' || c === '\r') {
      i++
      continue
    }

    if (c === '"') {
      const start = i
      i++
      while (i < n) {
        if (line[i] === '\\') {
          i += 2
          continue
        }
        if (line[i] === '"') {
          i++
          break
        }
        i++
      }
      let j = i
      while (j < n && (line[j] === ' ' || line[j] === '\t')) j++
      tokens.push({ start, end: Math.min(i, n), type: line[j] === ':' ? 'key' : 'string' })
      continue
    }

    if (c === '-' || (c >= '0' && c <= '9')) {
      const start = i
      i++
      while (i < n && NUMBER_CHARS.test(line[i])) i++
      tokens.push({ start, end: i, type: 'number' })
      continue
    }

    if (c === 't' && line.startsWith('true', i)) {
      tokens.push({ start: i, end: i + 4, type: 'boolean' })
      i += 4
      continue
    }
    if (c === 'f' && line.startsWith('false', i)) {
      tokens.push({ start: i, end: i + 5, type: 'boolean' })
      i += 5
      continue
    }
    if (c === 'n' && line.startsWith('null', i)) {
      tokens.push({ start: i, end: i + 4, type: 'null' })
      i += 4
      continue
    }

    if (c === '{' || c === '}' || c === '[' || c === ']') {
      tokens.push({ start: i, end: i + 1, type: 'brace' })
      i++
      continue
    }
    if (c === ',' || c === ':') {
      tokens.push({ start: i, end: i + 1, type: 'punct' })
      i++
      continue
    }

    const start = i
    while (i < n && !DELIM_CHARS.test(line[i]) && !/\s/.test(line[i])) i++
    if (i === start) i++
    tokens.push({ start, end: i, type: 'plain' })
  }

  return tokens
}

export type Range = [start: number, end: number]

/** Emits `[start, end)` split into runs of hit / not-hit, all tagged with `type`. */
function emit(
  out: Segment[],
  line: string,
  start: number,
  end: number,
  type: TokenType,
  hits: readonly Range[],
): void {
  if (end <= start) return

  const overlapping = hits
    .filter((hit) => hit[0] < end && hit[1] > start)
    .sort((a, b) => a[0] - b[0])

  if (!overlapping.length) {
    out.push({ text: line.slice(start, end), type, hit: false })
    return
  }

  let pos = start
  for (const [hitStart, hitEnd] of overlapping) {
    const from = Math.max(hitStart, start)
    const to = Math.min(hitEnd, end)
    if (from > pos) out.push({ text: line.slice(pos, from), type, hit: false })
    if (to > from) out.push({ text: line.slice(from, to), type, hit: true })
    pos = Math.max(pos, to)
  }
  if (pos < end) out.push({ text: line.slice(pos, end), type, hit: false })
}

/**
 * Splits a line into render segments, marking the slices that fall inside a search hit.
 * Whitespace between tokens is emitted too — a hit that spans a token boundary (a phrase
 * with a space in it) must stay highlighted across the gap, not break in the middle.
 */
export function segmentLine(line: string, hits: readonly Range[]): Segment[] {
  const out: Segment[] = []
  let cursor = 0

  for (const token of tokenizeLine(line)) {
    emit(out, line, cursor, token.start, 'plain', hits)
    emit(out, line, token.start, token.end, token.type, hits)
    cursor = token.end
  }
  emit(out, line, cursor, line.length, 'plain', hits)

  return out
}

/** All non-overlapping occurrences of `query` inside `line`. */
export function findRanges(
  line: string,
  query: string,
  opts: { regex?: boolean; caseSensitive?: boolean } = {},
): Range[] {
  if (!query) return []

  if (opts.regex) {
    let re: RegExp
    try {
      re = new RegExp(query, opts.caseSensitive ? 'g' : 'gi')
    } catch {
      return []
    }
    const out: Range[] = []
    let m: RegExpExecArray | null
    let guard = 0
    while ((m = re.exec(line)) !== null && guard++ < 1000) {
      if (m[0] === '') {
        re.lastIndex++
        continue
      }
      out.push([m.index, m.index + m[0].length])
    }
    return out
  }

  const haystack = opts.caseSensitive ? line : line.toLowerCase()
  const needle = opts.caseSensitive ? query : query.toLowerCase()
  const out: Range[] = []
  let from = 0
  for (;;) {
    const at = haystack.indexOf(needle, from)
    if (at < 0) break
    out.push([at, at + needle.length])
    from = at + needle.length
    if (out.length > 1000) break
  }
  return out
}

/** Line offsets for the raw view's gutter, computed once per document. */
export function splitLines(text: string): string[] {
  return text.split('\n')
}

/** Starting bracket depth for every line, ignoring brackets in strings and JSONC comments. */
export function lineNestingDepths(lines: readonly string[]): number[] {
  const depths = new Array<number>(lines.length)
  let depth = 0
  let blockComment = false

  for (let row = 0; row < lines.length; row++) {
    const line = lines[row]
    depths[row] = depth
    let quoted = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const next = line[i + 1]
      if (blockComment) {
        if (char === '*' && next === '/') {
          blockComment = false
          i++
        }
        continue
      }
      if (quoted) {
        if (char === '\\') i++
        else if (char === '"') quoted = false
        continue
      }
      if (char === '"') quoted = true
      else if (char === '/' && next === '/') break
      else if (char === '/' && next === '*') {
        blockComment = true
        i++
      } else if (char === '{' || char === '[') depth++
      else if (char === '}' || char === ']') depth = Math.max(0, depth - 1)
    }
  }

  return depths
}
