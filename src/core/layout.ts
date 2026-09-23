/**
 * Tidy-tree layout for the graph view.
 *
 * One box per JSON value, left to right: a node sits at `parent.x + parent.width + gapX`,
 * and its subtree occupies a vertical band as tall as the sum of its children's bands.
 * Simpler than Reingold–Tilford and indistinguishable for JSON, where subtrees are shallow
 * and wide.
 *
 * The algorithm is iterative end to end — a 5 000-level nested array would blow the call
 * stack, and deeply nested payloads are exactly when you want a graph.
 */
import type { JsonKind, JsonNode } from './types'
import { isContainer, primitiveText, type JsonModel } from './model'

export const GRAPH_NODE_H = 30
export const GRAPH_GAP_X = 64
export const GRAPH_GAP_Y = 12
/** Boxes drawn before the graph stops expanding. */
export const GRAPH_MAX_NODES = 900

export const COMPACT_CARD_HEADER_H = 34
export const COMPACT_CARD_ROW_H = 29

/** Left accent bar + inner padding, mirroring the node's CSS box. */
const PAD_LEFT = 16
const PAD_RIGHT = 12
/** Must match the node's CSS `gap`. */
const NODE_GAP = 7
/** The `:` between key and value, plus slack for its glyph. */
const COLON_W = 7
const SWATCH_W = 15
const MIN_WIDTH = 56
/** Node text is clipped in CSS too; this keeps the measured box honest. */
const MAX_VALUE_CHARS = 42
const MEASURE_SLACK = 5

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

export interface GraphNodeBox {
  id: number
  x: number
  y: number
  w: number
  h: number
  depth: number
  kind: JsonKind
  /** Object key, array index, or empty for a bare top-level scalar. */
  label: string
  /** Rendered after the label: the value, or `{…}` / `[…]` for a closed container. */
  value: string
  container: boolean
  collapsed: boolean
  /** True for array elements, which style their label differently from object keys. */
  indexed: boolean
  /** `#rrggbb`-ish strings get a colour chip next to them. */
  swatch: string | null
  /** Present in compact mode: direct properties rendered inside this container card. */
  rows?: GraphCardRow[]
}

export interface GraphCardRow {
  id: number
  label: string
  value: string
  kind: JsonKind
  container: boolean
  collapsed: boolean
  indexed: boolean
  swatch: string | null
}

export interface GraphEdge {
  key: string
  fromId: number
  toId: number
  x1: number
  y1: number
  x2: number
  y2: number
  /** Vertical anchors relative to the source and target card origins. */
  fromDy: number
  toDy: number
}

export interface GraphLayout {
  nodes: GraphNodeBox[]
  edges: GraphEdge[]
  width: number
  height: number
  /** Number of JSON values represented; compact cards can contain several rows. */
  visibleCount: number
  /** Set when the visible node count exceeded `maxNodes`. */
  truncated: boolean
}

