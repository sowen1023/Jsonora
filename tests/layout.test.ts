import { describe, expect, it } from 'vitest'
import { JsonModel } from '@/core/model'
import { edgePath, layoutCompactGraph, layoutGraph, seedAutoCollapse } from '@/core/layout'

/** Deterministic stand-in for canvas text metrics. */
const measure = (text: string) => text.length * 7

const build = (value: unknown, expandDepth = 1, opts: Record<string, unknown> = {}) => {
  const model = new JsonModel(value, { expandDepth })
  const layout = layoutGraph(model, model.expanded, { measure, ...opts })
  return { model, layout }
}

const byLabel = (layout: ReturnType<typeof layoutGraph>, label: string) =>
  layout.nodes.find((node) => node.label === label)

describe('layoutGraph — visibility', () => {
  it('lays out the top level of a collapsed document', () => {
    const { layout } = build({ a: 1, b: 2, c: 3 }, 0)
    expect(layout.nodes.map((n) => n.label)).toEqual(['$', 'a', 'b', 'c'])
    expect(layout.edges).toHaveLength(3)
  })

  it('includes children of expanded containers and connects them', () => {
    const { layout } = build({ outer: { inner: 1 } }, 1)
    expect(layout.nodes.map((n) => n.label)).toEqual(['$', 'outer', 'inner'])
    expect(layout.edges.length).toBe(2)
    expect(layout.edges[1].fromId).toBe(byLabel(layout, 'outer')?.id)
    expect(layout.edges[1].toId).toBe(byLabel(layout, 'inner')?.id)
  })

  it('connects every first-level node to one explicit JSON root', () => {
    const { layout } = build({ meta: {}, data: [], links: {} }, 0)
    const root = byLabel(layout, '$')!
    const firstLevel = ['meta', 'data', 'links'].map((label) => byLabel(layout, label)!)
    expect(root.value).toBe('{} · 3')
    expect(layout.edges.map((edge) => edge.fromId)).toEqual(firstLevel.map(() => root.id))
    expect(layout.edges.map((edge) => edge.toId)).toEqual(firstLevel.map((node) => node.id))
  })

  it('marks an expanded container with its type and direct child count', () => {
    const { layout } = build({ open: { x: 1 } }, 1)
    expect(byLabel(layout, 'open')?.value).toBe('{} · 1')
    expect(byLabel(layout, 'open')?.collapsed).toBe(false)
  })

  it('shows an ellipsis marker once a container is collapsed again', () => {
    const { layout } = build({ shut: { y: 2 } }, 0)
    expect(byLabel(layout, 'shut')?.collapsed).toBe(true)
    expect(byLabel(layout, 'shut')?.value).toBe('{…} · 1')
  })

  it('uses brackets for arrays', () => {
    const { layout } = build({ list: [1] }, 0)
    expect(byLabel(layout, 'list')?.value).toBe('[…] · 1')
  })

  it('flags array element nodes as indexed', () => {
    const { layout } = build({ list: ['a'] }, 1)
    expect(byLabel(layout, '0')?.indexed).toBe(true)
  })

  it('renders a top-level scalar as one explicit root node', () => {
    const { layout } = build(42, 1)
    expect(layout.nodes.length).toBe(1)
    expect(layout.nodes[0].label).toBe('$')
    expect(layout.nodes[0].value).toBe('42')
  })

  it('keeps the root visible for an empty object', () => {
    const { layout } = build({}, 1)
    expect(layout.nodes).toHaveLength(1)
    expect(layout.nodes[0].label).toBe('$')
    expect(layout.nodes[0].value).toBe('{} · 0')
    expect(layout.edges).toEqual([])
    expect(layout.width).toBeGreaterThan(0)
    expect(layout.height).toBeGreaterThan(0)
  })

  it('detects hex colours for a swatch', () => {
    const { layout } = build({ a: '#ff0000', b: 'nope' }, 0)
    expect(byLabel(layout, 'a')?.swatch).toBe('#ff0000')
    expect(byLabel(layout, 'b')?.swatch).toBeNull()
  })
})

