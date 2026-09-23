import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { render } from 'preact'
import { JsonoraApp } from '@/ui/App'
import { putPending } from '@/platform/handoff'
import { openViewer } from '@/platform/env'
import { formatBytes } from '@/core/format'
import { useResolvedTheme, useSettings } from '@/ui/useSettings'
import { rootVars } from '@/ui/metrics'
import { ExternalLink, Refresh, Search, Trash } from '@/ui/Icons'
import '@/ui/styles/index.css'

interface Entry {
  id: number
  url: string
  method: string
  status: number
  mimeType: string
  size: number
  time: number
  request: chrome.devtools.network.Request
}

const MAX_ENTRIES = 200

function statusClass(status: number): string {
  if (status >= 400) return 'jr-status-code is-danger'
  if (status >= 300) return 'jr-status-code is-warn'
  if (status >= 200) return 'jr-status-code is-ok'
  return 'jr-status-code'
}

function shortUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.pathname + parsed.search
  } catch {
    return url
  }
}

function Panel() {
  const [settings] = useSettings()
  const theme = useResolvedTheme(settings.theme)
  const en = settings.language === 'en'
  const [entries, setEntries] = useState<Entry[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [text, setText] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.devtools?.network) return

    const onFinished = (request: chrome.devtools.network.Request) => {
      const mime = request.response.content.mimeType ?? ''
      if (!/json/i.test(mime)) return
      setEntries((list) =>
        [
          {
            id: ++seq.current,
            url: request.request.url,
            method: request.request.method,
            status: request.response.status,
            mimeType: mime,
            size: request.response.content.size ?? 0,
            time: request.time ?? 0,
            request,
          },
          ...list,
        ].slice(0, MAX_ENTRIES),
      )
    }

    chrome.devtools.network.onRequestFinished.addListener(onFinished)
    return () => chrome.devtools.network.onRequestFinished.removeListener(onFinished)
  }, [])

  const select = useCallback((entry: Entry) => {
    setActiveId(entry.id)
    setError(null)
    setLoading(true)
    setText(undefined)

    try {
      entry.request.getContent((content, encoding) => {
        setLoading(false)
        if (content == null) {
          setError(en ? 'The response body is unavailable; Chrome may have discarded or cached it.' : '无法读取响应体（可能已被浏览器丢弃，或请求来自缓存）')
          setText(undefined)
          return
        }
        if (encoding === 'base64') {
          try {
            const bytes = Uint8Array.from(atob(content), (char) => char.charCodeAt(0))
            setText(new TextDecoder('utf-8').decode(bytes))
          } catch {
            setText(content)
          }
        } else {
          setText(content)
        }
      })
    } catch {
      setLoading(false)
      setError(en ? 'Could not read the response body' : '读取响应体失败')
    }
  }, [en])

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    if (!needle) return entries
    return entries.filter(
      (entry) =>
        entry.url.toLowerCase().includes(needle) || String(entry.status).includes(needle),
    )
  }, [entries, filter])

  const active = entries.find((entry) => entry.id === activeId) ?? null

  const openInTab = useCallback(async () => {
    if (!text) return
    const stored = await putPending({ text, source: active?.url ?? 'DevTools' })
    if (stored) await openViewer({ src: 'pending' })
  }, [text, active])

  return (
    <div class="jr-root" lang={en ? 'en' : 'zh-CN'} data-theme={theme} data-palette={settings.palette} data-motion={settings.animations ? 'on' : 'off'} style={rootVars(settings.fontSize, settings.fontFamily)}>
      <div class="jr-panel">
        <aside class="jr-panel-list">
          <div class="jr-panel-list-head">
            <label class="jr-search-field">
              <Search size={14} />
              <input
                class="jr-search-input"
                type="text"
                spellcheck={false}
                placeholder={en ? 'Filter requests…' : '过滤请求…'}
                value={filter}
                onInput={(event) => setFilter((event.currentTarget as HTMLInputElement).value)}
              />
            </label>
            <button
              class="jr-btn"
              type="button"
              title={en ? 'Clear list' : '清空列表'}
              aria-label={en ? 'Clear list' : '清空列表'}
              disabled={!entries.length}
              onClick={() => {
                setEntries([])
                setActiveId(null)
                setText(undefined)
              }}
            >
              <Trash />
            </button>
          </div>

          <div class="jr-panel-list-body">
            {filtered.length === 0 && (
              <div class="jr-panel-empty">
                {entries.length === 0 ? (
                  <>
                    {en ? 'JSON responses recorded after opening this panel appear here.' : '打开本面板后产生的 JSON 响应会出现在这里。'}
                    <br />
                    {en ? 'Trigger a request in Network or refresh the page.' : '去 Network 面板触发一次请求，或刷新页面。'}
                  </>
                ) : (
                  (en ? 'No matching requests' : '没有匹配的请求')
                )}
              </div>
            )}

            {filtered.map((entry) => (
              <button
                key={entry.id}
                type="button"
                class={entry.id === activeId ? 'jr-panel-item is-active' : 'jr-panel-item'}
                title={entry.url}
                onClick={() => select(entry)}
              >
                <span class="jr-panel-url">{shortUrl(entry.url)}</span>
                <span class="jr-panel-meta">
                  <span class="jr-method">{entry.method}</span>
                  <span class={statusClass(entry.status)}>{entry.status}</span>
                  <span>{formatBytes(entry.size)}</span>
                  <span>{Math.round(entry.time)} ms</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main class="jr-panel-main">
          {text === undefined && !loading ? (
            <div class="jr-panel-empty">
              {error ?? (en ? 'Select a JSON response from the left to inspect it.' : '从左侧选择一个 JSON 响应，即可在这里查看。')}
            </div>
          ) : (
            <JsonoraApp
              mode="panel"
              initialText={text}
              source={active ? shortUrl(active.url) : null}
              showBrand={false}
              headerExtra={
                <button
                  class="jr-btn"
                  type="button"
                  title={en ? 'Open in a new tab' : '在新标签页中打开'}
                  aria-label={en ? 'Open in a new tab' : '在新标签页中打开'}
                  disabled={!text}
                  onClick={() => void openInTab()}
                >
                  <ExternalLink />
                </button>
              }
            />
          )}
          {loading && (
            <div class="jr-loading">
              <div class="jr-spinner" />
              <div class="jr-loading-text">{en ? 'Reading response body…' : '正在读取响应体…'}</div>
            </div>
          )}
          {error && text !== undefined && (
            <div class="jr-banners" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5 }}>
              <div class="jr-banner">
                <Refresh size={14} />
                <span class="jr-banner-text">{error}</span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

render(<Panel />, document.getElementById('app') as HTMLElement)
