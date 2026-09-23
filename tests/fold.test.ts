import { describe, expect, it } from 'vitest'
import { foldableLineEnds, visibleLineIndices } from '@/core/fold'

describe('foldableLineEnds', () => {
  it('matches nested objects and arrays without making one-line containers foldable', () => {
    const lines = ['{', '  "items": [', '    {"id": 1},', '    {', '      "id": 2', '    }', '  ]', '}']
    expect(foldableLineEnds(lines)).toEqual([7, 6, -1, 5, -1, -1, -1, -1])
  })

  it('ignores brackets inside strings and comments', () => {
    const lines = [
      '{',
      '  "text": "} \\" {", // [',
      '  /* {',
      '     } */ "data": {',
      '    "url": "https://example.com/{x}"',
      '  }',
      '}',
    ]
    expect(foldableLineEnds(lines)).toEqual([6, -1, -1, 5, -1, -1, -1])
  })

  it('does not fold unmatched containers', () => {
    expect(foldableLineEnds(['{', '  "items": [', '  }'])).toEqual([-1, -1, -1])
  })
})

describe('visibleLineIndices', () => {
  it('hides a folded body while keeping source line numbers', () => {
    const ends = [6, 4, -1, -1, -1, -1, -1]
    expect(visibleLineIndices(7, ends, new Set([1]))).toEqual([0, 1, 5, 6])
    expect(visibleLineIndices(7, ends, new Set([0, 1]))).toEqual([0])
  })
})
