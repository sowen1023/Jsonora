import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { ComponentChildren, JSX } from 'preact'
import { parseJson } from '@/core/parse'
import type { ParseResult } from '@/core/parse'
import { JsonModel, pathToString } from '@/core/model'
import { copyText } from '@/core/copy'
import {
  downloadText,
  indentJsonSource,
  minify as minifyValue,
  stringify,
  suggestFilename,
  type IndentOption,
} from '@/core/format'
import { findRanges } from '@/core/highlight'
import type { ViewerStats } from '@/core/types'
import { readFile } from '@/platform/env'
import type { Settings } from '@/platform/settings'
import { useResolvedTheme, useSettings } from './useSettings'
import { ROW_H, RAW_LINE_H, rootVars } from './metrics'
import { Toolbar } from './Toolbar'
import { SearchBar } from './SearchBar'
import { StatusBar } from './StatusBar'
import { TreeView } from './TreeView'
import { RawView } from './RawView'
import { JsonEditor } from './JsonEditor'
import { GraphView } from './GraphView'
import { EmptyState } from './EmptyState'
import { ErrorView } from './ErrorView'
import { DetailModal } from './DetailModal'
import { Toasts, type Toast } from './Toasts'
import { Info, Upload } from './Icons'
import { sampleById } from './samples'
import { getTranslator, I18nProvider } from './i18n'
import { SettingsPanel } from './SettingsPanel'
import { SplitWorkspace } from './SplitWorkspace'

export type SurfaceMode = 'page' | 'popup' | 'panel' | 'embed'

export interface AppProps {
  mode?: SurfaceMode
  /** Loaded whenever it changes; the viewer page passes a hand-off payload here. */
  initialText?: string
  /** Where the JSON came from, shown in the status bar. */
  source?: string | null
  showBrand?: boolean
  onClose?: () => void
  onOpenSettings?: () => void
  headerExtra?: ComponentChildren
  emptyExtra?: ComponentChildren
}

interface Loaded {
  result: ParseResult
  model: JsonModel | null
  stats: ViewerStats | null
}

export type ViewMode = 'tree' | 'graph' | 'raw'
export type VisualMode = 'graph' | 'tree'

const EMPTY_ROWS: readonly number[] = Object.freeze([])
const SEARCH_DEBOUNCE = 140

