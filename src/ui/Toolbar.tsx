import type { ComponentChildren } from 'preact'
import {
  BrandMark,
  Clipboard,
  Close,
  Copy,
  Download,
  Pencil,
  Refresh,
  Search,
  Settings as SettingsIcon,
  Trash,
  Upload,
} from './Icons'
import { Menu } from './Menu'
import type { MenuEntry } from './Menu'
import type { ViewMode, VisualMode } from './App'
import { useI18n } from './i18n'

export interface ToolbarProps {
  view: ViewMode
  onView: (view: ViewMode) => void
  visualView: VisualMode
  onVisualView: (view: VisualMode) => void
  hasDoc: boolean
  hasText: boolean
  searchOpen: boolean
  onToggleSearch: () => void
  editing: boolean
  onEdit: () => void
  onCopyAll: () => void
  onDownload: () => void
  onOpenFile: () => void
  onPaste: () => void
  onClear: () => void
  onReload: () => void
  onOpenSettings: () => void
  language: 'zh' | 'en'
  onLanguage: (language: 'zh' | 'en') => void
  density: 'full' | 'compact'
  showBrand: boolean
  onClose?: () => void
  extra?: ComponentChildren
}

export function Toolbar(props: ToolbarProps) {
  const { density, hasDoc, hasText } = props
  const { t } = useI18n()
  const fileMenu: MenuEntry[] = [
    { label: t('openFile'), icon: <Upload size={14} />, disabled: props.editing, onClick: props.onOpenFile },
    { label: t('pasteJson'), icon: <Clipboard size={14} />, disabled: props.editing, onClick: props.onPaste },
    { label: t('editJson'), icon: <Pencil size={14} />, checked: props.editing, onClick: props.onEdit },
    'separator',
    { label: t('copyAll'), icon: <Copy size={14} />, disabled: !hasText || props.editing, onClick: props.onCopyAll },
    { label: t('downloadJson'), icon: <Download size={14} />, disabled: !hasText || props.editing, onClick: props.onDownload },
    'separator',
    { label: t('reparse'), icon: <Refresh size={14} />, disabled: !hasText || props.editing, onClick: props.onReload },
    { label: t('clear'), icon: <Trash size={14} />, disabled: !hasText || props.editing, onClick: props.onClear },
  ]
  // Full-page viewing keeps Raw in the left pane. Compact surfaces need a way
  // back to Raw after switching to Tree or Graph.
  const viewMenu: MenuEntry[] = density === 'full'
    ? [
        { label: t('viewGraph'), checked: props.visualView === 'graph', disabled: !hasDoc, onClick: () => props.onVisualView('graph') },
        { label: t('viewTree'), checked: props.visualView === 'tree', disabled: !hasDoc, onClick: () => props.onVisualView('tree') },
      ]
    : [
        { label: t('viewRaw'), checked: props.view === 'raw', disabled: !hasText, onClick: () => props.onView('raw') },
        { label: t('viewTree'), checked: props.view === 'tree', disabled: !hasDoc, onClick: () => props.onView('tree') },
        { label: t('viewGraph'), checked: props.view === 'graph', disabled: !hasDoc, onClick: () => props.onView('graph') },
      ]
  return (
    <header class="jr-header">
      {props.showBrand && (
        <div class="jr-brand">
          <BrandMark class="jr-brand-mark" size={22} />
          <span class="jr-brand-name">Jsonora</span>
        </div>
      )}

      <nav class="jr-menubar" aria-label={t('viewMenu')}>
        <Menu entries={fileMenu} title={t('fileMenu')} label={t('fileMenu')} align="left" menubar />
        <Menu entries={viewMenu} title={t('viewMenu')} label={t('viewMenu')} align="left" menubar />
      </nav>

      <span class="jr-spacer" />

      <div class="jr-tools">
        {props.extra}

        <button
          class={props.searchOpen ? 'jr-btn is-active' : 'jr-btn'}
          type="button"
          title={`${t('search')}（⌘F）`}
          aria-label={t('search')}
          disabled={!hasDoc || props.editing}
          onClick={props.onToggleSearch}
        >
          <Search />
          {density === 'full' && <span class="jr-btn-label">{t('search')}</span>}
        </button>

        {density === 'full' && (
          <div class="jr-lang-switch" role="group" aria-label={t('language')}>
            <button
              type="button"
              class={props.language === 'zh' ? 'is-active' : ''}
              aria-pressed={props.language === 'zh'}
              onClick={() => props.onLanguage('zh')}
            >
              中文
            </button>
            <span>/</span>
            <button
              type="button"
              class={props.language === 'en' ? 'is-active' : ''}
              aria-pressed={props.language === 'en'}
              onClick={() => props.onLanguage('en')}
            >
              EN
            </button>
          </div>
        )}

        <button
          class="jr-btn"
          type="button"
          title={t('settings')}
          aria-label={t('settings')}
          onClick={props.onOpenSettings}
        >
          <SettingsIcon />
          {density === 'full' && <span class="jr-btn-label">{t('settings')}</span>}
        </button>

        {props.onClose && (
          <button class="jr-btn" type="button" title={t('close')} aria-label={t('close')} onClick={props.onClose}>
            <Close />
          </button>
        )}
      </div>
    </header>
  )
}