export interface LayoutDeps {
  /** Text width in px for the node font. Injectable so the layout is testable headlessly. */
  measure: (text: string) => number
  nodeHeight?: number
  gapX?: number
  gapY?: number
  maxNodes?: number
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function labelOf(node: JsonNode): string {
  if (node.key !== null) return node.key
  if (node.index >= 0) return String(node.index)
  return ''
}

function markerFor(kind: JsonKind, open: boolean, count: number): string {
  const openChar = kind === 'array' ? '[' : '{'
  const closeChar = kind === 'array' ? ']' : '}'
  const marker = open ? `${openChar}${closeChar}` : `${openChar}…${closeChar}`
  return `${marker} · ${count}`
}

export function layoutGraph(
  model: JsonModel,
  expanded: ReadonlySet<number>,
  deps: LayoutDeps,
): GraphLayout {
  const nodeHeight = deps.nodeHeight ?? GRAPH_NODE_H
  const gapX = deps.gapX ?? GRAPH_GAP_X
  const gapY = deps.gapY ?? GRAPH_GAP_Y
  const maxNodes = deps.maxNodes ?? GRAPH_MAX_NODES

  /* 1. Collect visible nodes in DFS pre-order, honouring the expansion set.
   *
   * Unlike the tree view, the graph must draw the virtual JSON root. Without it every
   * top-level property starts a separate tree and the document reads as disconnected
   * islands. The root is therefore always visible and always open.
   */
  const order: number[] = []
  const children = new Map<number, number[]>()
  const stack: number[] = [0]

  let truncated = false
  while (stack.length) {
    if (order.length >= maxNodes) {
      truncated = true
      break
    }
    const id = stack.pop() as number
    order.push(id)
    const node = model.nodes[id]
    if (isContainer(node.kind) && (id === 0 || expanded.has(id))) {
      const kids = model.childrenOf(id)
      children.set(id, kids)
      for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i])
    }
  }

  /* 2. Measure every visible box. */
  const boxes = new Map<number, GraphNodeBox>()
  for (const id of order) {
    const node = model.nodes[id]
    const container = isContainer(node.kind)
    const open = container && (id === 0 || expanded.has(id))
    const label = id === 0 ? '$' : labelOf(node)
    const value = container
      ? markerFor(node.kind, open, model.sizeOf(id))
      : id === 0
        ? primitiveText(node.raw)
        : node.kind === 'string'
        ? truncate(node.text, MAX_VALUE_CHARS)
        : node.text

    const labelWidth = label ? deps.measure(label) + MEASURE_SLACK : 0
    const swatch = node.kind === 'string' && HEX_COLOR.test(node.text) ? node.text : null
    const valueWidth = deps.measure(value) + MEASURE_SLACK + (swatch ? SWATCH_W : 0)
    // Mirrors the node's flex row exactly: [padding][key][gap][:][gap][swatch][value][padding].
    // Every term has to be here — leaving the colon out was enough to clip long keys.
    const width = Math.max(
      MIN_WIDTH,
      PAD_LEFT +
        labelWidth +
        (label ? NODE_GAP + COLON_W + NODE_GAP : 0) +
        valueWidth +
        PAD_RIGHT,
    )

    boxes.set(id, {
      id,
      x: 0,
      y: 0,
      w: Math.round(width),
      h: nodeHeight,
      depth: node.depth,
      kind: node.kind,
      label,
      value,
      container,
      collapsed: id !== 0 && container && !open,
      indexed: node.key === null && node.index >= 0,
      swatch,
    })
  }

  // Hitting `maxNodes` cuts the walk short, which leaves children recorded against parents
  // whose own children were never measured. Drop those so the placement pass never walks
  // into a node that has no box.
  if (truncated) {
    for (const [id, kids] of [...children]) {
      const kept = kids.filter((kid) => boxes.has(kid))
      if (kept.length) children.set(id, kept)
      else children.delete(id)
    }
  }

  /* 3. Subtree band heights, bottom-up. Reversing a pre-order yields a valid post-order. */
  const band = new Map<number, number>()
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i]
    const box = boxes.get(id) as GraphNodeBox
    const kids = children.get(id)
    if (!kids || !kids.length) {
      band.set(id, box.h)
      continue
    }
    let total = 0
    for (const child of kids) total += (band.get(child) as number) + gapY
    band.set(id, Math.max(box.h, total - gapY))
  }

  /* 4. Assign positions, top-down. */
  const nodes: GraphNodeBox[] = []
  const frames: { id: number; x: number; top: number }[] = []
  if (boxes.has(0)) frames.push({ id: 0, x: 0, top: 0 })

  while (frames.length) {
    const { id, x, top } = frames.pop() as { id: number; x: number; top: number }
    const box = boxes.get(id) as GraphNodeBox
    const height = band.get(id) as number
    box.x = x
    box.y = top + (height - box.h) / 2
    nodes.push(box)

    const kids = children.get(id)
    if (!kids || !kids.length) continue
    const childX = x + box.w + gapX
    let cursor = top
    const next: { id: number; x: number; top: number }[] = []
    for (const child of kids) {
      next.push({ id: child, x: childX, top: cursor })
      cursor += (band.get(child) as number) + gapY
    }
    for (let i = next.length - 1; i >= 0; i--) frames.push(next[i])
  }

  /* 5. Edges, parent right-centre → child left-centre. */
  const edges: GraphEdge[] = []
  for (const box of nodes) {
    const parentId = model.nodes[box.id].parent
    if (parentId < 0) continue
    const parent = boxes.get(parentId)
    if (!parent) continue
    edges.push({
      key: `${parentId}-${box.id}`,
      fromId: parentId,
      toId: box.id,
      x1: parent.x + parent.w,
      y1: parent.y + parent.h / 2,
      x2: box.x,
      y2: box.y + box.h / 2,
      fromDy: parent.h / 2,
      toDy: box.h / 2,
    })
  }

  /* 6. Bounds, normalised so the layout always starts at the origin. */
  let width = 0
  let minY = Infinity
  for (const box of nodes) {
    if (box.x + box.w > width) width = box.x + box.w
    if (box.y < minY) minY = box.y
  }
  const shift = nodes.length ? -minY : 0
  if (shift !== 0) {
    for (const box of nodes) box.y += shift
    for (const edge of edges) {
      edge.y1 += shift
      edge.y2 += shift
    }
  }
  let height = 0
  for (const box of nodes) {
    if (box.y + box.h > height) height = box.y + box.h
  }

  return { nodes, edges, width, height, visibleCount: order.length, truncated }
}

