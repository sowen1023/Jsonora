import type { ComponentChildren } from 'preact'
import { BrandMark, Clipboard, FileJson, Upload } from './Icons'
import { SAMPLES } from './samples'
import { useI18n } from './i18n'

export interface EmptyStateProps {
  onPaste: () => void
  onPickFile: () => void
  onSample: (id: string) => void
  extra?: ComponentChildren
  compact: boolean
}

export function EmptyState(props: EmptyStateProps) {
  const { locale, t } = useI18n()
  return (
    <div class="jr-empty">
      <div class="jr-empty-head">
        <span class="jr-empty-mark">
          <BrandMark size={42} />
        </span>
        <span class="jr-empty-kicker">{t('emptyKicker')}</span>
        <span class="jr-empty-title">{t('emptyTitle')}</span>
        <span class="jr-empty-sub">
          {t('emptySub')}
        </span>
      </div>

      <div class="jr-drop">
        <div class="jr-drop-actions">
          <button class="jr-btn is-primary" type="button" onClick={props.onPaste}>
            <Clipboard />
            {t('pasteJson')}
          </button>
          <button class="jr-btn is-ghost" type="button" onClick={props.onPickFile}>
            <Upload />
            {t('chooseFile')}
          </button>
        </div>
        <div class="jr-drop-hint">
          {props.compact ? t('pasteDirectly') : (locale === 'en' ? 'Or press ' : '或按 ')}
          {!props.compact && (
            <>
              <span class="jr-kbd">⌘</span> <span class="jr-kbd">V</span>
              {` ${t('shortcutHint')}`}
              <span class="jr-kbd">⌘</span> <span class="jr-kbd">O</span>
              {` ${t('openFile')}`}
            </>
          )}
        </div>
      </div>

      <div class="jr-samples">
        {SAMPLES.map((sample) => (
          <button
            key={sample.id}
            class="jr-btn is-ghost"
            type="button"
            title={t(sample.id === 'api' ? 'sampleApiDesc' : sample.id === 'config' ? 'sampleConfigDesc' : 'sampleBigDesc')}
            onClick={() => props.onSample(sample.id)}
          >
            <FileJson />
            {t(sample.id === 'api' ? 'sampleApi' : sample.id === 'config' ? 'sampleConfig' : 'sampleBig')}
          </button>
        ))}
      </div>

      {props.extra}
    </div>
  )
}
