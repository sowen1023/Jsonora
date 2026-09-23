import { describe, expect, it } from 'vitest'
import { JsonModel, kindOf, pathToString, primitiveText } from '@/core/model'

const sample = {
  meta: { requestId: 'req_1', took: 37 },
  data: [
    { id: 'u1', name: 'Ada', active: true },
    { id: 'u2', name: 'Grace', active: false },
  ],
  tags: ['a', 'b'],
  deletedAt: null,
}

describe('kindOf / primitiveText', () => {
  it('classifies every JSON kind', () => {
    expect(kindOf(null)).toBe('null')
    expect(kindOf([])).toBe('array')
    expect(kindOf({})).toBe('object')
    expect(kindOf('s')).toBe('string')
    expect(kindOf(1)).toBe('number')
    expect(kindOf(true)).toBe('boolean')
  })

  it('renders primitives without quotes', () => {
    expect(primitiveText('hi')).toBe('hi')
    expect(primitiveText(null)).toBe('null')
    expect(primitiveText(12.5)).toBe('12.5')
    expect(primitiveText(false)).toBe('false')
  })

  it('truncates an enormous string for display', () => {
    const huge = 'x'.repeat(10_000)
    expect(primitiveText(huge).length).toBeLessThan(huge.length)
  })
})

describe('JsonModel — lazy materialisation', () => {
  it('builds nothing but the virtual root until rows are requested', () => {
    const model = new JsonModel(sample, { expandDepth: 0 })
    expect(model.nodes.length).toBe(1)

    model.visibleRows()
    expect(model.nodes.length).toBe(1 + 4) // virtual root + 4 top-level members
    expect(model.nodes[1].key).toBe('meta')
    expect(model.nodes[1].children).toBeNull()
  })

  it('materialises children on first access and memoises them', () => {
    const model = new JsonModel(sample, { expandDepth: 0 })
    const metaId = model.childrenOf(0)[0]
    const first = model.childrenOf(metaId)
    expect(first.length).toBe(2)
    expect(model.childrenOf(metaId)).toBe(first)
  })

  it('reports a container size without materialising it', () => {
    const model = new JsonModel(sample, { expandDepth: 0 })
    const dataId = model.childrenOf(0)[1]
    expect(model.sizeOf(dataId)).toBe(2)
    expect(model.nodes[dataId].children).toBeNull()
  })

  it('gives a top-level scalar a single row to render', () => {
    const model = new JsonModel(42, { expandDepth: 1 })
    const rows = model.visibleRows()
    expect(rows.length).toBe(1)
    expect(model.nodes[rows[0]].kind).toBe('number')
    expect(model.nodes[rows[0]].text).toBe('42')
  })

  it('honours expandDepth', () => {
    const none = new JsonModel(sample, { expandDepth: 0 })
    expect(none.visibleRows().length).toBe(4)

    const one = new JsonModel(sample, { expandDepth: 1 })
    // 4 top-level + meta's 2 + data's 2 + tags' 2
    expect(one.visibleRows().length).toBe(10)
  })
})

describe('JsonModel — expansion', () => {
  it('toggles a container', () => {
    const model = new JsonModel(sample, { expandDepth: 0 })
    const metaId = model.childrenOf(0)[0]
    expect(model.isExpanded(metaId)).toBe(false)
    model.toggle(metaId)
    expect(model.isExpanded(metaId)).toBe(true)
    expect(model.visibleRows().length).toBe(6)
    model.toggle(metaId)
    expect(model.visibleRows().length).toBe(4)
  })

  it('ignores a toggle on a primitive', () => {
    const model = new JsonModel(sample, { expandDepth: 1 })
    const tagsId = model.childrenOf(0)[2]
    const itemId = model.childrenOf(tagsId)[0]
    model.toggle(itemId)
    expect(model.isExpanded(itemId)).toBe(false)
  })

  it('collapses everything at once', () => {
    const model = new JsonModel(sample, { expandDepth: 3 })
    expect(model.visibleRows().length).toBeGreaterThan(10)
    model.collapseAll()
    expect(model.visibleRows().length).toBe(4)
  })

  it('expands everything at once', () => {
    const model = new JsonModel(sample, { expandDepth: 0 })
    model.expandAll()
    // 4 top-level + meta 2 + data 2 + each user's 3 fields (6) + tags 2
    expect(model.visibleRows().length).toBe(4 + 2 + 2 + 6 + 2)
  })

  it('reveals every ancestor of a deep node', () => {
    const model = new JsonModel(sample, { expandDepth: 0 })
    const dataId = model.childrenOf(0)[1]
    const firstUser = model.childrenOf(dataId)[0]
    const nameId = model.childrenOf(firstUser)[1]
    expect(model.visibleRows()).not.toContain(nameId)
    model.reveal(nameId)
    expect(model.visibleRows()).toContain(nameId)
  })

  it('invalidates the cached row list when the expansion changes', () => {
    const model = new JsonModel(sample, { expandDepth: 0 })
    const before = model.visibleRows()
    const metaId = model.childrenOf(0)[0]
    model.expand(metaId)
    expect(model.visibleRows()).not.toBe(before)
    expect(model.visibleRows().length).toBe(before.length + 2)
  })

  it('keeps rows in document order after expanding', () => {
    const model = new JsonModel(sample, { expandDepth: 1 })
    const keys = model
      .visibleRows()
      .map((id) => model.nodes[id].key ?? `[${model.nodes[id].index}]`)
    expect(keys.slice(0, 4)).toEqual(['meta', 'requestId', 'took', 'data'])
  })
})

