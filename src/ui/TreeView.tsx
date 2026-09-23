import { useEffect, useRef, useState } from 'preact/hooks'
import type { RefObject } from 'preact'
import type { JsonNode } from '@/core/types'
import type { JsonModel } from '@/core/model'
import { INDENT, ROW_H } from './metrics'
import { DisclosureTriangle, Dots } from './Icons'
import { Highlighted } from './Highlighted'
import { isUnsafeInteger } from '@/core/format'
import { useI18n } from './i18n'

const OVERSCAN = 8

export interface TreeViewProps {
  model: JsonModel
  rows: readonly number[]
  hitSet: Set<number>
  currentHitId: number | null
  selected: number | null
  query: string
  regex: boolean
  caseSensitive: boolean
  /** Set briefly after a load or an expand so freshly revealed rows can cascade in. */
  animate: boolean
  scrollRef: RefObject<HTMLDivElement>
  onToggle: (id: number) => void
  onSelect: (id: number) => void
  onOpen: (id: number) => void
}

export function TreeView(props: TreeViewProps) {
  const { model, rows, scrollRef, animate } = props
  const [scrollTop, setScrollTop] = useState(0)
  const [viewport, setViewport] = useState(640)
  const frame = useRef(0)
  const prevRows = useRef<Set<number>>(new Set())

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
    prevRows.current = new Set(rows)
  })

  const first = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN)
  const last = Math.min(rows.length, Math.ceil((scrollTop + viewport) / ROW_H) + OVERSCAN)
  const slice = rows.slice(first, last)
  const previous = prevRows.current

  let stagger = 0

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
      <div class="jr-tree" style={{ height: `${rows.length * ROW_H}px` }}>
        {slice.map((id, i) => {
          const isNew = animate && !previous.has(id)
          const delay = isNew ? Math.min(stagger++, 24) : 0
          return (
            <Row
              key={id}
              node={model.nodes[id]}
              size={
                model.nodes[id].kind === 'object' || model.nodes[id].kind === 'array'
                  ? model.sizeOf(id)
                  : null
              }
              expanded={model.isExpanded(id)}
              selected={props.selected === id}
              hit={props.hitSet.has(id)}
              currentHit={props.currentHitId === id}
              query={props.query}
              regex={props.regex}
              caseSensitive={props.caseSensitive}
              top={(first + i) * ROW_H}
              animate={isNew}
              stagger={delay}
              onToggle={props.onToggle}
              onSelect={props.onSelect}
              onOpen={props.onOpen}
            />
          )
        })}
      </div>
    </div>
  )
}

interface RowProps {
  node: JsonNode
  size: number | null
  expanded: boolean
  selected: boolean
  hit: boolean
  currentHit: boolean
  query: string
  regex: boolean
  caseSensitive: boolean
  top: number
  animate: boolean
  stagger: number
  onToggle: (id: number) => void
  onSelect: (id: number) => void
  onOpen: (id: number) => void
}

function Row(props: RowProps) {
  const { t } = useI18n()
  const { node, expanded, query, regex, caseSensitive } = props
  const container = node.kind === 'object' || node.kind === 'array'
  const depth = node.depth < 0 ? 0 : node.depth
  const isArrayItem = node.index >= 0
  const hasLabel = node.key !== null || isArrayItem

  const className = ['jr-row']
  if (props.selected) className.push('is-selected')
  if (props.hit) className.push('is-hit')

  return (
    <div class={className.join(' ')} style={{ top: `${props.top}px` }}>
      <div
        class={props.animate ? 'jr-row-in is-new' : 'jr-row-in'}
        style={{ paddingLeft: `${depth * INDENT}px`, '--stagger': props.stagger } as never}
        onClick={() => props.onSelect(node.id)}
        onDblClick={() => (container ? props.onToggle(node.id) : props.onOpen(node.id))}
      >
        {depth > 0 && <span class="jr-guides" style={{ width: `${depth * INDENT}px` }} />}

        <span
          class={`jr-chev${container ? (expanded ? ' is-open' : '') : ' is-leaf'}`}
          onClick={(event) => {
            event.stopPropagation()
            if (container) props.onToggle(node.id)
          }}
        >
          {container && <DisclosureTriangle size={13} />}
        </span>

        {hasLabel && (
          <span class={isArrayItem ? 'jr-key is-index' : 'jr-key'}>
            {isArrayItem ? (
              <Highlighted
                text={String(node.index)}
                query={query}
                regex={regex}
                caseSensitive={caseSensitive}
                current={props.currentHit}
              />
            ) : (
              <>
                <span class="jr-quote">"</span>
                <Highlighted
                  text={node.key as string}
                  query={query}
                  regex={regex}
                  caseSensitive={caseSensitive}
                  current={props.currentHit}
                />
                <span class="jr-quote">"</span>
              </>
            )}
          </span>
        )}

        {hasLabel && <span class="jr-colon">:</span>}

        {container ? (
          expanded ? (
            <span class="jr-preview">
              <span class="jr-brace">{node.kind === 'array' ? '[' : '{'}</span>
            </span>
          ) : (
            <span class="jr-preview">
              <span class="jr-brace">{node.kind === 'array' ? '[' : '{'}</span>
              {'…'}
              <span class="jr-brace">{node.kind === 'array' ? ']' : '}'}</span>
            </span>
          )
        ) : node.kind === 'string' ? (
          <span class="jr-val" data-kind="string">
            <span class="jr-quote">"</span>
            <Highlighted
              text={node.text}
              query={query}
              regex={regex}
              caseSensitive={caseSensitive}
              current={props.currentHit}
            />
            <span class="jr-quote">"</span>
          </span>
        ) : (
          <span class="jr-val" data-kind={node.kind}>
            <Highlighted
              text={node.text}
              query={query}
              regex={regex}
              caseSensitive={caseSensitive}
              current={props.currentHit}
            />
          </span>
        )}

        {container && <span class="jr-container-size">{t('itemCount', { count: props.size ?? 0 })}</span>}

        {/* An expanded container's comma is implied by its children, so only collapsed
            containers and primitives show one. */}
        {!node.isLast && !(container && expanded) && <span class="jr-comma">,</span>}

        {isUnsafeInteger(node.raw) && <span class="jr-badge is-warn">{t('precision')}</span>}
        {node.kind === 'string' && node.text.length > 200 && (
          <span class="jr-badge">{t('characterCount', { count: node.text.length })}</span>
        )}

        <button
          class="jr-row-more"
          type="button"
          title={t('viewDetail')}
          aria-label={t('viewDetail')}
          onClick={(event) => {
            event.stopPropagation()
            props.onOpen(node.id)
          }}
        >
          <Dots size={14} />
        </button>
      </div>
    </div>
  )
}
