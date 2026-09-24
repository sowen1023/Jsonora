import type { ComponentChildren } from 'preact'
import type { IndentOption } from '@/core/format'
import type { Settings } from '@/platform/settings'
import { AutoTheme, Check, Close, CollapseAll, ExpandAll, Moon, Sun, Wand } from './Icons'
import { FontSelect } from './FontSelect'
import { useI18n } from './i18n'

interface SettingsPanelProps {
  settings: Settings
  hasDoc: boolean
  onChange: (patch: Partial<Settings>) => void
  onExpandAll: () => void
  onCollapseAll: () => void
  onPretty: (indent: IndentOption) => void
  onMinify: () => void
  onSortKeys: () => void
  onClose: () => void
}

export function SettingsPanel(props: SettingsPanelProps) {
  const {
    settings,
    hasDoc,
    onChange,
    onExpandAll,
    onCollapseAll,
    onPretty,
    onMinify,
    onSortKeys,
    onClose,
  } = props
  const { t } = useI18n()
  const themes: { value: Settings['theme']; label: string; icon: ComponentChildren }[] = [
    { value: 'auto', label: t('themeAuto'), icon: <AutoTheme size={15} /> },
    { value: 'light', label: t('themeLight'), icon: <Sun size={15} /> },
    { value: 'dark', label: t('themeDark'), icon: <Moon size={15} /> },
  ]
  const palettes: { value: Settings['palette']; label: string }[] = [
    { value: 'vscode', label: t('paletteVscode') },
    { value: 'github', label: t('paletteGithub') },
    { value: 'github-dimmed', label: t('paletteGithubDimmed') },
    { value: 'github-contrast', label: t('paletteGithubContrast') },
  ]
  return (
    <div class="jr-settings-layer">
      <aside
        class="jr-settings-panel"
        role="dialog"
        aria-modal="false"
        aria-label={t('settings')}
      >
        <header class="jr-settings-head">
          <div>
            <span class="jr-settings-kicker">JSONORA / PREFERENCES</span>
            <h2>{t('settings')}</h2>
          </div>
          <button class="jr-btn" type="button" title={t('close')} aria-label={t('close')} onClick={onClose}>
            <Close />
          </button>
        </header>

        <div class="jr-settings-body">
          <section class="jr-settings-section">
            <div class="jr-settings-section-title">{t('rawActions')}</div>
            <div class="jr-settings-section-desc">{t('rawActionsDesc')}</div>
            <div class="jr-choice-grid is-two">
              {([2, 4, 'tab'] as const).map((indent) => (
                <button
                  key={String(indent)}
                  class="jr-choice jr-settings-action"
                  type="button"
                  disabled={!hasDoc}
                  onClick={() => onPretty(indent)}
                >
                  <Wand size={14} />
                  <span>{t(indent === 2 ? 'pretty2' : indent === 4 ? 'pretty4' : 'prettyTab')}</span>
                </button>
              ))}
              <button
                class="jr-choice jr-settings-action"
                type="button"
                disabled={!hasDoc}
                onClick={onMinify}
              >
                <Wand size={14} />
                <span>{t('minify')}</span>
              </button>
            </div>
          </section>

          <section class="jr-settings-section">
            <div class="jr-settings-section-title">{t('structureActions')}</div>
            <div class="jr-settings-section-desc">{t('structureActionsDesc')}</div>
            <div class="jr-choice-grid is-two">
              <button
                class="jr-choice jr-settings-action"
                type="button"
                disabled={!hasDoc}
                onClick={onExpandAll}
              >
                <ExpandAll size={14} />
                <span>{t('expandAll')}</span>
              </button>
              <button
                class="jr-choice jr-settings-action"
                type="button"
                disabled={!hasDoc}
                onClick={onCollapseAll}
              >
                <CollapseAll size={14} />
                <span>{t('collapseAll')}</span>
              </button>
            </div>
            <ToggleRow
              label={t('sortKeys')}
              description={t('sortKeysDesc')}
              checked={settings.sortKeys}
              onChange={onSortKeys}
            />
          </section>

          <section class="jr-settings-section">
            <div class="jr-settings-section-title">{t('language')}</div>
            <div class="jr-settings-section-desc">{t('languageDesc')}</div>
            <div class="jr-choice-grid is-two" role="radiogroup" aria-label={t('language')}>
              {(['zh', 'en'] as const).map((language) => (
                <button
                  key={language}
                  class={settings.language === language ? 'jr-choice is-active' : 'jr-choice'}
                  type="button"
                  role="radio"
                  aria-checked={settings.language === language}
                  onClick={() => onChange({ language })}
                >
                  <span>{language === 'zh' ? '中文' : 'English'}</span>
                  {settings.language === language && <Check size={14} />}
                </button>
              ))}
            </div>
          </section>

          <section class="jr-settings-section">
            <div class="jr-settings-section-title">{t('appearance')}</div>
            <div class="jr-settings-section-desc">{t('themeDesc')}</div>
            <div class="jr-choice-grid" role="radiogroup" aria-label={t('theme')}>
              {themes.map((theme) => (
                <button
                  key={theme.value}
                  class={settings.theme === theme.value ? 'jr-choice is-active' : 'jr-choice'}
                  type="button"
                  role="radio"
                  aria-checked={settings.theme === theme.value}
                  onClick={() => onChange({ theme: theme.value })}
                >
                  {theme.icon}
                  <span>{theme.label}</span>
                  {settings.theme === theme.value && <Check size={14} />}
                </button>
              ))}
            </div>

            <div class="jr-setting-group">
              <b>{t('palette')}</b>
              <small>{t('paletteDesc')}</small>
              <div class="jr-choice-grid is-two" role="radiogroup" aria-label={t('palette')}>
                {palettes.map((palette) => (
                  <button
                    key={palette.value}
                    class={settings.palette === palette.value ? 'jr-choice is-active' : 'jr-choice'}
                    type="button"
                    role="radio"
                    aria-checked={settings.palette === palette.value}
                    onClick={() => onChange({ palette: palette.value })}
                  >
                    <span class="jr-palette-dot" data-palette-dot={palette.value} />
                    <span>{palette.label}</span>
                    {settings.palette === palette.value && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>

            <div class="jr-setting-group">
              <b>{t('fontFamily')}</b>
              <small>{t('fontFamilyDesc')}</small>
              <FontSelect
                value={settings.fontFamily}
                language={settings.language}
                onChange={(fontFamily) => onChange({ fontFamily })}
              />
            </div>

            <label class="jr-setting-row">
              <span>
                <b>{t('fontSize')}</b>
                <small>{t('fontSizeDesc')}</small>
              </span>
              <span class="jr-range-control">
                <input
                  class="jr-range"
                  type="range"
                  min={11}
                  max={18}
                  step={1}
                  value={settings.fontSize}
                  onInput={(event) =>
                    onChange({ fontSize: Number((event.currentTarget as HTMLInputElement).value) })
                  }
                />
                <output>{settings.fontSize}px</output>
              </span>
            </label>

            <ToggleRow
              label={t('animations')}
              description={t('animationsDesc')}
              checked={settings.animations}
              onChange={(animations) => onChange({ animations })}
            />
          </section>

          <section class="jr-settings-section">
            <div class="jr-settings-section-title">{t('viewer')}</div>
            <div class="jr-setting-row">
              <span>
                <b>{t('defaultIndent')}</b>
                <small>{t('defaultIndentDesc')}</small>
              </span>
              <div class="jr-seg">
                {([2, 4, 'tab'] as const).map((indent) => (
                  <button
                    key={String(indent)}
                    type="button"
                    class={settings.indent === indent ? 'is-active' : ''}
                    onClick={() => onChange({ indent })}
                  >
                    {indent === 'tab' ? 'Tab' : indent}
                  </button>
                ))}
              </div>
            </div>
            <ToggleRow
              label={t('wrapLines')}
              checked={settings.wrapLines}
              onChange={(wrapLines) => onChange({ wrapLines })}
            />
            <ToggleRow
              label={t('lineNumbers')}
              checked={settings.showLineNumbers}
              onChange={(showLineNumbers) => onChange({ showLineNumbers })}
            />
            <ToggleRow
              label={t('grid')}
              description={t('gridDesc')}
              checked={settings.showGrid}
              onChange={(showGrid) => onChange({ showGrid })}
            />
            <ToggleRow
              label={t('compactGraph')}
              description={t('compactGraphDesc')}
              checked={settings.compactGraph}
              onChange={(compactGraph) => onChange({ compactGraph })}
            />
          </section>
        </div>

        <footer class="jr-settings-foot">
          <button class="jr-btn is-primary" type="button" onClick={onClose}>{t('done')}</button>
        </footer>
      </aside>
    </div>
  )
}

function ToggleRow(props: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label class="jr-setting-row">
      <span>
        <b>{props.label}</b>
        {props.description && <small>{props.description}</small>}
      </span>
      <span class="jr-switch">
        <input
          type="checkbox"
          checked={props.checked}
          aria-label={props.label}
          onChange={(event) => props.onChange((event.currentTarget as HTMLInputElement).checked)}
        />
        <span class="jr-switch-track" />
      </span>
    </label>
  )
}