describe('layoutGraph — geometry', () => {
  it('places every child one column to the right of its parent', () => {
    const { layout } = build({ outer: { inner: 1 } }, 1, { gapX: 60 })
    const outer = byLabel(layout, 'outer')!
    const inner = byLabel(layout, 'inner')!
    expect(inner.x).toBe(outer.x + outer.w + 60)
  })

  it('places first-level nodes one column to the right of the JSON root', () => {
    const { layout } = build({ a: 1 }, 0, { gapX: 60 })
    const root = byLabel(layout, '$')!
    const child = byLabel(layout, 'a')!
    expect(child.x).toBe(root.x + root.w + 60)
  })

  it('stacks siblings without overlapping', () => {
    const { layout } = build({ a: 1, b: 2, c: 3 }, 0, { gapY: 10, nodeHeight: 30 })
    const sorted = layout.nodes.filter((node) => node.depth === 0).sort((p, q) => p.y - q.y)
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].y - (sorted[i - 1].y + sorted[i - 1].h)
      expect(gap).toBeGreaterThanOrEqual(10)
    }
  })

  it('centres a parent against the band its children occupy', () => {
    const { layout } = build({ parent: { a: 1, b: 2, c: 3 } }, 1, { gapY: 10, nodeHeight: 30 })
    const parent = byLabel(layout, 'parent')!
    const kids = ['a', 'b', 'c'].map((label) => byLabel(layout, label)!)
    const top = Math.min(...kids.map((k) => k.y))
    const bottom = Math.max(...kids.map((k) => k.y + k.h))
    expect(parent.y + parent.h / 2).toBeCloseTo((top + bottom) / 2, 5)
  })

  it('keeps every node inside the reported bounds', () => {
    const { layout } = build({ a: { b: { c: [1, 2, 3] } }, d: 'text', e: null }, 4)
    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(node.x + node.w).toBeLessThanOrEqual(layout.width)
      expect(node.y + node.h).toBeLessThanOrEqual(layout.height)
    }
  })

  it('gives each node a distinct id', () => {
    const { layout } = build({ a: { b: 1 }, c: [1, 2] }, 4)
    expect(new Set(layout.nodes.map((n) => n.id)).size).toBe(layout.nodes.length)
  })

  it('sizes nodes from the measured text', () => {
    const narrow = build({ a: 1 }, 0).layout
    const wide = build({ a: 'a very long string value indeed' }, 0).layout
    expect(byLabel(wide, 'a')!.w).toBeGreaterThan(byLabel(narrow, 'a')!.w)
  })

  it('honours a minimum width for very short labels', () => {
    const { layout } = build({ a: '' }, 0)
    expect(layout.nodes[0].w).toBeGreaterThanOrEqual(56)
  })

  it('truncates an enormous string value', () => {
    const { layout } = build({ a: 'x'.repeat(500) }, 0)
    const value = byLabel(layout, 'a')!.value
    expect(value.length).toBeLessThan(60)
    expect(value.endsWith('…')).toBe(true)
  })
})

describe('layoutGraph — edges', () => {
  it('anchors an edge on the parent right edge and the child left edge', () => {
    const { layout } = build({ outer: { inner: 1 } }, 1)
    const outer = byLabel(layout, 'outer')!
    const inner = byLabel(layout, 'inner')!
    const edge = layout.edges.find((item) => item.fromId === outer.id && item.toId === inner.id)!
    expect(edge.x1).toBe(outer.x + outer.w)
    expect(edge.y1).toBe(outer.y + outer.h / 2)
    expect(edge.x2).toBe(inner.x)
    expect(edge.y2).toBe(inner.y + inner.h / 2)
  })

  it('emits one edge per visible parent-child pair', () => {
    const { layout } = build({ a: { b: 1, c: 2 }, d: { e: 3 } }, 2)
    expect(layout.edges.length).toBe(layout.nodes.length - 1)
  })

  it('keys edges uniquely', () => {
    const { layout } = build({ a: { b: { c: 1 } }, d: [1, 2] }, 4)
    expect(new Set(layout.edges.map((e) => e.key)).size).toBe(layout.edges.length)
  })
})

describe('layoutGraph — guards', () => {
  it('stops at maxNodes and reports truncation', () => {
    const wide = { rows: Array.from({ length: 400 }, (_, i) => ({ i })) }
    const { layout } = build(wide, 3, { maxNodes: 50 })
    expect(layout.truncated).toBe(true)
    expect(layout.nodes.length).toBeLessThanOrEqual(50)
  })

  it('does not report truncation for a document that fits', () => {
    const { layout } = build({ a: 1, b: 2 }, 1, { maxNodes: 100 })
    expect(layout.truncated).toBe(false)
  })

  it('survives deep nesting without recursing', () => {
    let deep: unknown = 1
    for (let i = 0; i < 4000; i++) deep = { n: deep }
    const model = new JsonModel(deep, { expandDepth: 0 })
    model.expandAll()
    expect(() => layoutGraph(model, model.expanded, { measure })).not.toThrow()
  })
})

