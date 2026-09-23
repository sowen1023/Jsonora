import type { JsonNode } from '@/core/types'
import type { JsonModel } from '@/core/model'
import { pathToString } from '@/core/model'
import { formatBytes, isUnsafeInteger, stringify, downloadText } from '@/core/format'
import { Close, Copy, Download } from './Icons'
import { localizedTypeLabel, useI18n } from './i18n'

/** Guard rail for the detail sheet: a 200 MB string should not be poured into the DOM. */
const MAX_BODY = 400_000

export interface DetailModalProps {
  node: JsonNode
  model: JsonModel
  indent: 2 | 4 | 'tab'
  onClose: () => void
  onCopy: (text: string, label: string) => void
}

export function DetailModal(props: DetailModalProps) {
  const { t } = useI18n()
  const { node, model } = props
  const path = pathToString(model.pathOf(node.id))
  const container = node.kind === 'object' || node.kind === 'array'

  const full = container
    ? stringify(node.raw, props.indent)
    : node.kind === 'string'
      ? (node.raw as string)
      : node.text

  const truncated = full.length > MAX_BODY
  const body = truncated ? full.slice(0, MAX_BODY) : full
  const bytes = container || node.kind === 'string' ? new Blob([full]).size : full.length

  const name = node.key ?? (node.index >= 0 ? `[${node.index}]` : 'root')

  return (
    <div class="jr-modal" onClick={props.onClose}>
      <div class="jr-modal-card" onClick={(event) => event.stopPropagation()}>
        <div class="jr-modal-head">
          <span class="jr-modal-title" title={path}>
            {path}
          </span>
          <button class="jr-btn" type="button" title={t('close')} aria-label={t('close')} onClick={props.onClose}>
            <Close />
          </button>
        </div>

        <div class="jr-modal-body">
          {body}
          {truncated ? `\n\n… (${t('detailTruncated')})` : ''}
        </div>

        <div class="jr-modal-foot">
          <div class="jr-meta">
            <span>
              <b>{t('type')}</b> {localizedTypeLabel(node.kind, t)}
            </span>
            <span>
              <b>{t('key')}</b> {name}
            </span>
            <span>
              <b>{t('size')}</b> {formatBytes(bytes)}
            </span>
            {container && (
              <span>
                <b>{t('children')}</b> {model.sizeOf(node.id)}
              </span>
            )}
            {node.kind === 'string' && (
              <span>
                <b>{t('length')}</b> {full.length}
              </span>
            )}
            {isUnsafeInteger(node.raw) && (
              <span style={{ color: 'var(--warn)' }}>⚠ {t('unsafeInteger')}</span>
            )}
          </div>

          <button
            class="jr-btn is-ghost"
            type="button"
            onClick={() => props.onCopy(path, t('copiedPath'))}
          >
            <Copy size={14} />
            {t('path')}
          </button>
          <button
            class="jr-btn is-ghost"
            type="button"
            onClick={() => props.onCopy(full, container ? t('copiedJson') : t('copiedValue'))}
          >
            <Copy size={14} />
            {container ? 'JSON' : t('value')}
          </button>
          {container && (
            <button
              class="jr-btn is-ghost"
              type="button"
              onClick={() =>
                downloadText(
                  `${name.replace(/[^\w.\-]+/g, '_') || 'value'}.json`,
                  full,
                )
              }
            >
              <Download size={14} />
              {t('download')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
