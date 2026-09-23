import { describe, expect, it } from 'vitest'
import { findRanges, lineNestingDepths, segmentLine, tokenizeLine } from '@/core/highlight'

const types = (line: string) => tokenizeLine(line).map((t) => t.type)
const texts = (line: string) => tokenizeLine(line).map((t) => line.slice(t.start, t.end))

describe('tokenizeLine', () => {
  it('classifies an object property line', () => {
    expect(types('  "name": "Ada",')).toEqual(['key', 'punct', 'string', 'punct'])
  })

  it('classifies numbers, booleans and null', () => {
    expect(types('"a": -12.5e3,')).toEqual(['key', 'punct', 'number', 'punct'])
    expect(types('"a": true')).toEqual(['key', 'punct', 'boolean'])
    expect(types('"a": null')).toEqual(['key', 'punct', 'null'])
  })

  it('treats array elements as strings, not keys', () => {
    expect(types('"admin",')).toEqual(['string', 'punct'])
  })

  it('classifies braces and brackets', () => {
    expect(types('{')).toEqual(['brace'])
    expect(types('}')).toEqual(['brace'])
    expect(types('[')).toEqual(['brace'])
    expect(types('],')).toEqual(['brace', 'punct'])
  })

  it('keeps escapes inside a string', () => {
    const line = '"a": "he said \\"hi\\"",'
    expect(texts(line)).toEqual(['"a"', ':', '"he said \\"hi\\""', ','])
  })

  it('handles a colon inside a string value', () => {
    const line = '"url": "https://x.dev/a",'
    expect(types(line)).toEqual(['key', 'punct', 'string', 'punct'])
  })

  it('tokenises a whole minified document on one line', () => {
    const line = '{"a":1,"b":[true,null]}'
    expect(types(line)).toEqual([
      'brace',
      'key',
      'punct',
      'number',
      'punct',
      'key',
      'punct',
      'brace',
      'boolean',
      'punct',
      'null',
      'brace',
      'brace',
    ])
  })

  it('degrades to plain tokens on malformed input instead of throwing', () => {
    const line = '"a": @@@'
    const tokens = tokenizeLine(line)
    expect(tokens.length).toBeGreaterThan(0)
    expect(tokens.some((t) => t.type === 'plain')).toBe(true)
  })

  it('produces tokens that cover every non-whitespace character', () => {
    const line = '  "a": [1, 2],  '
    const covered = texts(line).join('')
    // Tokens are the non-whitespace runs; segmentLine fills the gaps when rendering.
    expect(covered).toBe(line.replace(/\s+/g, ''))
  })
})

describe('findRanges', () => {
  it('finds every occurrence, case-insensitively by default', () => {
    expect(findRanges('Ada ada ADA', 'ada')).toEqual([
      [0, 3],
      [4, 7],
      [8, 11],
    ])
  })

  it('respects case sensitivity', () => {
    expect(findRanges('Ada ada', 'ada', { caseSensitive: true })).toEqual([[4, 7]])
  })

  it('supports regular expressions', () => {
    expect(findRanges('a1 b2 c3', '\\d', { regex: true })).toEqual([
      [1, 2],
      [4, 5],
      [7, 8],
    ])
  })

  it('returns nothing for an invalid regex', () => {
    expect(findRanges('abc', '([', { regex: true })).toEqual([])
  })

  it('returns nothing for an empty query', () => {
    expect(findRanges('abc', '')).toEqual([])
  })

  it('does not loop forever on a zero-width regex match', () => {
    const ranges = findRanges('abc', 'x*', { regex: true })
    expect(Array.isArray(ranges)).toBe(true)
  })
})

describe('segmentLine', () => {
  it('splits a token around a hit', () => {
    const line = '"name": "Ada Lovelace",'
    const hits = findRanges(line, 'Ada')
    const segments = segmentLine(line, hits)
    expect(segments.map((s) => s.text).join('')).toBe(line)
    expect(segments.filter((s) => s.hit).map((s) => s.text)).toEqual(['Ada'])
  })

  it('keeps a hit highlighted across the whitespace between two tokens', () => {
    const line = '"name": "Ada",'
    // Offsets 6..11 are `: "Ad` — the space between the colon and the string is a gap
    // between tokens, and must stay part of the hit.
    const segments = segmentLine(line, [[6, 11]])
    expect(segments.map((s) => s.text).join('')).toBe(line)
    expect(segments.filter((s) => s.hit).map((s) => s.text).join('')).toBe(': "Ad')
  })

  it('keeps token types on the unhighlighted parts', () => {
    const line = '"name": "Ada",'
    const segments = segmentLine(line, findRanges(line, 'Ada'))
    const key = segments.find((s) => s.text === '"name"')
    expect(key?.type).toBe('key')
  })

  it('returns the line unchanged when there are no hits', () => {
    const line = '"a": 1,'
    const segments = segmentLine(line, [])
    expect(segments.map((s) => s.text).join('')).toBe(line)
    expect(segments.some((s) => s.hit)).toBe(false)
  })

  it('handles multiple hits in one line', () => {
    const line = '{"a": 1, "a": 2}'
    const segments = segmentLine(line, findRanges(line, 'a'))
    expect(segments.filter((s) => s.hit).length).toBe(2)
    expect(segments.map((s) => s.text).join('')).toBe(line)
  })

  it('preserves every character of the original line', () => {
    const line = '  "deep": { "k": [1, 2], "s": "x" },  '
    const segments = segmentLine(line, findRanges(line, 'e'))
    expect(segments.map((s) => s.text).join('')).toBe(line)
  })
})

describe('lineNestingDepths', () => {
  it('tracks matching container depth across lines', () => {
    expect(lineNestingDepths(['{', '  "items": [', '    { "id": 1 }', '  ]', '}'])).toEqual([0, 1, 2, 2, 1])
  })

  it('ignores braces inside strings and JSONC comments', () => {
    expect(lineNestingDepths(['{', '  "text": "} \\" {", // [', '  /* {', '  } */ "ok": true', '}'])).toEqual([0, 1, 1, 1, 1])
  })
})
