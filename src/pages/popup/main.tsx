import { useCallback, useEffect, useState } from 'preact/hooks'
import { render } from 'preact'
import { parseJson } from '@/core/parse'
import { stringify } from '@/core/format'
import {
  activeTab,
  hasChrome,
  openOptions,
  openViewer,
  sendToTab,
  type ProbeResult,
} from '@/platform/env'
import { putPending } from '@/platform/handoff'
import { useResolvedTheme, useSettings } from '@/ui/useSettings'
import { rootVars } from '@/ui/metrics'
import { BrandMark, ExternalLink, Play, Settings as SettingsIcon } from '@/ui/Icons'
import { ThemeMenu } from '@/ui/ThemeMenu'
import { I18nProvider } from '@/ui/i18n'
import '@/ui/styles/index.css'

type Msg = { text: string; tone: 'info' | 'danger' | 'warn' } | null

function Popup() {
  const [settings, updateSettings] = useSettings()
  const theme = useResolvedTheme(settings.theme)
  const en = settings.language === 'en'
  const c = en
    ? {
        noJson: 'No JSON found on this page', tooLarge: 'Content is too large to pass to the viewer',
        source: 'Pasted from the popup', detecting: 'Inspecting the current page…',
        dev: 'Development mode: extension APIs unavailable', inaccessible: 'Scripts cannot run on this page',
        rendered: 'JSON is rendered on this page', response: 'This is a JSON response',
        blocks: (count: number) => `${count} JSON blocks found`, none: 'No JSON detected',
        current: 'Current page', render: 'Render on page', retry: 'Refresh and retry', quick: 'Quick paste',
        placeholder: 'Paste JSON, then press ⌘↵ to open\n{"hello": "world"}',
        openFormatted: 'Format and open', openViewer: 'Open viewer', search: 'Search',
        expand: 'Expand all', paste: 'Paste', settings: 'Settings',
      }
    : {
        noJson: '这个页面里没有找到 JSON', tooLarge: '内容太大，无法传递到查看器',
        source: '来自弹窗粘贴', detecting: '正在检测当前页面…', dev: '开发模式：未接入扩展 API',
        inaccessible: '当前页面无法注入脚本（chrome:// 或商店页面）', rendered: '已在此页面渲染 JSON',
        response: '这是一个 JSON 响应', blocks: (count: number) => `页面里有 ${count} 段 JSON 代码块`,
        none: '未检测到 JSON', current: '当前页面', render: '在页面上渲染', retry: '刷新页面后重试',
        quick: '快速粘贴', placeholder: '粘贴 JSON 后按 ⌘↵ 打开查看器\n{"hello": "world"}',
        openFormatted: '格式化并打开', openViewer: '打开查看器', search: '搜索', expand: '展开全部',
        paste: '粘贴', settings: '设置',
      }
  const [tabId, setTabId] = useState<number | null>(null)
  const [tabUrl, setTabUrl] = useState<string>('')
  const [probe, setProbe] = useState<ProbeResult | null>(null)
  const [probed, setProbed] = useState(false)
  const [draft, setDraft] = useState('')
  const [msg, setMsg] = useState<Msg>(null)

  useEffect(() => {
    void (async () => {
      const tab = await activeTab()
      if (!tab?.id) {
        setProbed(true)
        return
      }
      setTabId(tab.id)
      setTabUrl(tab.url ?? '')
      setProbe(await sendToTab(tab.id, { type: 'jsonora:probe' }))
      setProbed(true)
    })()
  }, [])

  const flash = useCallback((text: string, tone: Msg extends null ? never : 'info' | 'danger' | 'warn' = 'info') => {
    setMsg({ text, tone })
    setTimeout(() => setMsg(null), 2600)
  }, [])

  const renderOnPage = useCallback(async () => {
    if (tabId == null) return
    const result = await sendToTab(tabId, { type: 'jsonora:render' })
    if (result?.mounted) {
      window.close()
      return
    }
    flash(c.noJson, 'warn')
  }, [tabId, flash, c.noJson])

  const reloadTab = useCallback(async () => {
    if (tabId == null || !hasChrome) return
    await chrome.tabs.reload(tabId)
    window.close()
  }, [tabId])

  const openDraft = useCallback(async () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    const parsed = parseJson(trimmed)
    const text = parsed.ok ? stringify(parsed.value, settings.indent) : trimmed
    const stored = await putPending({ text, source: c.source })
    if (!stored) {
      flash(c.tooLarge, 'danger')
      return
    }
    await openViewer({ src: 'pending' })
    window.close()
  }, [draft, settings.indent, flash, c.source, c.tooLarge])

  const statusTone = !probed ? 'warn' : probe?.mounted ? 'info' : probe?.isJson ? 'info' : 'warn'
  const statusText = !probed
    ? c.detecting
    : !hasChrome
      ? c.dev
      : probe == null
        ? c.inaccessible
        : probe.mounted
          ? c.rendered
          : probe.isJson
            ? c.response
            : probe.blocks > 0
              ? c.blocks(probe.blocks)
              : c.none

  return (
    <I18nProvider locale={settings.language}>
    <div
      class="jr-root jr-popup"
      lang={settings.language === 'zh' ? 'zh-CN' : 'en'}
      data-theme={theme}
      data-palette={settings.palette}
      data-motion={settings.animations ? 'on' : 'off'}
      style={rootVars(settings.fontSize, settings.fontFamily)}
    >
      <header class="jr-header">
        <div class="jr-brand">
          <BrandMark class="jr-brand-mark" size={22} />
          <span class="jr-brand-name">Jsonora</span>
        </div>
        <span class="jr-spacer" />
        <div class="jr-tools">
          <ThemeMenu value={settings.theme} onChange={(theme) => updateSettings({ theme })} />
          <button
            class="jr-btn"
            type="button"
            title={c.settings}
            aria-label={c.settings}
            onClick={() => void openOptions()}
          >
            <SettingsIcon />
          </button>
        </div>
      </header>

      <div class="jr-popup-body">
        <div class="jr-card">
          <div class="jr-card-title">
            <span class={`jr-dot${statusTone === 'warn' ? ' is-warn' : ''}`} />
            {c.current}
          </div>
          <div class="jr-stat">
            <span>{statusText}</span>
          </div>
          {probe?.source && (
            <div class="jr-stat-sub" title={probe.source}>
              {probe.source}
              {probe.bytes ? ` · ${(probe.bytes / 1024).toFixed(1)} KB` : ''}
            </div>
          )}
          {!probe?.source && tabUrl && (
            <div class="jr-stat-sub" title={tabUrl}>
              {tabUrl}
            </div>
          )}

          <div class="jr-row-actions">
            <button
              class="jr-btn is-primary"
              type="button"
              disabled={tabId == null || probe?.mounted}
              onClick={() => void renderOnPage()}
            >
              <Play size={13} />
              {c.render}
            </button>
            {probed && probe == null && tabId != null && (
              <button class="jr-btn is-ghost" type="button" onClick={() => void reloadTab()}>
                {c.retry}
              </button>
            )}
          </div>
        </div>

        <div class="jr-card">
          <div class="jr-card-title">{c.quick}</div>
          <textarea
            class="jr-textarea"
            spellcheck={false}
            placeholder={c.placeholder}
            value={draft}
            onInput={(event) => setDraft((event.currentTarget as HTMLTextAreaElement).value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault()
                void openDraft()
              }
            }}
          />
          <div class="jr-row-actions">
            <button
              class="jr-btn is-ghost"
              type="button"
              disabled={!draft.trim()}
              onClick={() => void openDraft()}
            >
              <ExternalLink size={13} />
              {c.openFormatted}
            </button>
            <button
              class="jr-btn is-ghost"
              type="button"
              onClick={() => void openViewer()}
            >
              {c.openViewer}
            </button>
          </div>
        </div>

        {msg && (
          <div class={`jr-popup-msg${msg.tone === 'info' ? '' : ` is-${msg.tone}`}`}>{msg.text}</div>
        )}

        <div class="jr-kbd-row">
          <span>
            <span class="jr-kbd">⌘</span>
            <span class="jr-kbd">F</span> {c.search}
          </span>
          <span>
            <span class="jr-kbd">⌘</span>
            <span class="jr-kbd">⇧</span>
            <span class="jr-kbd">E</span> {c.expand}
          </span>
          <span>
            <span class="jr-kbd">⌘</span>
            <span class="jr-kbd">V</span> {c.paste}
          </span>
        </div>
      </div>
    </div>
    </I18nProvider>
  )
}

render(<Popup />, document.getElementById('app') as HTMLElement)
