import type { JsonKind, JsonNode, ViewerStats } from './types'

/** Hard ceiling on rows handed to the virtualiser — beyond this the browser, not the user, is the bottleneck. */
export const MAX_ROWS = 150_000
/** Ceiling on materialised nodes. Keeps a pathological 500 MB payload from locking up the tab. */
export const DEFAULT_MAX_NODES = 300_000
const MAX_MATCHES = 5_000
const MAX_PRIMITIVE_TEXT = 4_096

export function kindOf(value: unknown): JsonKind {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  switch (typeof value) {
    case 'object':
      return 'object'
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    default:
      return 'null'
  }
}

export function primitiveText(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string') {
    return value.length > MAX_PRIMITIVE_TEXT ? value.slice(0, MAX_PRIMITIVE_TEXT) : value
  }
  return String(value)
}

export function isContainer(kind: JsonKind): boolean {
  return kind === 'object' || kind === 'array'
}

export interface SearchOptions {
  query: string
  regex: boolean
  caseSensitive: boolean
  matchKeys: boolean
  matchValues: boolean
}

export interface SearchOutcome {
  ids: number[]
  truncated: boolean
  ms: number
}

export interface ModelOptions {
  sortKeys?: boolean
  /** Expand every node shallower than this. `1` reveals the top level plus one level in. */
  expandDepth?: number
  maxNodes?: number
}

/**
 * A lazily-materialised, flattened JSON tree.
 *
 * Children are built on first access rather than up front, so opening a 40 MB payload
 * costs one `JSON.parse` and nothing else until the user actually drills in. The flat
 * `nodes` array plus an explicit-stack walk keeps the hot path (recomputing visible rows
 * after a toggle) allocation-light and free of recursion limits.
 */
export class JsonModel {
  readonly nodes: JsonNode[] = []
  /** Nodes the user has opened. Mutated in place; `version` is what React watches. */
  readonly expanded = new Set<number>()
  version = 0
  maxDepth = 0
  /** Set when `maxNodes` cut materialisation short. */
  nodeLimitHit = false
  /** Set when the visible-row list hit `MAX_ROWS`. */
  rowLimitHit = false

  private readonly maxNodes: number
  private readonly sortKeys: boolean
  private rowCache: { version: number; rows: number[] } | null = null
  private filterCache: { key: string; rows: number[] } | null = null

  constructor(
    readonly value: unknown,
    opts: ModelOptions = {},
  ) {
    this.sortKeys = opts.sortKeys ?? false
    this.maxNodes = opts.maxNodes ?? DEFAULT_MAX_NODES

    this.nodes.push({
      id: 0,
      parent: -1,
      key: null,
      index: -1,
      kind: kindOf(value),
      depth: -1,
      isLast: true,
      size: -1,
      children: null,
      raw: value,
      text: '',
    })

    // A top-level scalar has no members to expand into, so give the virtual root a single
    // child to render instead of an empty tree.
    if (!isContainer(this.nodes[0].kind)) {
      this.nodes.push({
        id: 1,
        parent: 0,
        key: null,
        index: -1,
        kind: this.nodes[0].kind,
        depth: 0,
        isLast: true,
        size: 0,
        children: [],
        raw: value,
        text: primitiveText(value),
      })
      this.nodes[0].children = [1]
      this.nodes[0].size = 1
      this.maxDepth = 0
    }

    const depth = Math.max(0, opts.expandDepth ?? 1)
    if (depth > 0) this.expandToDepth(depth)
  }

  /* ------------------------------------------------------------ traversal -- */

  childrenOf(id: number): number[] {
    const node = this.nodes[id]
    if (node.children === null) this.materialize(node)
    return node.children as number[]
  }

  /**
   * Child count without building the children. Rendering a collapsed row needs the count
   * for its `{ … } 12 keys` preview, and paying a full materialisation just for that would
   * throw away the point of lazy children.
   */
  sizeOf(id: number): number {
    const node = this.nodes[id]
    if (node.size >= 0) return node.size
    if (!isContainer(node.kind)) return 0
    const raw = node.raw
    node.size = Array.isArray(raw) ? raw.length : Object.keys(raw as object).length
    return node.size
  }