export function JsonoraApp(props: AppProps) {
  const mode = props.mode ?? 'page'
  const compact = mode !== 'page'
  const [settings, updateSettings] = useSettings()
  const theme = useResolvedTheme(settings.theme)
  const t = useMemo(() => getTranslator(settings.language), [settings.language])

  const rootRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const treeScrollRef = useRef<HTMLDivElement>(null)
  const editorFocus = useRef<() => void>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const [text, setText] = useState('')
  const [preserveSourceLayout, setPreserveSourceLayout] = useState(false)
  const [doc, setDoc] = useState<Loaded | null>(null)
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<ViewMode>('raw')
  const [visualView, setVisualView] = useState<VisualMode>('graph')
  const [visualCollapsed, setVisualCollapsed] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorInitialText, setEditorInitialText] = useState('')
  const [expandSeq, setExpandSeq] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [modalNode, setModalNode] = useState<number | null>(null)
  const [animateUntil, setAnimateUntil] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)

  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [regex, setRegex] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [onlyMatches, setOnlyMatches] = useState(false)
  const [hits, setHits] = useState<number[]>([])
  const [hitIndex, setHitIndex] = useState(0)
  const [searchTruncated, setSearchTruncated] = useState(false)
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchMs, setSearchMs] = useState(0)

  const toastSeq = useRef(0)
  const loadTimer = useRef(0)
  const pendingScroll = useRef<number | null>(null)

  /* ------------------------------------------------------------- toasts -- */

  const pushToast = useCallback((label: string, tone: Toast['tone'] = 'ok') => {
    const id = ++toastSeq.current
    setToasts((list) => [...list.slice(-2), { id, text: label, tone }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 2200)
  }, [])

  const copy = useCallback(
    async (value: string, label: string) => {
      const ok = await copyText(value)
      pushToast(ok ? label : t('copyFailed'), ok ? 'ok' : 'danger')
    },
    [pushToast, t],
  )

  /* --------------------------------------------------------------- load -- */

  const load = useCallback(
    (
      next: string,
      overrides?: Partial<Pick<Settings, 'sortKeys' | 'expandDepth' | 'maxNodes'>>,
    ) => {
      window.clearTimeout(loadTimer.current)
      setText(next)
      setPreserveSourceLayout(false)
      setSelected(null)
      setModalNode(null)
      setHits([])
      setHitIndex(0)
      setSearchTruncated(false)

      if (!next.trim()) {
        setDoc(null)
        setBusy(false)
        return
      }

      setBusy(true)
      const started = performance.now()
      // Defer so the loading state paints before the (synchronous) parse blocks the thread.
      loadTimer.current = window.setTimeout(() => {
        const options = { ...settingsRef.current, ...overrides }
        const result = parseJson(next)
        let model: JsonModel | null = null
        let stats: ViewerStats | null = null

        if (result.ok) {
          try {
            model = new JsonModel(result.value, {
              sortKeys: options.sortKeys,
              expandDepth: options.expandDepth,
              maxNodes: options.maxNodes,
            })
            stats = model.stats(new Blob([next]).size, performance.now() - started)
          } catch {
            model = null
          }
        }

        setDoc({ result, model, stats })
        setBusy(false)
        setExpandSeq((v) => v + 1)
        setAnimateUntil(performance.now() + 700)
      }, 16)
    },
    [],
  )

  useEffect(() => {
    if (props.initialText) load(props.initialText)
  }, [props.initialText, load])

  useEffect(() => () => window.clearTimeout(loadTimer.current), [])

  /* ------------------------------------------------------------- derive -- */

  const model = doc?.model ?? null
  const splitLayout = mode === 'page' && !!doc?.result.ok && !!model
  const activeSearchView = splitLayout ? 'raw' : view
  const treeVisible = splitLayout ? !visualCollapsed && visualView === 'tree' : view === 'tree'
  const displayText = useMemo(() => (
    !preserveSourceLayout && doc?.result.ok && doc.result.format === 'json' && doc.result.text === text
      ? indentJsonSource(text, settings.indent)
      : text
  ), [doc, text, settings.indent, preserveSourceLayout])
  const lines = useMemo(() => (displayText ? displayText.split('\n') : []), [displayText])

  const rows = useMemo<readonly number[]>(() => {
    if (!model) return EMPTY_ROWS
    if (onlyMatches && query) return model.rowsForMatches(hits)
    return model.visibleRows()
  }, [model, expandSeq, onlyMatches, query, hits])

  const hitSet = useMemo(() => new Set(hits), [hits])

  const rawHitLines = useMemo(() => {
    if (activeSearchView !== 'raw' || !query) return [] as number[]
    const out: number[] = []
    for (let i = 0; i < lines.length; i++) {
      if (findRanges(lines[i], query, { regex, caseSensitive }).length) out.push(i + 1)
      if (out.length >= 5_000) break
    }
    return out
  }, [activeSearchView, lines, query, regex, caseSensitive])

  const rawHitSet = useMemo(() => new Set(rawHitLines), [rawHitLines])

  const regexInvalid = useMemo(() => {
    if (!regex || !query) return false
    try {
      new RegExp(query)
      return false
    } catch {
      return true
    }
  }, [regex, query])

  // The tree and the graph navigate the same node-id hit list; only the raw view is
  // line-oriented.
  const hitTotal = activeSearchView === 'raw' ? rawHitLines.length : hits.length
  const currentHitId = hits[hitIndex] ?? null
  const currentHitLine = rawHitLines[hitIndex] ?? null

  const selectedNode = selected != null && model ? model.nodes[selected] : null
  const selectedPath = selectedNode && model ? pathToString(model.pathOf(selectedNode.id)) : null

  /* ------------------------------------------------------------- search -- */

  useEffect(() => {
    if (!model || !query || regexInvalid) {
      setHits([])
      setSearchTruncated(false)
      setSearchBusy(false)
      return
    }

    setSearchBusy(true)
    const timer = window.setTimeout(() => {
      const outcome = model.search({
        query,
        regex,
        caseSensitive,
        matchKeys: true,
        matchValues: true,
      })
      setHits(outcome.ids)
      setSearchTruncated(outcome.truncated)
      setSearchMs(outcome.ms)
      setSearchBusy(false)
      setHitIndex(0)
      // Open the ancestors of the hits so they are actually on screen in tree mode.
      for (const id of outcome.ids.slice(0, 400)) model.reveal(id)
      setExpandSeq((v) => v + 1)
    }, SEARCH_DEBOUNCE)

    return () => window.clearTimeout(timer)
  }, [model, query, regex, caseSensitive, regexInvalid])

  useEffect(() => {
    setHitIndex(0)
  }, [activeSearchView])

  const gotoHit = useCallback(
    (delta: number) => {
      if (!hitTotal) return
      setHitIndex((current) => {
        const next = (current + delta + hitTotal) % hitTotal
        return next
      })
    },
    [hitTotal],
  )

  const scrollToRow = useCallback((id: number) => {
    if (!treeVisible) return
    const el = splitLayout ? treeScrollRef.current : scrollRef.current
    if (!el) return
    const index = rows.indexOf(id)
    if (index < 0) return
    const top = index * ROW_H
    const bottom = top + ROW_H
    const pad = ROW_H * 4
    if (el.scrollTop + pad > top) el.scrollTop = Math.max(0, top - pad)
    else if (el.scrollTop + el.clientHeight - pad < bottom) {
      el.scrollTop = bottom - el.clientHeight + pad
    }
  }, [rows, splitLayout, treeVisible])

  // Jump to whatever the user navigated to, once the row list has caught up.
  useEffect(() => {
    const target = pendingScroll.current
    if (target == null) return
    pendingScroll.current = null
    scrollToRow(target)
  }, [rows, scrollToRow])

  const focusHit = useCallback(
    (index: number) => {
      if (activeSearchView !== 'raw') {
        const id = hits[index]
        if (id == null || !model) return
        model.reveal(id)
        setSelected(id)
        setExpandSeq((v) => v + 1)
        if (treeVisible) pendingScroll.current = id
      } else {
        const line = rawHitLines[index]
        if (line == null) return
        const el = scrollRef.current
        if (el) el.scrollTop = Math.max(0, (line - 1) * RAW_LINE_H - el.clientHeight / 3)
      }
    },
    [activeSearchView, hits, rawHitLines, model, treeVisible],
  )

  const focusHitRef = useRef(focusHit)
  focusHitRef.current = focusHit

  useEffect(() => {
    if (!query || !hitTotal) return
    focusHitRef.current(hitIndex)
  }, [hitIndex, hitTotal, query])

  /* ----------------------------------------------------------- keyboard -- */

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const path = event.composedPath()
      const inside = rootRef.current ? path.includes(rootRef.current) : false
      const capturesGlobally = mode !== 'embed'
      if (!inside && !capturesGlobally) return

      const typing = path.some((node) => node instanceof HTMLElement && (
        node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.isContentEditable
      ))

      const mod = event.metaKey || event.ctrlKey
      const key = event.key

      if (mod && (key === 'f' || key === 'F')) {
        if (editorOpen) return
        event.preventDefault()
        setSearchOpen(true)
        requestAnimationFrame(() => searchInput.current?.select())
        return
      }

      if (key === 'Escape') {
        if (settingsOpen) {
          setSettingsOpen(false)
          event.preventDefault()
          return
        }
        if (modalNode != null) {
          setModalNode(null)
          event.preventDefault()
          return
        }
        if (searchOpen) {
          setSearchOpen(false)
          setQuery('')
          event.preventDefault()
        }
        return
      }

      if (mod && event.shiftKey && (key === 'e' || key === 'E')) {
        event.preventDefault()
        model?.expandAll()
        setExpandSeq((v) => v + 1)
        return
      }

      if (mod && event.shiftKey && (key === 'k' || key === 'K')) {
        event.preventDefault()
        model?.collapseAll()
        setExpandSeq((v) => v + 1)
        return
      }

      if (mod && (key === 'o' || key === 'O')) {
        event.preventDefault()
        if (editorOpen) return
        fileInput.current?.click()
        return
      }

      if (mod && (key === 'c' || key === 'C') && !typing && selectedNode && model) {
        const selection = window.getSelection()
        if (!selection || selection.isCollapsed) {
          event.preventDefault()
          const value =
            selectedNode.kind === 'object' || selectedNode.kind === 'array'
              ? stringify(selectedNode.raw, settings.indent)
              : selectedNode.kind === 'string'
                ? (selectedNode.raw as string)
                : selectedNode.text
          void copy(value, t('copiedSelection'))
        }
        return
      }

      if (typing || !treeVisible || !model || !rows.length) return

      const index = selected == null ? -1 : rows.indexOf(selected)

      switch (key) {
        case 'ArrowDown': {
          event.preventDefault()
          const next = rows[Math.min(rows.length - 1, index + 1)]
          if (next != null) setSelected(next)
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          const next = rows[Math.max(0, index <= 0 ? 0 : index - 1)]
          if (next != null) setSelected(next)
          break
        }
        case 'ArrowRight': {
          if (index < 0) break
          const node = model.nodes[rows[index]]
          if (node.kind === 'object' || node.kind === 'array') {
            event.preventDefault()
            if (model.isExpanded(node.id)) {
              const kids = model.childrenOf(node.id)
              if (kids.length) setSelected(kids[0])
            } else {
              model.expand(node.id)
              setExpandSeq((v) => v + 1)
            }
          }
          break
        }
        case 'ArrowLeft': {
          if (index < 0) break
          const node = model.nodes[rows[index]]
          event.preventDefault()
          if ((node.kind === 'object' || node.kind === 'array') && model.isExpanded(node.id)) {
            model.collapse(node.id)
            setExpandSeq((v) => v + 1)
          } else if (node.parent > 0) {
            setSelected(node.parent)
          }
          break
        }
        case 'Enter':
        case ' ': {
          if (index < 0) break
          event.preventDefault()
          const node = model.nodes[rows[index]]
          if (node.kind === 'object' || node.kind === 'array') {
            model.toggle(node.id)
            setExpandSeq((v) => v + 1)
          } else {
            setModalNode(node.id)
          }
          break
        }
        default:
          break
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [mode, model, rows, selected, selectedNode, treeVisible, searchOpen, modalNode, settingsOpen, editorOpen, settings.indent, copy, t])

  /* Scroll the selected row into view when it changes by keyboard. */
  useEffect(() => {
    if (selected == null) return
    if (treeVisible) pendingScroll.current = selected
    setExpandSeq((v) => v + 1)
  }, [selected, treeVisible])

  /* --------------------------------------------------------------- paste -- */

  useEffect(() => {
    if (mode === 'embed') return
    const onPaste = (event: ClipboardEvent) => {
      if (editorOpen) return
      if (event.composedPath().some((node) => node instanceof HTMLElement && (
        node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.isContentEditable
      ))) return
      const pasted = event.clipboardData?.getData('text/plain')
      if (!pasted) return
      event.preventDefault()
      load(pasted)
      pushToast(t('loadedPaste'))
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [mode, editorOpen, load, pushToast, t])

  /* ------------------------------------------------------------ actions -- */

  const handleToggle = useCallback(
    (id: number) => {
      if (!model) return
      model.toggle(id)
      setExpandSeq((v) => v + 1)
    },
    [model],
  )

  const handleExpandAll = useCallback(() => {
    if (!model) return
    model.expandAll()
    setExpandSeq((v) => v + 1)
  }, [model])

  const handleCollapseAll = useCallback(() => {
    if (!model) return
    model.collapseAll()
    setExpandSeq((v) => v + 1)
    setSelected(null)
  }, [model])

  const handlePretty = useCallback(
    (indent: IndentOption) => {
      if (!doc?.result.ok) return
      updateSettings({ indent })
      setView('raw')
      load(stringify(doc.result.value, indent))
      pushToast(t('prettyDone', { indent: indent === 'tab' ? 'Tab' : `${indent}` }))
    },
    [doc, load, pushToast, updateSettings, t],
  )

  const handleMinify = useCallback(() => {
    if (!doc?.result.ok) return
    setView('raw')
    load(minifyValue(doc.result.value))
    setPreserveSourceLayout(true)
    pushToast(t('minified'))
  }, [doc, load, pushToast, t])

  const handleSortKeys = useCallback(() => {
    const next = !settings.sortKeys
    updateSettings({ sortKeys: next })
    if (text) load(text, { sortKeys: next })
    pushToast(next ? t('sorted') : t('originalOrder'))
  }, [settings.sortKeys, text, load, pushToast, updateSettings, t])

  const handleClear = useCallback(() => {
    load('')
    setView('raw')
    pushToast(t('cleared'))
  }, [load, pushToast, t])

  const handlePasteButton = useCallback(async () => {
    try {
      const fromClipboard = await navigator.clipboard.readText()
      if (fromClipboard?.trim()) {
        load(fromClipboard)
        pushToast(t('clipboardLoaded'))
        return
      }
      pushToast(t('clipboardEmpty'), 'info')
    } catch {
      pushToast(t('clipboardDenied'), 'danger')
    }
  }, [load, pushToast, t])

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      try {
        const content = await readFile(file)
        load(content)
        pushToast(t('openedFile', { name: file.name }))
      } catch {
        pushToast(t('fileReadFailed'), 'danger')
      }
    },
    [load, pushToast, t],
  )

  const handleSample = useCallback(
    (id: string) => {
      const sample = sampleById(id)
      if (sample) {
        load(sample.text)
        const sampleName = t(sample.id === 'api' ? 'sampleApi' : sample.id === 'config' ? 'sampleConfig' : 'sampleBig')
        pushToast(t('loadedSample', { name: sampleName }))
      }
    },
    [load, pushToast, t],
  )

  const handleEdit = useCallback(() => {
    if (editorOpen) {
      editorFocus.current?.()
      return
    }
    setView('raw')
    setSearchOpen(false)
    setQuery('')
    setEditorInitialText(displayText)
    setEditorOpen(true)
  }, [displayText, editorOpen])

  const handleApplyEdit = useCallback((next: string) => {
    setEditorOpen(false)
    setView('raw')
    load(next)
    pushToast(t('editApplied'))
  }, [load, pushToast, t])

  /* --------------------------------------------------------------- view -- */

  const animate = settings.animations && performance.now() < animateUntil
  const hasModel = !!model
  const hasText = text.trim().length > 0

  const rootClass = ['jr-root']
  if (compact) rootClass.push('is-compact')
  if (mode === 'embed') rootClass.push('is-embed')

  const statusNote = doc?.result.notes.length ? doc.result.notes.join(' · ') : null

  return (
    <I18nProvider locale={settings.language}>
    <div
      ref={rootRef}
      class={rootClass.join(' ')}
      lang={settings.language === 'zh' ? 'zh-CN' : 'en'}
      data-theme={theme}
      data-palette={settings.palette}
      data-motion={settings.animations ? 'on' : 'off'}
      style={rootVars(settings.fontSize, settings.fontFamily) as JSX.CSSProperties}
      onDragOver={(event) => {
        event.preventDefault()
        if (mode !== 'embed' && !editorOpen && !dragging) setDragging(true)
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        if (mode !== 'embed' && !editorOpen) void handleFiles(event.dataTransfer?.files ?? null)
      }}
    >
      <Toolbar
        view={view}
        onView={setView}
        visualView={visualView}
        onVisualView={(next) => {
          setVisualView(next)
          setVisualCollapsed(false)
        }}
        visualOpen={!visualCollapsed}
        hasDoc={hasModel}
        hasText={hasText}
        searchOpen={searchOpen}
        onToggleSearch={() => {
          setSearchOpen((open) => {
            if (!open) requestAnimationFrame(() => searchInput.current?.focus())
            return !open
          })
        }}
        editing={editorOpen}
        onEdit={handleEdit}
        onCopyAll={() => void copy(text, t('copiedAll'))}
        onDownload={() => downloadText(suggestFilename(props.source ?? undefined), text)}
        onOpenFile={() => fileInput.current?.click()}
        onPaste={() => void handlePasteButton()}
        onClear={handleClear}
        onReload={() => load(text)}
        onOpenSettings={() => setSettingsOpen(true)}
        language={settings.language}
        onLanguage={(language) => updateSettings({ language })}
        density={compact ? 'compact' : 'full'}
        showBrand={props.showBrand ?? mode === 'page'}
        onClose={props.onClose}
        extra={props.headerExtra}
      />

      {searchOpen && (
        <SearchBar
          query={query}
          onQuery={setQuery}
          regex={regex}
          caseSensitive={caseSensitive}
          onlyMatches={onlyMatches}
          onToggle={(key) => {
            if (key === 'regex') setRegex((v) => !v)
            else if (key === 'caseSensitive') setCaseSensitive((v) => !v)
            else setOnlyMatches((v) => !v)
          }}
          count={hitTotal}
          index={hitIndex}
          truncated={searchTruncated}
          busy={searchBusy}
          invalid={regexInvalid}
          onPrev={() => gotoHit(-1)}
          onNext={() => gotoHit(1)}
          onClose={() => {
            setSearchOpen(false)
            setQuery('')
          }}
          inputRef={searchInput}
        />
      )}

      <div class="jr-banners">
        {doc?.result.ok && doc.result.notes.length > 0 && (
          <div class="jr-banner is-info">
            <Info />
            <span class="jr-banner-text">{t('repaired', { notes: doc.result.notes.join(settings.language === 'zh' ? '、' : ', ') })}</span>
          </div>
        )}
        {model?.nodeLimitHit && (
          <div class="jr-banner">
            <Info />
            <span class="jr-banner-text">
              {t('nodeLimit', { count: settings.maxNodes.toLocaleString() })}
            </span>
          </div>
        )}
        {model?.rowLimitHit && (
          <div class="jr-banner">
            <Info />
            <span class="jr-banner-text">{t('rowLimit')}</span>
          </div>
        )}
      </div>

      <div class="jr-body">
        {!doc && !busy && !editorOpen && (
          <EmptyState
            compact={compact}
            onPaste={() => void handlePasteButton()}
            onPickFile={() => fileInput.current?.click()}
            onSample={handleSample}
            extra={props.emptyExtra}
          />
        )}

        {splitLayout && doc?.result.ok && model && (
          <SplitWorkspace
            rightMode={visualView}
            rightCollapsed={visualCollapsed}
            onRightCollapsedChange={setVisualCollapsed}
            showGrid={settings.showGrid}
            onToggleGrid={() => updateSettings({ showGrid: !settings.showGrid })}
            compactGraph={settings.compactGraph}
            onToggleCompactGraph={() => updateSettings({ compactGraph: !settings.compactGraph })}
            left={editorOpen ? (
              <JsonEditor
                initialText={editorInitialText}
                indent={settings.indent}
                theme={theme}
                focusRef={editorFocus}
                onApply={handleApplyEdit}
                onCancel={() => setEditorOpen(false)}
              />
            ) : (
              <RawView
                lines={lines}
                query={query}
                regex={regex}
                caseSensitive={caseSensitive}
                wrap={settings.wrapLines}
                showLineNumbers={settings.showLineNumbers}
                errorLine={null}
                hitLines={rawHitSet}
                currentHitLine={currentHitLine}
                scrollRef={scrollRef}
              />
            )}
            right={
              visualView === 'graph' ? (
                <GraphView
                  model={model}
                  expandSeq={expandSeq}
                  selected={selected}
                  currentHitId={null}
                  hitSet={hitSet}
                  query={query}
                  regex={regex}
                  caseSensitive={caseSensitive}
                  animate={animate}
                  fontSize={settings.fontSize}
                  fontFamily={settings.fontFamily}
                  showGrid={settings.showGrid}
                  showGridControl={false}
                  compactGraph={settings.compactGraph}
                  showStyleControl={false}
                  onToggleGrid={() => updateSettings({ showGrid: !settings.showGrid })}
                  onToggleCompactGraph={() => updateSettings({ compactGraph: !settings.compactGraph })}
                  onToggle={handleToggle}
                  onSelect={setSelected}
                  onOpen={setModalNode}
                />
              ) : (
                <TreeView
                  model={model}
                  rows={rows}
                  hitSet={hitSet}
                  currentHitId={null}
                  selected={selected}
                  query={query}
                  regex={regex}
                  caseSensitive={caseSensitive}
                  animate={animate}
                  scrollRef={treeScrollRef}
                  onToggle={handleToggle}
                  onSelect={setSelected}
                  onOpen={setModalNode}
                />
              )
            }
          />
        )}

        {editorOpen && !splitLayout && (
          <JsonEditor
            initialText={editorInitialText}
            indent={settings.indent}
            theme={theme}
            focusRef={editorFocus}
            onApply={handleApplyEdit}
            onCancel={() => setEditorOpen(false)}
          />
        )}

        {doc && !splitLayout && !editorOpen && view === 'raw' && (
          <RawView
            lines={lines}
            query={query}
            regex={regex}
            caseSensitive={caseSensitive}
            wrap={settings.wrapLines}
            showLineNumbers={settings.showLineNumbers}
            errorLine={doc.result.error?.line ?? null}
            hitLines={rawHitSet}
            currentHitLine={currentHitLine}
            scrollRef={scrollRef}
          />
        )}

        {doc && !doc.result.ok && !editorOpen && view === 'tree' && doc.result.error && (
          <ErrorView
            error={doc.result.error}
            onOpenRaw={() => setView('raw')}
            onPickFile={() => fileInput.current?.click()}
            onCopyError={() =>
              void copy(
                `${doc.result.error?.message} · ${t('errorAt', {
                  line: doc.result.error?.line ?? 0,
                  column: doc.result.error?.column ?? 0,
                  position: doc.result.error?.position ?? 0,
                })}`,
                t('copiedError'),
              )
            }
          />
        )}

        {doc?.result.ok && !splitLayout && !editorOpen && view === 'graph' && model && (
          <GraphView
            model={model}
            expandSeq={expandSeq}
            selected={selected}
            currentHitId={currentHitId}
            hitSet={hitSet}
            query={query}
            regex={regex}
            caseSensitive={caseSensitive}
            animate={animate}
            fontSize={settings.fontSize}
            fontFamily={settings.fontFamily}
            showGrid={settings.showGrid}
            compactGraph={settings.compactGraph}
            onToggleGrid={() => updateSettings({ showGrid: !settings.showGrid })}
            onToggleCompactGraph={() => updateSettings({ compactGraph: !settings.compactGraph })}
            onToggle={handleToggle}
            onSelect={setSelected}
            onOpen={setModalNode}
          />
        )}

        {doc?.result.ok && !splitLayout && !editorOpen && view === 'tree' && model && (
          <TreeView
            model={model}
            rows={rows}
            hitSet={hitSet}
            currentHitId={currentHitId}
            selected={selected}
            query={query}
            regex={regex}
            caseSensitive={caseSensitive}
            animate={animate}
            scrollRef={scrollRef}
            onToggle={handleToggle}
            onSelect={setSelected}
            onOpen={setModalNode}
          />
        )}

        {busy && (
          <div class="jr-loading">
            <div class="jr-spinner" />
            <div class="jr-loading-text">{t('parsing')}</div>
          </div>
        )}

        {dragging && (
          <div class="jr-veil">
            <div class="jr-veil-box">
              <Upload size={28} />
              {t('dropToOpen')}
            </div>
          </div>
        )}

        {modalNode != null && model && model.nodes[modalNode] && (
          <DetailModal
            node={model.nodes[modalNode]}
            model={model}
            indent={settings.indent === 'tab' ? 'tab' : settings.indent}
            onClose={() => setModalNode(null)}
            onCopy={(value, label) => void copy(value, label)}
          />
        )}

        {settingsOpen && (
          <SettingsPanel
            settings={settings}
            hasDoc={hasModel}
            onChange={updateSettings}
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
            onPretty={handlePretty}
            onMinify={handleMinify}
            onSortKeys={handleSortKeys}
            onClose={() => setSettingsOpen(false)}
          />
        )}

        <Toasts toasts={toasts} />
      </div>

      <StatusBar
        stats={doc?.stats ?? null}
        rows={activeSearchView === 'graph' ? null : activeSearchView === 'raw' ? lines.length : rows.length}
        note={statusNote}
        source={props.source ?? null}
        path={selectedPath}
        canDetail={!!selectedNode}
        limitHit={!!(model?.nodeLimitHit || model?.rowLimitHit)}
        format={doc?.result.format ?? 'json'}
        error={doc && !doc.result.ok ? t('parseFailed') : null}
        hitSummary={
          query && activeSearchView !== 'raw' && hits.length
            ? t('hitSummary', { count: `${hits.length}${searchTruncated ? '+' : ''}`, ms: Math.round(searchMs) })
            : null
        }
        onCopyPath={() => selectedPath && void copy(selectedPath, t('copiedPath'))}
        onOpenDetail={() => selected != null && setModalNode(selected)}
      />

      <input
        ref={fileInput}
        type="file"
        accept=".json,.jsonl,.ndjson,.geojson,.txt,application/json,text/plain"
        style={{ display: 'none' }}
        onChange={(event) => {
          const input = event.currentTarget as HTMLInputElement
          void handleFiles(input.files)
          input.value = ''
        }}
      />
    </div>
    </I18nProvider>
  )
}