/**
 * Object-card layout inspired by JSON Crack: one card represents one container and its
 * direct fields become rows inside it. Only expanded child containers become new cards,
 * so wide objects stay legible without turning every scalar into an island.
 */
export function layoutCompactGraph(
  model: JsonModel,
  expanded: ReadonlySet<number>,
  deps: LayoutDeps,
): GraphLayout {
  const gapX = deps.gapX ?? 76
  const gapY = deps.gapY ?? 18
  const maxNodes = deps.maxNodes ?? GRAPH_MAX_NODES
  const cards = new Map<number, GraphNodeBox>()
  const cardChildren = new Map<number, number[]>()
  const order: number[] = []
  const stack = [0]
  let visibleCount = 1
  let truncated = false

  while (stack.length) {
    const id = stack.pop() as number
    if (cards.has(id)) continue
    const node = model.nodes[id]
    const open = id === 0 || expanded.has(id)
    const direct = open ? model.childrenOf(id) : []
    const rows: GraphCardRow[] = []
    const nextCards: number[] = []

    for (const childId of direct) {
      if (visibleCount >= maxNodes) {
        truncated = true
        break
      }
      const child = model.nodes[childId]
      const container = isContainer(child.kind)
      const childOpen = container && expanded.has(childId)
      const label = labelOf(child)
      const value = container
        ? markerFor(child.kind, childOpen, model.sizeOf(childId))
        : child.kind === 'string'
          ? truncate(child.text, MAX_VALUE_CHARS)
          : child.text
      rows.push({
        id: childId,
        label,
        value,
        kind: child.kind,
        container,
        collapsed: container && !childOpen,
        indexed: child.key === null && child.index >= 0,
        swatch: child.kind === 'string' && HEX_COLOR.test(child.text) ? child.text : null,
      })
      visibleCount++
      if (childOpen) nextCards.push(childId)
    }

    let width = 190
    const cardLabel = id === 0 ? '$' : labelOf(node)
    const cardValue = isContainer(node.kind)
      ? markerFor(node.kind, true, model.sizeOf(id))
      : primitiveText(node.raw)
    width = Math.max(width, deps.measure(`${cardLabel}  ${cardValue}`) + 32)
    for (const row of rows) {
      const swatchWidth = row.swatch ? SWATCH_W : 0
      width = Math.max(width, deps.measure(`${row.label}  ${row.value}`) + 34 + swatchWidth)
    }
    width = Math.min(380, Math.ceil(width))

    cards.set(id, {
      id,
      x: 0,
      y: 0,
      w: width,
      h: COMPACT_CARD_HEADER_H + Math.max(1, rows.length) * COMPACT_CARD_ROW_H,
      depth: node.depth,
      kind: node.kind,
      label: cardLabel,
      value: cardValue,
      container: isContainer(node.kind),
      collapsed: false,
      indexed: node.key === null && node.index >= 0,
      swatch: null,
      rows,
    })
    order.push(id)
    cardChildren.set(id, nextCards)
    for (let i = nextCards.length - 1; i >= 0; i--) stack.push(nextCards[i])
  }

  const band = new Map<number, number>()
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i]
    const box = cards.get(id) as GraphNodeBox
    const kids = cardChildren.get(id) ?? []
    if (!kids.length) {
      band.set(id, box.h)
      continue
    }
    let total = 0
    for (const child of kids) total += (band.get(child) ?? 0) + gapY
    band.set(id, Math.max(box.h, total - gapY))
  }

  const nodes: GraphNodeBox[] = []
  const frames: { id: number; x: number; top: number }[] = [{ id: 0, x: 0, top: 0 }]
  while (frames.length) {
    const { id, x, top } = frames.pop() as { id: number; x: number; top: number }
    const box = cards.get(id)
    if (!box) continue
    const height = band.get(id) ?? box.h
    box.x = x
    box.y = top + (height - box.h) / 2
    nodes.push(box)

    const kids = cardChildren.get(id) ?? []
    let cursor = top
    const next: { id: number; x: number; top: number }[] = []
    for (const child of kids) {
      next.push({ id: child, x: x + box.w + gapX, top: cursor })
      cursor += (band.get(child) ?? 0) + gapY
    }
    for (let i = next.length - 1; i >= 0; i--) frames.push(next[i])
  }

  const edges: GraphEdge[] = []
  for (const child of nodes) {
    if (child.id === 0) continue
    const parentId = model.nodes[child.id].parent
    const parent = cards.get(parentId)
    if (!parent) continue
    const rowIndex = parent.rows?.findIndex((row) => row.id === child.id) ?? -1
    const fromDy = rowIndex >= 0
      ? COMPACT_CARD_HEADER_H + rowIndex * COMPACT_CARD_ROW_H + COMPACT_CARD_ROW_H / 2
      : parent.h / 2
    const toDy = COMPACT_CARD_HEADER_H / 2
    edges.push({
      key: `${parentId}-${child.id}`,
      fromId: parentId,
      toId: child.id,
      x1: parent.x + parent.w,
      y1: parent.y + fromDy,
      x2: child.x,
      y2: child.y + toDy,
      fromDy,
      toDy,
    })
  }

  let width = 0
  let minY = Infinity
  for (const box of nodes) {
    width = Math.max(width, box.x + box.w)
    minY = Math.min(minY, box.y)
  }
  const shift = nodes.length ? -minY : 0
  if (shift) {
    for (const box of nodes) box.y += shift
    for (const edge of edges) {
      edge.y1 += shift
      edge.y2 += shift
    }
  }
  let height = 0
  for (const box of nodes) height = Math.max(height, box.y + box.h)

  return { nodes, edges, width, height, visibleCount, truncated }
}

