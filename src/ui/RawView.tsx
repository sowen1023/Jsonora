import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { JSX, RefObject } from 'preact'
import { foldableLineEnds, visibleLineIndices } from '@/core/fold'
import { findRanges, lineNestingDepths, segmentLine } from '@/core/highlight'
import type { Segment } from '@/core/highlight'
import { RAW_LINE_H } from './metrics'
import { useI18n } from './i18n'

const OVERSCAN = 12
/** Beyond this a line is rendered as one text node — tokenising it would cost more than it shows. */
const MAX_HIGHLIGHT_LINE = 20_000
/** Wrapped lines cannot be virtualised by index, so cap how many we are willing to lay out. */
const MAX_WRAP_LINES = 20_000

export interface RawViewProps {
  /** Pre-split by the caller so search and rendering share one array. */
  lines: string[]
  query: string
  regex: boolean
  caseSensitive: boolean
  wrap: boolean
  showLineNumbers: boolean
  errorLine: number | null
  hitLines: Set<number>
  currentHitLine: number | null
  scrollRef: RefObject<HTMLDivElement>
}

export function RawView(props: RawViewProps) {
  const { lines, scrollRef, query, regex, caseSensitive } = props
  const { t } = useI18n()
  const [scrollTop, setScrollTop] = useState(0)
  const [viewport, setViewport] = useState(640)
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set())
  const frame = useRef(0)
  const lastScrolledHit = useRef<number | null>(null)

  const wrapped = props.wrap && lines.length <= MAX_WRAP_LINES
  const lineDepths = useMemo(() => lineNestingDepths(lines), [lines])
  const foldEnds = useMemo(() => foldableLineEnds(lines), [lines])
  const visibleRows = useMemo(
    () => visibleLineIndices(lines.length, foldEnds, collapsed),
    [lines.length, foldEnds, collapsed],
  )
  const guideStep = useMemo(() => {
    let step = Infinity
    for (const line of lines.slice(0, 300)) {
      const leading = /^[ \t]+(?=\S)/.exec(line)?.[0]
      if (!leading) continue
      if (leading.includes('\t')) return 4
      step = Math.min(step, leading.length)
    }
    return Number.isFinite(step) ? Math.max(1, Math.min(8, step)) : 2
  }, [lines])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = () => setViewport(el.clientHeight || 640)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [scrollRef])

  useEffect(() => {
    setCollapsed(new Set())
    lastScrolledHit.current = null
  }, [lines])

  useEffect(() => {
    lastScrolledHit.current = null
  }, [query])

  useEffect(() => {
    const hit = props.currentHitLine
    if (hit == null || hit === lastScrolledHit.current) return
    const target = hit - 1
    const hiding = [...collapsed].filter((start) => start < target && foldEnds[start] >= target)
    if (hiding.length) {
      setCollapsed((previous) => {
        const next = new Set(previous)
        for (const start of hiding) next.delete(start)
        return next
      })
      return
    }
    const displayIndex = visibleRows.indexOf(target)
    const el = scrollRef.current
    if (displayIndex >= 0 && el) {
      const top = wrapped
        ? (el.querySelector<HTMLElement>(`[data-line-no="${hit}"]`)?.offsetTop ?? displayIndex * RAW_LINE_H)
        : displayIndex * RAW_LINE_H
      el.scrollTop = Math.max(0, top - el.clientHeight / 3)
    }
    lastScrolledHit.current = hit
  }, [props.currentHitLine, collapsed, foldEnds, visibleRows, wrapped, scrollRef])

  const search = query ? { regex, caseSensitive } : null

  const render = (line: string, index: number, displayIndex: number) => {
    const lineNo = index + 1
    const foldEnd = foldEnds[index]
    const isCollapsed = collapsed.has(index) && foldEnd > index
    const hits = search && line.length <= MAX_HIGHLIGHT_LINE ? findRanges(line, query, search) : []
    const segments: Segment[] =
      line.length > MAX_HIGHLIGHT_LINE
        ? [{ text: line, type: 'plain', hit: false }]
        : segmentLine(line, hits)
    const leading = /^[ \t]*/.exec(line)?.[0] ?? ''
    const leadingColumns = [...leading].reduce((sum, char) => sum + (char === '\t' ? 4 : 1), 0)
    const guideStyle = {
      '--raw-guide-width': `${Math.max(0, leadingColumns - 1)}ch`,
      '--raw-guide-step': `${guideStep}ch`,
    } as JSX.CSSProperties
    let braceDepth = lineDepths[index] ?? 0

    const classes = ['jr-line']
    if (props.errorLine === lineNo) classes.push('is-error')
    else if (props.currentHitLine === lineNo) classes.push('is-current')
    else if (props.hitLines.has(lineNo)) classes.push('is-hit')

    return (
      <div
        key={index}
        class={classes.join(' ')}
        data-line-no={lineNo}
        style={wrapped ? undefined : { top: `${displayIndex * RAW_LINE_H}px` }}
      >
        <span class={props.showLineNumbers ? 'jr-ln' : 'jr-ln is-no-numbers'}>
          {props.showLineNumbers && <span class="jr-ln-number">{lineNo}</span>}
          {foldEnd > index && (
            <button
              type="button"
              class="jr-fold-toggle"
              aria-label={t(isCollapsed ? 'unfoldLine' : 'foldLine', { line: lineNo })}
              aria-expanded={!isCollapsed}
              title={t(isCollapsed ? 'unfoldLine' : 'foldLine', { line: lineNo })}
              onClick={() => setCollapsed((previous) => {
                const next = new Set(previous)
                if (next.has(index)) next.delete(index)
                else next.add(index)
                return next
              })}
            >
              <span class={isCollapsed ? 'jr-fold-icon is-collapsed' : 'jr-fold-icon'} aria-hidden="true" />
            </button>
          )}
        </span>
        <code class={leadingColumns > guideStep ? 'jr-code has-guides' : 'jr-code'} style={guideStyle}>
          {segments.map((segment, i) => {
            let depth: number | undefined
            if (segment.type === 'brace') {
              if (segment.text === '}' || segment.text === ']') braceDepth = Math.max(0, braceDepth - 1)
              depth = braceDepth % 3
              if (segment.text === '{' || segment.text === '[') braceDepth++
            }
            const className = `${segment.hit ? 'jr-hit ' : ''}jr-t-${segment.type}`
            return segment.hit ? (
              <mark key={i} class={className} data-depth={depth}>{segment.text}</mark>
            ) : (
              <span key={i} class={className} data-depth={depth}>{segment.text}</span>
            )
          })}
        </code>
      </div>
    )
  }

  return (
    <div
      class="jr-scroll"
      ref={scrollRef}
      onScroll={(event) => {
        const el = event.currentTarget as HTMLDivElement
        if (frame.current) return
        frame.current = requestAnimationFrame(() => {
          frame.current = 0
          setScrollTop(el.scrollTop)
        })
      }}
    >
      <div class={wrapped ? 'jr-raw is-wrapped' : 'jr-raw'} style={wrapped ? undefined : { height: `${visibleRows.length * RAW_LINE_H}px` }}>
        {wrapped
          ? visibleRows.map((sourceIndex, displayIndex) => render(lines[sourceIndex], sourceIndex, displayIndex))
          : (() => {
              const first = Math.max(0, Math.floor(scrollTop / RAW_LINE_H) - OVERSCAN)
              const last = Math.min(visibleRows.length, Math.ceil((scrollTop + viewport) / RAW_LINE_H) + OVERSCAN)
              const out = []
              for (let i = first; i < last; i++) {
                const sourceIndex = visibleRows[i]
                out.push(render(lines[sourceIndex], sourceIndex, i))
              }
              return out
            })()}
      </div>
    </div>
  )
}