describe('layoutCompactGraph', () => {
  it('groups direct scalar fields into one object card', () => {
    const model = new JsonModel({ user: { id: 7, name: 'Ada', active: true } }, { expandDepth: 2 })
    const layout = layoutCompactGraph(model, model.expanded, { measure })
    const user = layout.nodes.find((node) => node.label === 'user')
    expect(user?.rows?.map((row) => row.label)).toEqual(['id', 'name', 'active'])
    expect(layout.nodes.some((node) => node.label === 'id')).toBe(false)
  })

  it('connects expanded nested containers from their parent card row', () => {
    const model = new JsonModel({ user: { profile: { city: 'London' } } }, { expandDepth: 3 })
    const layout = layoutCompactGraph(model, model.expanded, { measure })
    const user = layout.nodes.find((node) => node.label === 'user')!
    const profile = layout.nodes.find((node) => node.label === 'profile')!
    const edge = layout.edges.find((item) => item.fromId === user.id && item.toId === profile.id)
    expect(edge).toBeDefined()
    expect(edge?.y1).toBeGreaterThan(user.y)
    expect(profile.rows?.[0].label).toBe('city')
  })

  it('keeps collapsed containers as interactive summary rows without a child card', () => {
    const model = new JsonModel({ user: { profile: { city: 'London' } } }, { expandDepth: 1 })
    const layout = layoutCompactGraph(model, model.expanded, { measure })
    const user = layout.nodes.find((node) => node.label === 'user')!
    const profileRow = user.rows?.find((row) => row.label === 'profile')
    expect(profileRow?.collapsed).toBe(true)
    expect(profileRow?.value).toBe('{…} · 1')
    expect(layout.nodes.filter((node) => node.label === 'profile')).toHaveLength(0)
  })

  it('reports every represented field in the visible count', () => {
    const model = new JsonModel({ a: 1, b: 2, nested: { c: 3 } }, { expandDepth: 2 })
    const layout = layoutCompactGraph(model, model.expanded, { measure })
    expect(layout.visibleCount).toBe(5)
    expect(layout.nodes.length).toBe(2)
  })
})

describe('edgePath', () => {
  it('produces a cubic bezier from source to target', () => {
    const path = edgePath(10, 20, 100, 60)
    expect(path).toMatch(/^M 10 20 C /)
    expect(path.endsWith('100 60')).toBe(true)
  })

  it('keeps a minimum horizontal pull so short edges still curve', () => {
    expect(edgePath(0, 0, 4, 0)).toContain('18')
  })
})

describe('seedAutoCollapse', () => {
  it('opens everything when the document fits the budget', () => {
    const model = new JsonModel({ a: { b: { c: 1 } }, d: [1, 2] }, { expandDepth: 5 })
    expect(seedAutoCollapse(model, 100).size).toBe(0)
  })

  it('holds a wide array shut rather than drawing thousands of siblings', () => {
    const model = new JsonModel(
      { total: 4000, rows: Array.from({ length: 4000 }, (_, i) => ({ i })) },
      { expandDepth: 3 },
    )
    const collapsed = seedAutoCollapse(model, 100)
    expect(collapsed.size).toBe(1)
    const rowsId = model.childrenOf(0).find((id) => model.nodes[id].key === 'rows') as number
    expect(collapsed.has(rowsId)).toBe(true)
  })

  it('leaves the model expansion untouched', () => {
    const model = new JsonModel({ rows: Array.from({ length: 500 }, (_, i) => ({ i })) }, {
      expandDepth: 3,
    })
    const before = model.expanded.size
    seedAutoCollapse(model, 50)
    expect(model.expanded.size).toBe(before)
  })

  it('does not blow up on a top-level array wider than the budget', () => {
    const model = new JsonModel(Array.from({ length: 900 }, (_, i) => i), { expandDepth: 2 })
    expect(() => seedAutoCollapse(model, 100)).not.toThrow()
    expect(seedAutoCollapse(model, 100).size).toBe(0)
  })
})
