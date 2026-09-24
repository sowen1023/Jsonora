import type { ComponentChildren, JSX } from 'preact'
import { useRef, useState } from 'preact/hooks'
import { Cards, Code, Graph, Grid, PanelLeft, PanelRight, Tree } from './Icons'
import type { VisualMode } from './App'
import { useI18n } from './i18n'

interface SplitWorkspaceProps {
  rightMode: VisualMode
  rightCollapsed: boolean
  onRightCollapsedChange: (collapsed: boolean) => void
  showGrid: boolean
  onToggleGrid: () => void
  compactGraph: boolean
  onToggleCompactGraph: () => void
  left: ComponentChildren
  right: ComponentChildren
}

export function SplitWorkspace(props: SplitWorkspaceProps) {
  const { t } = useI18n()
  const root = useRef<HTMLDivElement>(null)
  const drag = useRef<{ pointerId: number } | null>(null)
  const [leftWidth, setLeftWidth] = useState(37)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const { rightCollapsed } = props
  const [resizing, setResizing] = useState(false)

  const resizeAt = (clientX: number) => {
    const rect = root.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return
    const next = ((clientX - rect.left) / rect.width) * 100
    setLeftWidth(Math.max(22, Math.min(70, next)))
  }

  const classes = ['jr-workspace']
  if (leftCollapsed) classes.push('is-left-collapsed')
  if (rightCollapsed) classes.push('is-right-collapsed')
  if (resizing) classes.push('is-resizing')

  return (
    <div ref={root} class={classes.join(' ')}>
      {leftCollapsed ? (
        <button
          class="jr-pane-rail is-left"
          type="button"
          title={t('showJson')}
          aria-label={t('showJson')}
          onClick={() => setLeftCollapsed(false)}
        >
          <Code />
          <span>{t('jsonPanel')}</span>
        </button>
      ) : (
        <section
          class="jr-pane is-json"
          aria-label={t('jsonPanel')}
          style={{ '--pane-width': `${leftWidth}%` } as JSX.CSSProperties}
        >
          <header class="jr-pane-head">
            <div class="jr-pane-title">
              <Code size={14} />
              <span>{t('jsonPanel')}</span>
            </div>
            <span class="jr-spacer" />
            <button
              class="jr-pane-btn"
              type="button"
              title={t('collapseJson')}
              aria-label={t('collapseJson')}
              onClick={() => setLeftCollapsed(true)}
            >
              <PanelLeft />
            </button>
          </header>
          <div class="jr-pane-content">{props.left}</div>
        </section>
      )}

      {!leftCollapsed && !rightCollapsed && (
        <div
          class="jr-splitter"
          role="separator"
          tabIndex={0}
          aria-label={t('resizePanels')}
          aria-orientation="vertical"
          aria-valuenow={Math.round(leftWidth)}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
            event.preventDefault()
            setLeftWidth((value) =>
              Math.max(22, Math.min(70, value + (event.key === 'ArrowLeft' ? -2 : 2))),
            )
          }}
          onPointerDown={(event) => {
            drag.current = { pointerId: event.pointerId }
            ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
            setResizing(true)
          }}
          onPointerMove={(event) => {
            if (!drag.current) return
            resizeAt(event.clientX)
          }}
          onPointerUp={(event) => {
            if (!drag.current) return
            drag.current = null
            setResizing(false)
            try {
              ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
            } catch {
              /* pointer already released */
            }
          }}
          onPointerCancel={() => {
            drag.current = null
            setResizing(false)
          }}
        >
          <span />
        </div>
      )}

      {rightCollapsed ? (
        <button
          class="jr-pane-rail is-right"
          type="button"
          title={t('showVisual')}
          aria-label={t('showVisual')}
          onClick={() => props.onRightCollapsedChange(false)}
        >
          {props.rightMode === 'graph' ? <Graph /> : <Tree />}
          <span>{t('visualPanel')}</span>
        </button>
      ) : (
        <section class="jr-pane is-visual" aria-label={t('visualPanel')}>
          <header class="jr-pane-head">
            <span class="jr-spacer" />
            {props.rightMode === 'graph' && (
              <>
                <button
                  class="jr-pane-control"
                  type="button"
                  title={props.compactGraph ? t('compactGraphOff') : t('compactGraphOn')}
                  aria-label={props.compactGraph ? t('compactGraphOff') : t('compactGraphOn')}
                  aria-pressed={props.compactGraph}
                  onClick={props.onToggleCompactGraph}
                >
                  {props.compactGraph ? <Cards size={16} /> : <Graph size={16} />}
                </button>
                <button
                  class={props.showGrid ? 'jr-pane-control is-active' : 'jr-pane-control'}
                  type="button"
                  title={props.showGrid ? t('gridOff') : t('gridOn')}
                  aria-label={props.showGrid ? t('gridOff') : t('gridOn')}
                  aria-pressed={props.showGrid}
                  onClick={props.onToggleGrid}
                >
                  <Grid size={13} />
                </button>
              </>
            )}
            <button
              class="jr-pane-btn"
              type="button"
              title={t('collapseVisual')}
              aria-label={t('collapseVisual')}
              onClick={() => props.onRightCollapsedChange(true)}
            >
              <PanelRight />
            </button>
          </header>
          <div class="jr-pane-content">{props.right}</div>
        </section>
      )}
    </div>
  )
}
