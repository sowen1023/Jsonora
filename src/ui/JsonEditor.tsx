import { useEffect, useRef, useState } from 'preact/hooks'
import type { RefObject } from 'preact'
import { Compartment, EditorState } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { json } from '@codemirror/lang-json'
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  HighlightStyle,
  indentUnit,
  syntaxHighlighting,
} from '@codemirror/language'
import { tags } from '@lezer/highlight'
import type { IndentOption } from '@/core/format'
import { parseJson } from '@/core/parse'
import { Alert, Check, Pencil } from './Icons'
import { useI18n } from './i18n'

function foldMarker(open: boolean): HTMLElement {
  const marker = document.createElement('span')
  marker.className = open ? 'jr-fold-icon' : 'jr-fold-icon is-collapsed'
  marker.setAttribute('aria-hidden', 'true')
  return marker
}

const jsonHighlight = HighlightStyle.define([
  { tag: tags.string, color: 'var(--t-string)' },
  { tag: tags.propertyName, color: 'var(--t-key)' },
  { tag: tags.number, color: 'var(--t-number)' },
  { tag: tags.bool, color: 'var(--t-bool)' },
  { tag: tags.null, color: 'var(--t-null)', fontStyle: 'italic' },
  { tag: [tags.brace, tags.squareBracket], color: 'var(--t-brace)' },
  { tag: tags.punctuation, color: 'var(--t-punct)' },
])

function editorTheme(dark: boolean) {
  return EditorView.theme({
    '&': {
      height: '100%',
      backgroundColor: 'var(--bg)',
      color: 'var(--text)',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--font-size)',
    },
    '&.cm-focused': { outline: '1px solid var(--accent-ring)', outlineOffset: '-1px' },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'inherit',
      lineHeight: 'var(--raw-line-h)',
      scrollbarWidth: 'thin',
      scrollbarColor: 'var(--border-strong) transparent',
    },
    '.cm-content': { padding: '6px 0 10px', caretColor: 'var(--text)' },
    '.cm-line': { padding: '0 12px' },
    '.cm-gutters': {
      backgroundColor: 'var(--bg)',
      color: 'var(--text-faint)',
      borderRight: '1px solid var(--border)',
    },
    '.cm-lineNumbers .cm-gutterElement': { minWidth: '3ch', padding: '0 4px 0 8px' },
    '.cm-foldGutter .cm-gutterElement': {
      padding: '0 7px 0 3px',
      color: 'var(--text-dim)',
      cursor: 'pointer',
    },
    '.cm-foldGutter .cm-gutterElement:hover': { color: 'var(--text)' },
    '.cm-activeLine': { backgroundColor: 'var(--surface-hover)' },
    '.cm-activeLineGutter': { backgroundColor: 'var(--surface-hover)', color: 'var(--text-dim)' },
    '.cm-cursor': { borderLeftColor: 'var(--text)' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'color-mix(in srgb, var(--accent) 28%, transparent)',
    },
    '.cm-foldPlaceholder': {
      margin: '0 5px',
      padding: '0 6px',
      border: '1px solid var(--border-strong)',
      borderRadius: '4px',
      backgroundColor: 'var(--surface)',
      color: 'var(--text-dim)',
    },
    '.cm-matchingBracket': { backgroundColor: 'var(--accent-soft)', outline: '1px solid var(--accent-ring)' },
  }, { dark })
}

interface JsonEditorProps {
  initialText: string
  indent: IndentOption
  theme: 'light' | 'dark'
  focusRef: RefObject<() => void>
  onApply: (text: string) => void
  onCancel: () => void
}

export function JsonEditor(props: JsonEditorProps) {
  const { t } = useI18n()
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const themeSlot = useRef(new Compartment())
  const indentSlot = useRef(new Compartment())
  const applyRef = useRef<() => void>(() => {})
  const [error, setError] = useState<string | null>(null)

  applyRef.current = () => {
    const draft = viewRef.current?.state.doc.toString() ?? props.initialText
    if (!draft.trim()) {
      setError(t('editEmpty'))
      return
    }
    const result = parseJson(draft)
    if (!result.ok) {
      const detail = result.error
      setError(detail
        ? `${detail.message} · ${t('errorAt', {
            line: detail.line,
            column: detail.column,
            position: detail.position,
          })}`
        : t('cannotParse'))
      return
    }
    props.onApply(draft)
  }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const view = new EditorView({
      doc: props.initialText,
      selection: { anchor: 0 },
      parent: host,
      root: host.getRootNode() as Document | ShadowRoot,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        foldGutter({ markerDOM: foldMarker }),
        history(),
        drawSelection(),
        highlightActiveLine(),
        bracketMatching(),
        json(),
        syntaxHighlighting(jsonHighlight),
        themeSlot.current.of(editorTheme(props.theme === 'dark')),
        indentSlot.current.of([
          indentUnit.of(props.indent === 'tab' ? '\t' : ' '.repeat(props.indent)),
          EditorState.tabSize.of(props.indent === 'tab' ? 4 : props.indent),
        ]),
        keymap.of([
          { key: 'Mod-Enter', run: () => { applyRef.current(); return true } },
          indentWithTab,
          ...foldKeymap,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) setError(null)
        }),
      ],
    })
    viewRef.current = view
    props.focusRef.current = () => view.focus()
    view.focus()
    return () => {
      props.focusRef.current = null
      viewRef.current = null
      view.destroy()
    }
  }, [props.initialText, props.focusRef])

  useEffect(() => {
    viewRef.current?.dispatch({ effects: themeSlot.current.reconfigure(editorTheme(props.theme === 'dark')) })
  }, [props.theme])

  useEffect(() => {
    viewRef.current?.dispatch({ effects: indentSlot.current.reconfigure([
      indentUnit.of(props.indent === 'tab' ? '\t' : ' '.repeat(props.indent)),
      EditorState.tabSize.of(props.indent === 'tab' ? 4 : props.indent),
    ]) })
  }, [props.indent])

  return (
    <div class="jr-editor">
      <div class="jr-editor-head">
        <div class="jr-editor-title"><Pencil size={14} />{t('editJson')}</div>
        <span class="jr-spacer" />
        <button class="jr-btn" type="button" onClick={props.onCancel}>{t('editCancel')}</button>
        <button class="jr-btn jr-editor-apply" type="button" onClick={() => applyRef.current()}>
          <Check size={13} />{t('editApply')}
        </button>
      </div>
      <div class="jr-editor-cm" ref={hostRef} />
      <div class={error ? 'jr-editor-foot is-error' : 'jr-editor-foot'} role={error ? 'alert' : undefined}>
        {error && <Alert size={13} />}
        <span>{error ?? t('editHint')}</span>
      </div>
    </div>
  )
}