  private materialize(node: JsonNode): void {
    const raw = node.raw
    if (!isContainer(node.kind)) {
      node.children = []
      node.size = 0
      return
    }

    let keys: string[] | null = null
    let count: number
    if (Array.isArray(raw)) {
      count = raw.length
    } else {
      keys = Object.keys(raw as Record<string, unknown>)
      if (this.sortKeys) keys.sort()
      count = keys.length
    }
    node.size = count

    const budget = this.maxNodes - this.nodes.length
    const take = Math.max(0, Math.min(count, budget))
    if (take < count) this.nodeLimitHit = true

    const depth = node.depth + 1
    if (depth > this.maxDepth) this.maxDepth = depth

    const children: number[] = new Array(take)
    for (let i = 0; i < take; i++) {
      const key = keys ? keys[i] : null
      const value = keys ? (raw as Record<string, unknown>)[keys[i]] : (raw as unknown[])[i]
      const kind = kindOf(value)
      const id = this.nodes.length
      children[i] = id
      this.nodes.push({
        id,
        parent: node.id,
        key,
        index: keys ? -1 : i,
        kind,
        depth,
        isLast: i === count - 1,
        size: -1,
        children: isContainer(kind) ? null : ([] as number[]),
        raw: value,
        text: isContainer(kind) ? '' : primitiveText(value),
      })
    }
    node.children = children
  }