describe('JsonModel — paths', () => {
  it('builds a JSONPath for a nested node', () => {
    const model = new JsonModel(sample, { expandDepth: 3 })
    const dataId = model.childrenOf(0)[1]
    const user = model.childrenOf(dataId)[0]
    const nameId = model.childrenOf(user)[1]
    expect(pathToString(model.pathOf(nameId))).toBe('$.data[0].name')
  })

  it('quotes keys that are not identifiers', () => {
    expect(pathToString(['a', 'b-c', 2, 'd e'])).toBe("$.a['b-c'][2]['d e']")
  })

  it('escapes quotes inside keys', () => {
    expect(pathToString(["it's"])).toBe("$['it\\'s']")
  })
})

describe('JsonModel — search', () => {
  const opts = { regex: false, caseSensitive: false, matchKeys: true, matchValues: true }

  it('finds matches in keys and values', () => {
    const model = new JsonModel(sample, { expandDepth: 3 })
    const { ids } = model.search({ ...opts, query: 'ada' })
    expect(ids.length).toBe(1)
    expect(model.nodes[ids[0]].text).toBe('Ada')
  })

  it('matches keys as well as values', () => {
    const model = new JsonModel(sample, { expandDepth: 3 })
    const { ids } = model.search({ ...opts, query: 'requestId' })
    expect(ids.length).toBe(1)
    expect(model.nodes[ids[0]].key).toBe('requestId')
  })

  it('respects case sensitivity', () => {
    const model = new JsonModel(sample, { expandDepth: 3 })
    expect(model.search({ ...opts, query: 'ada' }).ids.length).toBe(1)
    expect(model.search({ ...opts, query: 'ada', caseSensitive: true }).ids.length).toBe(0)
  })

  it('supports regular expressions', () => {
    const model = new JsonModel(sample, { expandDepth: 3 })
    const { ids } = model.search({ ...opts, query: '^u\\d$', regex: true })
    expect(ids.length).toBe(2)
  })

  it('returns nothing for an invalid regex instead of throwing', () => {
    const model = new JsonModel(sample, { expandDepth: 3 })
    expect(model.search({ ...opts, query: '([', regex: true }).ids).toEqual([])
  })

  it('can search keys only', () => {
    const model = new JsonModel(sample, { expandDepth: 3 })
    const { ids } = model.search({ ...opts, query: 'Ada', matchKeys: false })
    expect(ids.length).toBe(1)
    const keysOnly = model.search({ ...opts, query: 'Ada', matchValues: false })
    expect(keysOnly.ids.length).toBe(0)
  })
})

describe('JsonModel — "only matches" rows', () => {
  it('keeps matches and the ancestors that place them', () => {
    const model = new JsonModel(sample, { expandDepth: 0 })
    const { ids } = model.search({
      query: 'Ada',
      regex: false,
      caseSensitive: false,
      matchKeys: true,
      matchValues: true,
    })
    const rows = model.rowsForMatches(ids)
    const keys = rows.map((id) => model.nodes[id].key ?? `[${model.nodes[id].index}]`)
    expect(keys).toEqual(['data', '[0]', 'name'])
  })

  it('caches per match list', () => {
    const model = new JsonModel(sample, { expandDepth: 0 })
    const { ids } = model.search({
      query: 'Ada',
      regex: false,
      caseSensitive: false,
      matchKeys: true,
      matchValues: true,
    })
    expect(model.rowsForMatches(ids)).toBe(model.rowsForMatches(ids))
  })
})

describe('JsonModel — guards', () => {
  it('stops materialising at maxNodes and flags it', () => {
    const big = { rows: Array.from({ length: 500 }, (_, i) => ({ i })) }
    const model = new JsonModel(big, { expandDepth: 0, maxNodes: 50 })
    model.expandAll()
    expect(model.nodeLimitHit).toBe(true)
    expect(model.nodes.length).toBeLessThanOrEqual(51)
  })

  it('sorts keys when asked, without mutating the source', () => {
    const source = { b: 1, a: 2, c: 3 }
    const model = new JsonModel(source, { expandDepth: 1, sortKeys: true })
    const keys = model.childrenOf(0).map((id) => model.nodes[id].key)
    expect(keys).toEqual(['a', 'b', 'c'])
    expect(Object.keys(source)).toEqual(['b', 'a', 'c'])
  })

  it('tracks the deepest level reached', () => {
    const model = new JsonModel(sample, { expandDepth: 0 })
    model.expandAll()
    // top-level members are depth 0, data[0] is depth 1, its fields are depth 2
    expect(model.stats(100, 1).depth).toBe(2)
  })

  it('reports root shape in stats', () => {
    const model = new JsonModel(sample, { expandDepth: 0 })
    const stats = model.stats(1234, 5)
    expect(stats.rootKind).toBe('object')
    expect(stats.bytes).toBe(1234)
    expect(stats.ms).toBe(5)
  })

  it('handles an empty object', () => {
    const model = new JsonModel({}, { expandDepth: 1 })
    expect(model.visibleRows()).toEqual([])
    expect(model.stats(2, 0).rootKind).toBe('object')
  })
})
