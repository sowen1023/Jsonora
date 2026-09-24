import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { JsonKind } from '@/core/types'
import type { JsonModel } from '@/core/model'
import type { CodeFont } from '@/platform/settings'
import {
  COMPACT_CARD_HEADER_H,
  COMPACT_CARD_ROW_H,
  GRAPH_BUDGET,
  GRAPH_MAX_NODES,
  edgePath,
  layoutCompactGraph,
  layoutGraph,
  seedAutoCollapse,
  type GraphLayout,
  type GraphNodeBox,
} from '@/core/layout'
import { createTextMeasure, easeOut } from './measure'
import { ensureCodeFonts } from './codeFonts'
import { Highlighted } from './Highlighted'
import { Cards, Fit, Graph, Grid, Minus, Plus } from './Icons'
import { useI18n } from './i18n'

const MIN_SCALE = 0.1
const MAX_SCALE = 2.5
const FIT_PADDING = 44
/** Below roughly a third, card text is illegible — better to show the top of the drawing. */
const FIT_MIN_SCALE = 0.32
const LAYOUT_MS = 320
/** Above this many cards the re-layout tween is dropped — it would cost more than it shows. */
const ANIMATE_LIMIT = 400

const ACCENT: Record<JsonKind, string> = {
  object: 'var(--accent)',
  array: 'var(--accent)',
  string: 'var(--t-string)',
  number: 'var(--t-number)',
  boolean: 'var(--t-bool)',
  null: 'var(--t-null)',
}

interface View {
  x: number
  y: number
  k: number
}

export interface GraphViewProps {
  model: JsonModel
  /** Bumped whenever the expansion set changes; drives re-layout. */
  expandSeq: number
  selected: number | null
  currentHitId: number | null
  hitSet: Set<number>
  query: string
  regex: boolean
  caseSensitive: boolean
  animate: boolean
  fontSize: number
  fontFamily: CodeFont
  showGrid: boolean
  showGridControl?: boolean
  compactGraph: boolean
  showStyleControl?: boolean
  onToggleGrid: () => void
  onToggleCompactGraph: () => void
  onToggle: (id: number) => void
  onSelect: (id: number) => void
  onOpen: (id: number) => void
}

