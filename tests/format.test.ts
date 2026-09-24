import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  formatCount,
  formatMs,
  indentJsonSource,
  isUnsafeInteger,
  minify,
  sortKeysDeep,
  stringify,
  suggestFilename,
  typeLabel,
} from '@/core/format'

describe('stringify / minify', () => {
  it('honours the indent option', () => {
    expect(stringify({ a: 1 }, 2)).toBe('{\n  "a": 1\n}')
    expect(stringify({ a: 1 }, 4)).toBe('{\n    "a": 1\n}')
    expect(stringify({ a: 1 }, 'tab')).toBe('{\n\t"a": 1\n}')
  })

  it('minifies to a single line', () => {
    expect(minify({ a: [1, 2] })).toBe('{"a":[1,2]}')
  })

  it('round-trips through JSON.parse', () => {
    const value = { a: [1, { b: null }], c: 'x' }
    expect(JSON.parse(stringify(value, 2))).toEqual(value)
  })
})

describe('indentJsonSource', () => {
  it('lays out single-line objects and arrays without changing their values', () => {
    expect(indentJsonSource('{"a":[{"b":1},{}],"c":[]}')).toBe(
      '{\n  "a": [\n    {\n      "b": 1\n    },\n    {}\n  ],\n  "c": []\n}',
    )
  })

  it('preserves large number literals, escapes, and punctuation inside strings', () => {
    const source = String.raw`{"id":9007199254740993,"message":"a,{}:\\n\\\"b"}`
    const result = indentJsonSource(source)
    expect(result).toBe('{' + '\n  "id": 9007199254740993,\n  "message": '
      + String.raw`"a,{}:\\n\\\"b"` + '\n}')
  })

  it('respects tabs and leaves multiline source alone', () => {
    expect(indentJsonSource('{"a":1}', 'tab')).toBe('{\n\t"a": 1\n}')
    expect(indentJsonSource('{\n "a":1\n}')).toBe('{\n "a":1\n}')
  })
})

describe('sortKeysDeep', () => {
  it('sorts object keys recursively', () => {
    const result = sortKeysDeep({ c: 1, a: { z: 1, b: 2 } }) as Record<string, unknown>
    expect(Object.keys(result)).toEqual(['a', 'c'])
    expect(Object.keys(result.a as object)).toEqual(['b', 'z'])
  })

  it('leaves array order alone', () => {
    const result = sortKeysDeep({ b: [3, 1, 2] }) as { b: number[] }
    expect(result.b).toEqual([3, 1, 2])
  })

  it('does not mutate the input', () => {
    const input = { c: 1, a: 2 }
    sortKeysDeep(input)
    expect(Object.keys(input)).toEqual(['c', 'a'])
  })

  it('passes primitives through', () => {
    expect(sortKeysDeep(null)).toBeNull()
    expect(sortKeysDeep(5)).toBe(5)
    expect(sortKeysDeep('s')).toBe('s')
  })
})

describe('formatBytes', () => {
  it('scales the unit', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(1024 * 500)).toBe('500 KB')
    expect(formatBytes(1024 * 1024 * 3)).toBe('3.00 MB')
  })
})

describe('formatCount', () => {
  it('abbreviates large numbers', () => {
    expect(formatCount(999)).toBe('999')
    expect(formatCount(1500)).toBe('1.5k')
    expect(formatCount(25_000)).toBe('25k')
    expect(formatCount(2_500_000)).toBe('2.5M')
  })
})

describe('formatMs', () => {
  it('never shows a fractional millisecond', () => {
    expect(formatMs(0.4)).toBe('<1 ms')
    expect(formatMs(37.2)).toBe('37 ms')
  })
})

describe('typeLabel', () => {
  it('names the kind without a count', () => {
    expect(typeLabel('object')).toBe('对象')
    expect(typeLabel('array')).toBe('数组')
    expect(typeLabel('string')).toBe('字符串')
    expect(typeLabel('number')).toBe('数字')
    expect(typeLabel('boolean')).toBe('布尔值')
    expect(typeLabel('null')).toBe('null')
  })
})

describe('isUnsafeInteger', () => {
  it('flags integers beyond the IEEE-754 safe range', () => {
    expect(isUnsafeInteger(9007199254740993)).toBe(true)
    expect(isUnsafeInteger(42)).toBe(false)
    expect(isUnsafeInteger(1.5)).toBe(false)
    expect(isUnsafeInteger('42')).toBe(false)
  })
})

describe('suggestFilename', () => {
  it('turns a URL into a safe filename', () => {
    expect(suggestFilename('https://api.example.com/v1/users?page=1')).toMatch(/\.json$/)
    expect(suggestFilename('https://api.example.com/v1/users?page=1')).not.toContain('/')
  })

  it('falls back when there is no source', () => {
    expect(suggestFilename()).toBe('data.json')
    expect(suggestFilename('')).toBe('data.json')
  })

  it('caps the length', () => {
    expect(suggestFilename('x'.repeat(500)).length).toBeLessThan(70)
  })
})
