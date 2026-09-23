/**
 * Shadow-DOM mounting for the two in-page surfaces.
 *
 * Everything the viewer needs — Preact, the component styles, the design tokens — is
 * bundled into the content script and injected as a single `<style>` inside the shadow
 * root. That means no `web_accessible_resources`, no extra network requests, and no chance
 * of a page's CSS reaching the UI.
 */
import { render } from 'preact'
import { JsonoraApp } from '@/ui/App'
import { openOptions } from '@/platform/env'
import { resolveTheme, type Settings } from '@/platform/settings'
import tokensCss from '@/ui/styles/tokens.css?inline'
import appCss from '@/ui/styles/app.css?inline'

const HOST_ATTR = 'data-jsonora'

const SHADOW_STYLE = `
:host { all: initial; }
:host, * { box-sizing: border-box; }
`

function styles(): string {
  return `${tokensCss}\n${appCss}\n${SHADOW_STYLE}`
}

/** Inline `!important` beats any page rule, including one with `!important` of its own. */
function pinHost(host: HTMLElement, values: Record<string, string>): void {
  for (const [prop, value] of Object.entries(values)) {
    host.style.setProperty(prop, value, 'important')
  }
}

export interface OverlayHandle {
  destroy(): void
}

export interface OverlayOptions {
  text: string
  source: string
  onDestroy: () => void
}

export function mountOverlay(options: OverlayOptions): OverlayHandle {
  document.getElementById('jsonora-overlay')?.remove()

  const host = document.createElement('div')
  host.id = 'jsonora-overlay'
  host.setAttribute(HOST_ATTR, 'overlay')
  pinHost(host, {
    position: 'fixed',
    inset: '0',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    width: '100%',
    height: '100%',
    'z-index': '2147483647',
    display: 'block',
    margin: '0',
    padding: '0',
    border: '0',
    transform: 'none',
    filter: 'none',
    opacity: '1',
    visibility: 'visible',
    'pointer-events': 'auto',
    'background-color': 'transparent',
  })

  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = styles()
  shadow.appendChild(style)

  const container = document.createElement('div')
  container.style.cssText = 'display:block;height:100%;'
  shadow.appendChild(container)

  // Keep the page from scrolling behind the overlay.
  const root = document.documentElement
  const body = document.body
  const prevRootOverflow = root.style.getPropertyValue('overflow')
  const prevRootPriority = root.style.getPropertyPriority('overflow')
  const prevBodyOverflow = body?.style.getPropertyValue('overflow') ?? ''
  const prevBodyPriority = body?.style.getPropertyPriority('overflow') ?? ''
  root.style.setProperty('overflow', 'hidden', 'important')
  body?.style.setProperty('overflow', 'hidden', 'important')

  root.appendChild(host)

  let destroyed = false
  const destroy = () => {
    if (destroyed) return
    destroyed = true
    render(null, container)
    host.remove()
    root.style.removeProperty('overflow')
    if (prevRootOverflow) root.style.setProperty('overflow', prevRootOverflow, prevRootPriority)
    if (body) {
      body.style.removeProperty('overflow')
      if (prevBodyOverflow) body.style.setProperty('overflow', prevBodyOverflow, prevBodyPriority)
    }
    options.onDestroy()
  }

  render(
    <JsonoraApp
      mode="page"
      initialText={options.text}
      source={options.source}
      onClose={destroy}
      onOpenSettings={() => void openOptions()}
    />,
    container,
  )

  return { destroy }
}

export interface InlineHandle {
  destroy(): void
}

/** Renders one `<pre>` block as an embedded, self-scrolling viewer. */
export function mountInline(pre: HTMLElement, text: string): InlineHandle {
  const host = document.createElement('div')
  host.setAttribute(HOST_ATTR, 'inline')
  pinHost(host, {
    display: 'block',
    height: '520px',
    'max-height': '70vh',
    margin: '10px 0',
    'min-width': '0',
  })

  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = styles()
  shadow.appendChild(style)

  const container = document.createElement('div')
  container.style.cssText = 'display:block;height:100%;'
  shadow.appendChild(container)

  const previousDisplay = pre.style.getPropertyValue('display')
  const previousPriority = pre.style.getPropertyPriority('display')
  pre.style.setProperty('display', 'none', 'important')
  pre.parentNode?.insertBefore(host, pre.nextSibling)

  const destroy = () => {
    render(null, container)
    host.remove()
    pre.style.removeProperty('display')
    if (previousDisplay) pre.style.setProperty('display', previousDisplay, previousPriority)
  }

  render(
    <JsonoraApp
      mode="embed"
      initialText={text}
      showBrand={false}
      onClose={destroy}
      onOpenSettings={() => void openOptions()}
    />,
    container,
  )

  return { destroy }
}

export interface PillHandle {
  destroy(): void
}

/**
 * The bottom-right affordance offered on ordinary pages that contain JSON samples.
 * Dismissal is remembered per page load rather than persisted — a persistent hide would be
 * more annoying than the button.
 */
export function showPill(
  count: number,
  onRender: () => void,
  settings?: Pick<Settings, 'language' | 'theme' | 'palette'>,
): PillHandle {
  const host = document.createElement('div')
  host.setAttribute(HOST_ATTR, 'pill')
  pinHost(host, {
    position: 'fixed',
    right: '18px',
    bottom: '18px',
    'z-index': '2147483000',
    display: 'block',
    width: 'auto',
    height: 'auto',
    margin: '0',
    padding: '0',
    border: '0',
  })

  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = `${tokensCss}\n${PILL_CSS}`
  shadow.appendChild(style)

  const wrap = document.createElement('div')
  wrap.className = 'jr-root'
  wrap.lang = settings?.language === 'en' ? 'en' : 'zh-CN'
  wrap.dataset.theme = resolveTheme(settings?.theme ?? 'auto')
  wrap.dataset.palette = settings?.palette ?? 'vscode'
  shadow.appendChild(wrap)

  const destroy = () => host.remove()

  render(
    <div class="jr-pill">
      <button
        class="jr-pill-main"
        type="button"
        onClick={() => {
          onRender()
          destroy()
        }}
      >
        <span class="jr-pill-mark">{'{ }'}</span>
        {settings?.language === 'en' ? `Render ${count} JSON ${count === 1 ? 'block' : 'blocks'}` : `渲染 ${count} 段 JSON`}
      </button>
      <button class="jr-pill-close" type="button" title={settings?.language === 'en' ? 'Dismiss' : '不再提示'} onClick={destroy}>
        ×
      </button>
    </div>,
    wrap,
  )

  document.documentElement.appendChild(host)
  return { destroy }
}

const PILL_CSS = `
.jr-pill {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow);
  font-family: var(--font-ui);
  animation: jrPillIn 260ms cubic-bezier(.22,1,.36,1);
}
.jr-pill-main {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 30px;
  padding: 0 14px 0 10px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 520;
  cursor: pointer;
  transition: background 120ms ease;
}
.jr-pill-main:hover { background: var(--surface-hover); }
.jr-pill-mark {
  display: inline-grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: var(--brand-gradient);
  color: var(--brand-stroke);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: -.04em;
}
.jr-pill-close {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-faint);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
}
.jr-pill-close:hover { background: var(--surface-hover); color: var(--text); }
@keyframes jrPillIn { from { opacity: 0; transform: translateY(10px) scale(.94); } }
`