export function GraphView(props: GraphViewProps) {
  const { t } = useI18n()
  const { model, expandSeq, fontSize, fontFamily } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const edgeRefs = useRef(new Map<string, SVGPathElement>())
  const viewRef = useRef<View>({ x: 0, y: 0, k: 1 })
  const dragRef = useRef<{ px: number; py: number; vx: number; vy: number } | null>(null)
  const prevLayout = useRef<GraphLayout | null>(null)
  const centeredFor = useRef<string | null>(null)
  const previousCompactLayout = useRef<GraphLayout | null>(null)
  const [zoom, setZoom] = useState(100)
  const [dragging, setDragging] = useState(false)
  const [hint, setHint] = useState(true)
  const [autoSeq, setAutoSeq] = useState(0)
  const [fontLoadSeq, setFontLoadSeq] = useState(0)

  useEffect(() => {
    let alive = true
    void ensureCodeFonts().then(() => {
      if (alive) setFontLoadSeq((value) => value + 1)
    })
    return () => { alive = false }
  }, [])

  /**
   * Cards the graph is holding shut so the opening view stays legible. Recomputed per
   * document; an explicit toggle on one of them drops it from the set.
   */
  const autoRef = useRef<{ model: JsonModel | null; set: Set<number> }>({
    model: null,
    set: new Set(),
  })
  if (autoRef.current.model !== model) {
    autoRef.current = { model, set: seedAutoCollapse(model, GRAPH_BUDGET) }
  }
  const autoClosed = autoRef.current.set

  const expandedSet = useMemo(() => {
    if (!autoClosed.size) return model.expanded
    const set = new Set<number>()
    for (const id of model.expanded) if (!autoClosed.has(id)) set.add(id)
    return set
  }, [model, autoClosed, autoSeq, expandSeq])

  const layout = useMemo(() => {
    // `expandSeq` / `autoSeq` are the change signals for in-place set mutation.
    const measure = createTextMeasure(Math.max(10, fontSize - 1), fontFamily)
    const makeLayout = props.compactGraph ? layoutCompactGraph : layoutGraph
    return makeLayout(model, expandedSet, { measure, maxNodes: GRAPH_MAX_NODES })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, expandedSet, expandSeq, autoSeq, fontSize, fontFamily, fontLoadSeq, props.compactGraph])

  const selectedPath = useMemo(() => {
    const path = new Set<number>()
    let id = props.selected
    while (id != null && id >= 0) {
      path.add(id)
      id = model.nodes[id]?.parent ?? 0
    }
    return path
  }, [model, props.selected])

  const handleToggle = useCallback(
    (id: number) => {
      // A node the graph is holding shut opens first; anything else defers to the model.
      if (autoClosed.has(id)) {
        autoClosed.delete(id)
        setAutoSeq((v) => v + 1)
        return
      }
      props.onToggle(id)
    },
    [autoClosed, props],
  )

  /* ------------------------------------------------------------- viewport -- */

  const applyView = useCallback((view: View) => {
    const el = canvasRef.current
    if (el) el.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.k})`
    const backdrop = containerRef.current
    if (backdrop) {
      // Keep the quiet canvas pattern anchored to the graph as it pans and zooms.
      // At low zoom, skip world-grid levels that would crowd the screen.
      const rawStep = 24 * view.k
      const multiplier = rawStep < 18 ? 2 ** Math.ceil(Math.log2(18 / rawStep)) : 1
      const step = rawStep * multiplier
      backdrop.style.setProperty('--grid-step', `${step}px`)
      backdrop.style.setProperty('--grid-major-step', `${step * 6}px`)
      backdrop.style.setProperty('--grid-x', `${view.x}px`)
      backdrop.style.setProperty('--grid-y', `${view.y}px`)
    }
  }, [])

  const commit = useCallback(
    (next: View) => {
      const previous = viewRef.current
      viewRef.current = next
      applyView(next)
      const percent = Math.round(next.k * 100)
      if (percent !== Math.round(previous.k * 100)) setZoom(percent)
    },
    [applyView],
  )

  const zoomAt = useCallback(
    (factor: number, px: number, py: number) => {
      const view = viewRef.current
      const k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.k * factor))
      const ratio = k / view.k
      commit({ k, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio })
    },
    [commit],
  )

  const zoomCentre = useCallback(
    (factor: number) => {
      const el = containerRef.current
      if (el) zoomAt(factor, el.clientWidth / 2, el.clientHeight / 2)
    },
    [zoomAt],
  )

  const fitRef = useRef(() => undefined as void)
  fitRef.current = () => {
    const el = containerRef.current
    if (!el || !layout.nodes.length || !el.clientWidth) return

    const raw = Math.min(
      (el.clientWidth - FIT_PADDING * 2) / layout.width,
      (el.clientHeight - FIT_PADDING * 2) / layout.height,
    )
    const k = Math.min(1.1, Math.max(FIT_MIN_SCALE, raw))
    const width = layout.width * k
    const height = layout.height * k
    // When the drawing still overflows, anchor it to the top-left rather than centring a
    // viewport on empty space.
    commit({
      k,
      x: width > el.clientWidth ? FIT_PADDING : (el.clientWidth - width) / 2,
      y: height > el.clientHeight ? FIT_PADDING : (el.clientHeight - height) / 2,
    })
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setHint(false), 5000)
    return () => window.clearTimeout(timer)
  }, [])

  /* Fit on mount and when a new document arrives — not on every expand. */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let frame = 0
    let tries = 0
    const attempt = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        fitRef.current()
        return
      }
      if (++tries > 30) return
      frame = requestAnimationFrame(attempt)
    }
    frame = requestAnimationFrame(attempt)
    return () => cancelAnimationFrame(frame)
  }, [model, props.compactGraph])

  /* Opening a compact card should reveal it without shrinking the entire drawing. */
  useEffect(() => {
    if (!props.compactGraph) {
      previousCompactLayout.current = null
      return
    }
    const previous = previousCompactLayout.current
    previousCompactLayout.current = layout
    if (!previous || props.selected == null) return
    const opened = layout.nodes.find((node) => node.id === props.selected)
    if (!opened || previous.nodes.some((node) => node.id === opened.id)) return

    const frame = requestAnimationFrame(() => {
      const el = containerRef.current
      if (!el) return
      const view = viewRef.current
      const margin = 28
      const left = opened.x * view.k + view.x
      const right = (opened.x + opened.w) * view.k + view.x
      const top = opened.y * view.k + view.y
      const bottom = (opened.y + opened.h) * view.k + view.y
      let x = view.x
      let y = view.y

      if (opened.w * view.k + margin * 2 > el.clientWidth) x = margin - opened.x * view.k
      else if (left < margin) x += margin - left
      else if (right > el.clientWidth - margin) x -= right - (el.clientWidth - margin)

      if (opened.h * view.k + margin * 2 > el.clientHeight) y = margin - opened.y * view.k
      else if (top < margin) y += margin - top
      else if (bottom > el.clientHeight - margin) y -= bottom - (el.clientHeight - margin)

      if (x !== view.x || y !== view.y) commit({ ...view, x, y })
    })
    return () => cancelAnimationFrame(frame)
  }, [props.compactGraph, props.selected, layout, commit])

  /* Wheel zooms around the cursor. Registered manually so it can be non-passive. */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0024))
      zoomAt(factor, event.clientX - rect.left, event.clientY - rect.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  /* Drag the background to pan. */
  const onPointerDown = useCallback((event: PointerEvent) => {
    if (event.button !== 0) return
    if ((event.target as HTMLElement).closest('.jr-gnode, .jr-gcard')) return
    const view = viewRef.current
    dragRef.current = { px: event.clientX, py: event.clientY, vx: view.x, vy: view.y }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    setDragging(true)
  }, [])

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      commit({
        ...viewRef.current,
        x: drag.vx + (event.clientX - drag.px),
        y: drag.vy + (event.clientY - drag.py),
      })
    },
    [commit],
  )

  const endDrag = useCallback((event: PointerEvent) => {
    if (!dragRef.current) return
    dragRef.current = null
    setDragging(false)
    try {
      ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
    } catch {
      /* pointer already gone */
    }
  }, [])

  /* --------------------------------------------------------------- edges -- */

  /**
   * Cards animate through a CSS transition on `transform`; edges have to be tweened by
   * hand because an SVG `d` attribute is not transitionable. Both use the same duration
   * and curve so they stay in step — and doing it imperatively keeps the card list out of
   * the render loop.
   */
  useLayoutEffect(() => {
    const previous = prevLayout.current
    prevLayout.current = layout

    const valid = new Set(layout.edges.map((edge) => edge.key))
    for (const key of [...edgeRefs.current.keys()]) {
      if (!valid.has(key)) edgeRefs.current.delete(key)
    }

    const to = new Map(layout.nodes.map((node) => [node.id, node]))
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    const paint = (t: number, from: Map<number, GraphNodeBox> | null) => {
      for (const edge of layout.edges) {
        const path = edgeRefs.current.get(edge.key)
        if (!path) continue
        const target = to.get(edge.toId)
        const source = to.get(edge.fromId)
        if (!target || !source) continue
        const sx = from ? lerp(from.get(edge.fromId)?.x ?? source.x, source.x, t) : source.x
        const sy = from ? lerp(from.get(edge.fromId)?.y ?? source.y, source.y, t) : source.y
        const tx = from ? lerp(from.get(edge.toId)?.x ?? target.x, target.x, t) : target.x
        const ty = from ? lerp(from.get(edge.toId)?.y ?? target.y, target.y, t) : target.y
        path.setAttribute('d', edgePath(sx + source.w, sy + edge.fromDy, tx, ty + edge.toDy))
      }
    }

    const animatable =
      props.animate &&
      previous !== null &&
      previous.nodes.length <= ANIMATE_LIMIT &&
      layout.nodes.length <= ANIMATE_LIMIT

    if (!animatable) {
      paint(1, null)
      return
    }

    const from = new Map((previous as GraphLayout).nodes.map((node) => [node.id, node]))
    const started = performance.now()
    let frame = 0
    const step = () => {
      const t = Math.min(1, (performance.now() - started) / LAYOUT_MS)
      paint(easeOut(t), from)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [layout, props.animate])

  /* Recentre when search navigation moves to a different hit. */
  useEffect(() => {
    const id = props.currentHitId
    if (id == null) return
    const hitKey = `${props.compactGraph ? 'cards' : 'nodes'}:${id}`
    if (centeredFor.current === hitKey) return
    const el = containerRef.current
    if (!el) return
    const owner = layout.nodes.find((node) => node.id === id || node.rows?.some((row) => row.id === id))
    if (!owner) return
    centeredFor.current = hitKey
    const rowIndex = owner.rows?.findIndex((row) => row.id === id) ?? -1
    const targetY = rowIndex < 0
      ? owner.y + owner.h / 2
      : owner.y + COMPACT_CARD_HEADER_H + rowIndex * COMPACT_CARD_ROW_H + COMPACT_CARD_ROW_H / 2
    const view = viewRef.current
    commit({
      ...view,
      x: el.clientWidth / 2 - (owner.x + owner.w / 2) * view.k,
      y: el.clientHeight / 2 - targetY * view.k,
    })
  }, [props.currentHitId, props.compactGraph, layout, commit])

  const setEdgeRef = useCallback((el: SVGPathElement | null) => {
    if (!el) return
    const key = el.getAttribute('data-key')
    if (key) edgeRefs.current.set(key, el)
  }, [])

  const { selected, currentHitId, hitSet, query, regex, caseSensitive } = props

  return (
    <div
      class={`jr-graph${dragging ? ' is-dragging' : ''}${props.showGrid ? ' is-grid' : ''}${props.compactGraph ? ' is-compact-graph' : ''}`}
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div class="jr-graph-canvas" ref={canvasRef}>
        <svg
          class="jr-graph-edges"
          width={Math.max(1, layout.width)}
          height={Math.max(1, layout.height)}
          aria-hidden="true"
        >
          {layout.edges.map((edge) => (
            <path
              key={edge.key}
              data-key={edge.key}
              ref={setEdgeRef}
              d={edgePath(edge.x1, edge.y1, edge.x2, edge.y2)}
              class={
                selectedPath.has(edge.fromId) && selectedPath.has(edge.toId)
                  ? 'jr-gedge is-active'
                  : 'jr-gedge'
              }
            />
          ))}
        </svg>

        {layout.nodes.map((node) => {
          const isCurrent = currentHitId === node.id
          if (node.rows) {
            const cardSelected = selected === node.id || node.rows.some((row) => row.id === selected)
            const cardHit = hitSet.has(node.id) || node.rows.some((row) => hitSet.has(row.id))
            const cardCurrent = isCurrent || node.rows.some((row) => row.id === currentHitId)
            return (
              <div
                key={node.id}
                class={`jr-gcard${node.id === 0 ? ' is-root' : ''}${cardSelected ? ' is-selected' : ''}${cardHit ? ' is-hit' : ''}${cardCurrent ? ' is-current' : ''}`}
                style={{
                  transform: `translate(${node.x}px, ${node.y}px)`,
                  width: `${node.w}px`,
                  height: `${node.h}px`,
                  '--node-accent': ACCENT[node.kind],
                }}
              >
                <button
                  class="jr-gcard-head"
                  type="button"
                  title={node.label || node.value}
                  onClick={(event) => {
                    event.stopPropagation()
                    props.onSelect(node.id)
                    if (node.container && node.id !== 0) handleToggle(node.id)
                  }}
                  onDblClick={(event) => {
                    event.stopPropagation()
                    props.onOpen(node.id)
                  }}
                >
                  <Highlighted
                    text={node.label}
                    query={query}
                    regex={regex}
                    caseSensitive={caseSensitive}
                    current={isCurrent}
                    class="jr-gcard-title"
                  />
                  <span class="jr-gcard-kind">{node.value}</span>
                </button>
                {node.rows.length ? node.rows.map((row) => {
                  const rowCurrent = currentHitId === row.id
                  return (
                    <button
                      key={row.id}
                      class={`jr-gcard-row${selected === row.id ? ' is-selected' : ''}${hitSet.has(row.id) ? ' is-hit' : ''}${rowCurrent ? ' is-current' : ''}${row.container ? ' is-container' : ''}`}
                      type="button"
                      title={`${row.label}: ${row.value}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        props.onSelect(row.id)
                        if (row.container) handleToggle(row.id)
                      }}
                      onDblClick={(event) => {
                        event.stopPropagation()
                        props.onOpen(row.id)
                      }}
                    >
                      <Highlighted
                        text={row.label}
                        query={query}
                        regex={regex}
                        caseSensitive={caseSensitive}
                        current={rowCurrent}
                        class={row.indexed ? 'jr-gcard-key is-index' : 'jr-gcard-key'}
                      />
                      <span class="jr-gcard-colon">:</span>
                      {row.swatch && (
                        <span class="jr-swatch" style={{ background: row.swatch }} aria-hidden="true" />
                      )}
                      <span class="jr-gcard-value" data-kind={row.kind}>
                        <Highlighted
                          text={row.value}
                          query={query}
                          regex={regex}
                          caseSensitive={caseSensitive}
                          current={rowCurrent}
                        />
                      </span>
                    </button>
                  )
                }) : <div class="jr-gcard-empty">{node.kind === 'array' ? '[ ]' : '{ }'}</div>}
              </div>
            )
          }
          const classes = ['jr-gnode']
          if (node.id === 0) classes.push('is-root')
          if (node.container) classes.push('is-container')
          if (node.collapsed) classes.push('is-collapsed')
          if (selected === node.id) classes.push('is-selected')
          if (hitSet.has(node.id)) classes.push('is-hit')
          if (isCurrent) classes.push('is-current')
          return (
            <div
              key={node.id}
              class={classes.join(' ')}
              style={{
                transform: `translate(${node.x}px, ${node.y}px)`,
                width: `${node.w}px`,
                height: `${node.h}px`,
                '--node-accent': ACCENT[node.kind],
              }}
              title={node.label || node.value}
              onClick={(event) => {
                event.stopPropagation()
                props.onSelect(node.id)
                if (node.container && node.id !== 0) handleToggle(node.id)
              }}
              onDblClick={(event) => {
                event.stopPropagation()
                props.onOpen(node.id)
              }}
            >
              {node.label && (
                <>
                  <Highlighted
                    text={node.label}
                    query={query}
                    regex={regex}
                    caseSensitive={caseSensitive}
                    current={isCurrent}
                    class={node.indexed ? 'jr-gnode-key is-index' : 'jr-gnode-key'}
                  />
                  <span class="jr-gnode-colon">:</span>
                </>
              )}
              {node.swatch && (
                <span class="jr-swatch" style={{ background: node.swatch }} aria-hidden="true" />
              )}
              <span class="jr-gnode-value" data-kind={node.kind}>
                <Highlighted
                  text={node.value}
                  query={query}
                  regex={regex}
                  caseSensitive={caseSensitive}
                  current={isCurrent}
                />
              </span>
            </div>
          )
        })}
      </div>

      {!layout.nodes.length && <div class="jr-graph-hint">{t('graphEmpty')}</div>}
      {hint && layout.nodes.length > 0 && (
        <div class="jr-graph-hint">{t('graphHint')}</div>
      )}

      <div class="jr-graph-hud">
        <span class="jr-graph-note is-neutral">{t('graphCurrent', { count: layout.visibleCount })}</span>
        {autoClosed.size > 0 && (
          <span
            class="jr-graph-note"
            title={t('graphAutoClosedTitle')}
          >
            {t('graphAutoClosed', { count: autoClosed.size })}
          </span>
        )}
        {layout.truncated && (
          <span class="jr-graph-note" title={t('graphTruncatedTitle', { count: GRAPH_MAX_NODES })}>
            {t('graphTruncated')}
          </span>
        )}
        {props.showGridControl !== false && <button
          class={props.showGrid ? 'jr-gbtn is-active' : 'jr-gbtn'}
          type="button"
          title={props.showGrid ? t('gridOff') : t('gridOn')}
          aria-label={props.showGrid ? t('gridOff') : t('gridOn')}
          aria-pressed={props.showGrid}
          onClick={props.onToggleGrid}
        >
          <Grid />
        </button>}
        {props.showStyleControl !== false && <button
          class="jr-gbtn"
          type="button"
          title={props.compactGraph ? t('compactGraphOff') : t('compactGraphOn')}
          aria-label={props.compactGraph ? t('compactGraphOff') : t('compactGraphOn')}
          aria-pressed={props.compactGraph}
          onClick={props.onToggleCompactGraph}
        >
          {props.compactGraph ? <Cards /> : <Graph />}
        </button>}
        <button
          class="jr-gbtn"
          type="button"
          title={t('zoomOut')}
          aria-label={t('zoomOut')}
          onClick={() => zoomCentre(1 / 1.25)}
        >
          <Minus />
        </button>
        <span class="jr-graph-zoom">{zoom}%</span>
        <button
          class="jr-gbtn"
          type="button"
          title={t('zoomIn')}
          aria-label={t('zoomIn')}
          onClick={() => zoomCentre(1.25)}
        >
          <Plus />
        </button>
        <button
          class="jr-gbtn"
          type="button"
          title={t('fitView')}
          aria-label={t('fitView')}
          onClick={() => fitRef.current()}
        >
          <Fit />
        </button>
      </div>
    </div>
  )
}
