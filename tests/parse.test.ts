import { describe, expect, it } from 'vitest'
import { locateError, parseJson, sanitize, stripBom, tryJsonLines } from '@/core/parse'

describe('parseJson — the happy path', () => {
  it('parses plain JSON and reports the format', () => {
    const result = parseJson('{"a": 1}')
    expect(result.ok).toBe(true)
    expect(result.value).toEqual({ a: 1 })
    expect(result.format).toBe('json')
    expect(result.notes).toEqual([])
  })

  it('keeps the original text untouched when nothing needed repairing', () => {
    const text = '{\n  "a": 1\n}'
    expect(parseJson(text).text).toBe(text)
  })

  it('strips a UTF-8 BOM', () => {
    expect(stripBom('\uFEFF{"a":1}')).toBe('{"a":1}')
    expect(parseJson('\uFEFF{"a":1}').ok).toBe(true)
  })
})

describe('parseJson — repair ladder', () => {
  it('removes an XSSI guard prefix and says so', () => {
    const result = parseJson(')]}\',\n{"a": 1}')
    expect(result.ok).toBe(true)
    expect(result.value).toEqual({ a: 1 })
    expect(result.notes).toContain('已去掉 XSSI 前缀')
  })

  it('removes line and block comments', () => {
    const result = parseJson('{\n  // comment\n  "a": 1,\n  /* block */\n  "b": 2\n}')
    expect(result.ok).toBe(true)
    expect(result.value).toEqual({ a: 1, b: 2 })
    expect(result.notes).toContain('已忽略注释')
  })

  it('removes trailing commas in objects and arrays', () => {
    const result = parseJson('{"a": [1, 2, 3,], "b": 2,}')
    expect(result.ok).toBe(true)
    expect(result.value).toEqual({ a: [1, 2, 3], b: 2 })
    expect(result.notes).toContain('已忽略尾随逗号')
  })

  it('converts simple single-quoted strings', () => {
    const result = parseJson("{'a': 'hello'}")
    expect(result.ok).toBe(true)
    expect(result.value).toEqual({ a: 'hello' })
    expect(result.notes).toContain('已转换单引号字符串')
  })

  it('does not mistake a comma inside a string for a trailing comma', () => {
    const result = parseJson('{"a": "x,]", "b": 1}')
    expect(result.ok).toBe(true)
    expect(result.value).toEqual({ a: 'x,]', b: 1 })
    expect(result.notes).toEqual([])
  })

  it('does not mistake a comment marker inside a string for a comment', () => {
    const result = parseJson('{"url": "https://example.com/a//b", "x": 1}')
    expect(result.ok).toBe(true)
    expect(result.value).toEqual({ url: 'https://example.com/a//b', x: 1 })
  })

  it('unwraps JSONP', () => {
    const result = parseJson('myCallback({"a": 1});')
    expect(result.ok).toBe(true)
    expect(result.value).toEqual({ a: 1 })
    expect(result.format).toBe('jsonp')
    expect(result.notes).toContain('已解开 JSONP 包装')
  })

  it('parses JSON Lines into an array', () => {
    const result = parseJson('{"a":1}\n{"a":2}\n{"a":3}')
    expect(result.ok).toBe(true)
    expect(result.value).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }])
    expect(result.format).toBe('jsonl')
  })

  it('leaves a single-line document to the strict parser', () => {
    expect(tryJsonLines('{"a":1}')).toBeNull()
  })

  it('can be told not to repair anything', () => {
    const result = parseJson('{"a": 1,}', { tolerant: false })
    expect(result.ok).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('sanitize', () => {
  it('is length preserving so offsets stay valid', () => {
    const input = '{\n  // hi\n  "a": 1,\n}'
    const output = sanitize(input)
    expect(output.text.length).toBe(input.length)
    expect(output.changed).toBe(true)
  })

  it('reports nothing changed for clean input', () => {
    const clean = '{"a": [1, 2]}'
    expect(sanitize(clean).changed).toBe(false)
    expect(sanitize(clean).text).toBe(clean)
  })

  it('handles an escaped quote inside a single-quoted string', () => {
    const result = parseJson("{'a': 'it\\'s'}")
    expect(result.ok).toBe(true)
    expect(result.value).toEqual({ a: "it's" })
  })
})

describe('locateError', () => {
  it('reports a line, column and a snippet with a caret', () => {
    const text = '{\n  "a": 1\n  "b": 2\n}'
    const result = parseJson(text)
    expect(result.ok).toBe(false)
    const error = result.error!
    expect(error.line).toBeGreaterThan(0)
    expect(error.lines.length).toBeGreaterThan(0)
    expect(error.lines.some((line) => line.isError)).toBe(true)
    expect(error.caret).toBeGreaterThanOrEqual(0)
  })

  it('names the line whose comma is missing', () => {
    const result = parseJson('{\n  "a": 1\n  "b": 2\n}')
    expect(result.error?.hint).toBe('第 2 行末尾可能缺少逗号')
  })

  it('explains an unterminated string', () => {
    const result = parseJson('{"a": "unterminated}')
    expect(result.error?.hint).toContain('缺少结束引号')
  })

  it('handles truncated input, which has no position', () => {
    const result = parseJson('{"a": [1, 2')
    expect(result.ok).toBe(false)
    expect(result.error!.line).toBeGreaterThan(0)
    expect(result.error!.position).toBeGreaterThan(0)
  })

  it('windows a very long error line around the caret', () => {
    const long = `{"a": "${'x'.repeat(500)}" "b": 1}`
    const error = locateError(long, new Error('Unexpected token in JSON at position 510'))
    const errorLine = error.lines.find((line) => line.isError)!
    expect(errorLine.text.length).toBeLessThan(300)
    expect(errorLine.text).toContain('…')
  })

  it('strips the noisy part of the V8 message', () => {
    const error = locateError('{}', new Error("Unexpected token } in JSON at position 12 (line 2 column 3)"))
    expect(error.message).toBe('Unexpected token }')
  })
})

describe('parseJson — failures', () => {
  it('reports ok:false with an error for unrecoverable input', () => {
    const result = parseJson('this is definitely not json')
    expect(result.ok).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.value).toBeUndefined()
  })

  it('does not silently accept a JavaScript object literal with unquoted keys', () => {
    const result = parseJson('{a: 1}')
    expect(result.ok).toBe(false)
  })
})

describe('locateError — missing comma heuristic', () => {
  it('blames the previous line when the parser gives up on a closing brace', () => {
    // V8 points at the offending token on line 3; the missing comma is on line 2.
    const result = parseJson('{\n  "a": 1\n  "b": 2\n}')
    expect(result.error?.hint).toBe('第 2 行末尾可能缺少逗号')
  })

  it('blames the previous line for a missing comma before an array element', () => {
    const result = parseJson('[\n  1\n  2\n]')
    expect(result.error?.hint).toContain('缺少逗号')
  })

  it('prefers a more specific explanation when the parser is not complaining about a comma', () => {
    const result = parseJson('{\n  "a": 1,\n  @\n}')
    expect(result.error?.hint).toBe('对象的键名必须用双引号包裹')
  })

  it('reports the actual line number of the missing comma', () => {
    const result = parseJson('{\n  "a": 1,\n  "b": 2,\n  "c": 3\n  "d": 4\n}')
    expect(result.error?.hint).toBe('第 4 行末尾可能缺少逗号')
  })
})