/** Cubic bezier from a parent's right edge to a child's left edge. */
export function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.max(18, (x2 - x1) * 0.5)
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
}

/** Nodes the graph is willing to draw before it starts withholding expansion. */
export const GRAPH_BUDGET = 400

/**
 * The graph's opening view for a document, given the user's expansion state.
 *
 * A tree tolerates a fully expanded 4 000-row array — it is just a long list you scroll.
 * A graph does not: the same document becomes a 38 000 px column that only fits at 10 %
 * zoom, i.e. an illegible line. So the graph opens breadth-first and stops opening nodes
 * once the drawing would pass the budget, returning the ids to treat as collapsed.
 *
 * This is deliberately a *view-level* decision: `model.expanded` is untouched, the tree
 * keeps whatever the user had, and any explicit toggle on a node listed here clears it.
 */
export function seedAutoCollapse(model: JsonModel, budget = GRAPH_BUDGET): Set<number> {
  const collapsed = new Set<number>()
  const roots = model.childrenOf(0)
  if (roots.length > budget) return collapsed

  const queue: number[] = [...roots]
  let visible = roots.length
  let head = 0

  while (head < queue.length) {
    const id = queue[head++]
    const node = model.nodes[id]
    if (!isContainer(node.kind) || !model.isExpanded(id)) continue

    const kids = model.childrenOf(id)
    if (visible + kids.length > budget) {
      collapsed.add(id)
      continue
    }
    visible += kids.length
    for (const child of kids) queue.push(child)
  }

  return collapsed
}