  /**
   * The flat list of currently visible rows. Recomputed only when `version` changes.
   */
  visibleRows(): number[] {
    if (this.rowCache && this.rowCache.version === this.version) return this.rowCache.rows

    const rows: number[] = []
    const stack: number[] = []
    const roots = this.childrenOf(0)
    for (let i = roots.length - 1; i >= 0; i--) stack.push(roots[i])

    while (stack.length) {
      if (rows.length >= MAX_ROWS) {
        this.rowLimitHit = true
        break
      }
      const id = stack.pop() as number
      rows.push(id)
      const node = this.nodes[id]
      if (isContainer(node.kind) && this.expanded.has(id)) {
        const kids = this.childrenOf(id)
        for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i])
      }
    }

    this.rowCache = { version: this.version, rows }
    return rows
  }

  /**
   * Rows for "only matches" mode: every match plus the ancestors needed to place it,
   * preserving the tree's indentation instead of flattening to a plain hit list.
   */
  rowsForMatches(matchIds: readonly number[]): number[] {
    const key = `${this.version}:${matchIds.length}:${matchIds[0] ?? -1}:${matchIds[matchIds.length - 1] ?? -1}`
    if (this.filterCache && this.filterCache.key === key) return this.filterCache.rows

    const keep = new Set<number>()
    for (const id of matchIds) {
      let p: number = id
      while (p >= 0 && !keep.has(p)) {
        keep.add(p)
        p = this.nodes[p].parent
      }
    }

    const rows: number[] = []
    const stack: number[] = []
    const roots = this.childrenOf(0)
    for (let i = roots.length - 1; i >= 0; i--) stack.push(roots[i])

    while (stack.length) {
      if (rows.length >= MAX_ROWS) {
        this.rowLimitHit = true
        break
      }
      const id = stack.pop() as number
      if (!keep.has(id)) continue
      rows.push(id)
      if (isContainer(this.nodes[id].kind)) {
        const kids = this.childrenOf(id)
        for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i])
      }
    }

    this.filterCache = { key, rows }
    return rows
  }

  /* -------------------------------------------------------------- expand -- */

  isExpanded(id: number): boolean {
    return this.expanded.has(id)
  }

  toggle(id: number): void {
    if (!isContainer(this.nodes[id].kind)) return
    if (this.expanded.has(id)) this.expanded.delete(id)
    else this.expanded.add(id)
    this.version++
  }

  expand(id: number): void {
    if (this.expanded.has(id)) return
    if (!isContainer(this.nodes[id].kind)) return
    this.expanded.add(id)
    this.version++
  }

  collapse(id: number): void {
    if (this.expanded.delete(id)) this.version++
  }

  /** Opens every ancestor of `id` so the row becomes reachable. */
  reveal(id: number): void {
    let p = this.nodes[id]?.parent ?? -1
    let changed = false
    while (p > 0) {
      if (!this.expanded.has(p)) {
        this.expanded.add(p)
        changed = true
      }
      p = this.nodes[p].parent
    }
    if (changed) this.version++
  }

  expandAll(limit = MAX_ROWS): void {
    const stack: number[] = []
    const roots = this.childrenOf(0)
    for (let i = roots.length - 1; i >= 0; i--) stack.push(roots[i])

    let seen = 0
    while (stack.length) {
      const id = stack.pop() as number
      if (++seen > limit) {
        this.rowLimitHit = true
        break
      }
      const node = this.nodes[id]
      if (!isContainer(node.kind)) continue
      this.expanded.add(id)
      const kids = this.childrenOf(id)
      for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i])
    }
    this.version++
  }

  collapseAll(): void {
    this.expanded.clear()
    this.version++
  }

  /** Opens every node shallower than `depth`. */
  expandToDepth(depth: number): void {
    const stack: number[] = []
    const roots = this.childrenOf(0)
    for (let i = roots.length - 1; i >= 0; i--) stack.push(roots[i])

    let seen = 0
    while (stack.length) {
      const id = stack.pop() as number
      if (++seen > MAX_ROWS) {
        this.rowLimitHit = true
        break
      }
      const node = this.nodes[id]
      if (!isContainer(node.kind)) continue
      if (node.depth >= depth) continue
      this.expanded.add(id)
      const kids = this.childrenOf(id)
      for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i])
    }
    this.version++
  }

  /* --------------------------------------------------------------- paths -- */

  pathOf(id: number): (string | number)[] {
    const out: (string | number)[] = []
    let node: JsonNode | undefined = this.nodes[id]
    while (node && node.parent >= 0) {
      out.push(node.index >= 0 ? node.index : (node.key as string))
      node = this.nodes[node.parent]
    }
    return out.reverse()
  }

  /* -------------------------------------------------------------- search -- */

  search(opts: SearchOptions): SearchOutcome {
    const t0 = performance.now()
    const test = makeMatcher(opts)
    if (!test) return { ids: [], truncated: false, ms: 0 }

    const ids: number[] = []
    const stack: number[] = []
    const roots = this.childrenOf(0)
    for (let i = roots.length - 1; i >= 0; i--) stack.push(roots[i])

    let truncated = false
    while (stack.length) {
      const id = stack.pop() as number
      const node = this.nodes[id]
      let hit = false
      if (opts.matchKeys && node.key !== null && test(node.key)) hit = true
      if (!hit && opts.matchValues && !isContainer(node.kind) && test(node.text)) hit = true

      if (hit) {
        ids.push(id)
        if (ids.length >= MAX_MATCHES) {
          truncated = true
          break
        }
      }
      if (isContainer(node.kind)) {
        const kids = this.childrenOf(id)
        for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i])
      }
    }

    return { ids, truncated, ms: performance.now() - t0 }
  }

  /* --------------------------------------------------------------- misc -- */

  stats(bytes: number, ms: number): ViewerStats {
    return {
      bytes,
      nodes: this.nodes.length,
      depth: Math.max(0, this.maxDepth),
      ms,
      rootKind: this.nodes[0].kind,
    }
  }
}

export function makeMatcher(opts: SearchOptions): ((text: string) => boolean) | null {
  const query = opts.query
  if (!query) return null

  if (opts.regex) {
    let re: RegExp
    try {
      re = new RegExp(query, opts.caseSensitive ? 'g' : 'gi')
    } catch {
      return null
    }
    return (text: string) => {
      re.lastIndex = 0
      return re.test(text)
    }
  }

  if (opts.caseSensitive) return (text: string) => text.includes(query)
  const needle = query.toLowerCase()
  return (text: string) => text.toLowerCase().includes(needle)
}

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/

/** Renders a path as a JSONPath expression, e.g. `$.data.items[0].id`. */
export function pathToString(path: readonly (string | number)[]): string {
  let out = '$'
  for (const seg of path) {
    if (typeof seg === 'number') out += `[${seg}]`
    else if (IDENT_RE.test(seg)) out += `.${seg}`
    else out += `['${seg.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}']`
  }
  return out
}
