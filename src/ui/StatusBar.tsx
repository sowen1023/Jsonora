import type { ViewerStats } from '@/core/types'
import { formatBytes, formatCount, formatMs } from '@/core/format'
import { Copy, Dots } from './Icons'
import { localizedTypeLabel, useI18n } from './i18n'

export interface StatusBarProps {
  stats: ViewerStats | null
  /** Visible row count, or `null` for views without rows (the graph). */
  rows: number | null
  note: string | null
  source: string | null
  path: string | null
  onCopyPath: () => void
  onOpenDetail: () => void
  canDetail: boolean
  limitHit: boolean
  format: string
  hitSummary: string | null
  /** Set when parsing failed, so the bar can say so instead of a meaningless "ready". */
  error: string | null
}

export function StatusBar(props: StatusBarProps) {
  const { t } = useI18n()
  const { stats } = props

  if (!stats) {
    return (
      <footer class="jr-status">
        <span class="jr-status-item">
          <span class={props.error ? 'jr-dot is-danger' : 'jr-dot is-warn'} />
          {props.error ?? t('ready')}
        </span>
        {props.source && (
          <span class="jr-status-item is-path">
            <span class="jr-status-path" title={props.source}>
              {props.source}
            </span>
          </span>
        )}
        <span class="jr-spacer" />
      </footer>
    )
  }

  const truncated = props.limitHit

  return (
    <footer class="jr-status">
      {props.source && (
        <span class="jr-status-item" title={props.source} style={{ maxWidth: '34ch', overflow: 'hidden' }}>
          <span class="jr-status-path">{props.source}</span>
        </span>
      )}
      <span class="jr-status-item" title={t('rawSize')}>
        {formatBytes(stats.bytes)}
      </span>
      <span class="jr-status-item" title={t('builtNodes')}>
        {formatCount(stats.nodes)} {t('nodes')}
      </span>
      <span class="jr-status-item" title={t('maxDepth')}>
        {t('depth')} {stats.depth}
      </span>
      <span class="jr-status-item" title={t('rootStructure')}>
        {localizedTypeLabel(stats.rootKind, t)}
      </span>
      <span class="jr-status-item" title={t('parseTime')}>
        {formatMs(stats.ms)}
      </span>
      {props.format !== 'json' && (
        <span class="jr-status-item" title={t('detectedFormat')}>
          {props.format.toUpperCase()}
        </span>
      )}
      {truncated && (
        <span class="jr-status-item" title={t('renderLimitedTitle')}>
          <span class="jr-dot is-warn" />
          {t('renderLimited')}
        </span>
      )}
      {props.note && (
        <span class="jr-status-item" title={props.note}>
          {props.note}
        </span>
      )}
      {props.hitSummary && <span class="jr-status-item">{props.hitSummary}</span>}

      <span class="jr-status-item is-path">
        {props.path ? (
          <>
            <span class="jr-status-path" title={props.path}>
              {props.path}
            </span>
            <button
              class="jr-btn"
              type="button"
              title={t('copyPath')}
              aria-label={t('copyPath')}
              onClick={props.onCopyPath}
            >
              <Copy size={13} />
            </button>
            {props.canDetail && (
              <button
                class="jr-btn"
                type="button"
                title={t('viewDetail')}
                aria-label={t('viewDetail')}
                onClick={props.onOpenDetail}
              >
                <Dots size={13} />
              </button>
            )}
          </>
        ) : props.rows !== null ? (
          <span class="jr-status-path" style={{ opacity: 0.7 }}>
            {props.rows} {t('rows')}
          </span>
        ) : null}
      </span>
    </footer>
  )
}
