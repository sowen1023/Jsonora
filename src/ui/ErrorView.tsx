import type { ParseError } from '@/core/parse'
import { Alert, Code, Copy, Upload } from './Icons'
import { useI18n } from './i18n'

export interface ErrorViewProps {
  error: ParseError
  onOpenRaw: () => void
  onPickFile: () => void
  onCopyError: () => void
}

export function ErrorView(props: ErrorViewProps) {
  const { t } = useI18n()
  const { error } = props
  const errorText = error.lines.find((line) => line.isError)?.text ?? ''
  const caretPrefix = errorText.slice(0, Math.max(0, error.caret))

  return (
    <div class="jr-scroll">
      <div class="jr-error">
        <div class="jr-error-head">
          <span class="jr-error-icon">
            <Alert />
          </span>
          <div>
            <div class="jr-error-title">{t('cannotParse')}</div>
            {error.hint && <div class="jr-error-hint">{error.hint}</div>}
            <div class="jr-error-where">
              {t('errorAt', { line: error.line, column: error.column, position: error.position })}
            </div>
            <div class="jr-error-msg">{t('rawError', { message: error.message })}</div>
          </div>
        </div>

        <div class="jr-snippet">
          {error.lines.map((line) => (
            <div key={line.no} class={line.isError ? 'jr-snippet-line is-error' : 'jr-snippet-line'}>
              <span class="jr-snippet-no">{line.no}</span>
              <span>{line.text || ' '}</span>
            </div>
          ))}
          <div class="jr-caret">
            <span class="jr-caret-no" />
            <span class="jr-caret-content">
              <span class="jr-caret-prefix">{caretPrefix}</span>
              <span class="jr-caret-mark">^</span>
            </span>
          </div>
        </div>

        <div class="jr-drop-actions" style={{ justifyContent: 'flex-start' }}>
          <button class="jr-btn is-primary" type="button" onClick={props.onOpenRaw}>
            <Code />
            {t('locateRaw')}
          </button>
          <button class="jr-btn is-ghost" type="button" onClick={props.onCopyError}>
            <Copy />
            {t('copyError')}
          </button>
          <button class="jr-btn is-ghost" type="button" onClick={props.onPickFile}>
            <Upload />
            {t('anotherFile')}
          </button>
        </div>
      </div>
    </div>
  )
}
