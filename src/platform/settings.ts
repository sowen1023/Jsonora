import type { IndentOption } from '@/core/format'
import { hasChrome } from './env'

export type ThemeMode = 'auto' | 'dark' | 'light'
export type PaletteName = 'vscode' | 'github' | 'github-dimmed' | 'github-contrast'
export type CodeFont = 'jetbrains' | 'fira' | 'inconsolata' | 'menlo' | 'monaco' | 'courier'

export interface Settings {
  /** Allows one-time migration of preferences that previously had different defaults. */
  settingsVersion: number
  /** Brightness is independent from the colour palette. */
  theme: ThemeMode
  /** Every palette has both a light and a dark appearance. */
  palette: PaletteName
  /** Interface language. JSON content is never translated. */
  language: 'zh' | 'en'
  /** Take over the page when the document itself is a JSON response. */
  autoRender: boolean
  /** Offer an inline render button for JSON-looking `<pre>` blocks on normal pages. */
  inlineBlocks: boolean
  indent: IndentOption
  fontSize: number
  /** Font stack used by JSON, tree and graph content. */
  fontFamily: CodeFont
  animations: boolean
  sortKeys: boolean
  /** Levels expanded when a document loads. */
  expandDepth: number
  maxNodes: number
  wrapLines: boolean
  showLineNumbers: boolean
  /** Optional graph-paper backdrop. Off by default to keep the canvas quiet. */
  showGrid: boolean
  /** Group direct object fields into a single JSON-Crack-style card. */
  compactGraph: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  settingsVersion: 2,
  theme: 'auto',
  palette: 'vscode',
  language: 'zh',
  autoRender: true,
  inlineBlocks: true,
  indent: 2,
  fontSize: 13,
  fontFamily: 'jetbrains',
  animations: true,
  sortKeys: false,
  expandDepth: 1,
  maxNodes: 300_000,
  wrapLines: false,
  showLineNumbers: true,
  showGrid: false,
  compactGraph: true,
}

const KEY = 'settings'
const LOCAL_KEY = 'jsonora.settings'

type Listener = (settings: Settings) => void

const listeners = new Set<Listener>()
let cached: Settings | null = null

function isTheme(value: unknown): value is Settings['theme'] {
  return ['auto', 'dark', 'light'].includes(String(value))
}

function isLanguage(value: unknown): value is Settings['language'] {
  return value === 'zh' || value === 'en'
}

function isPalette(value: unknown): value is Settings['palette'] {
  return value === 'vscode' || value === 'github' || value === 'github-dimmed' || value === 'github-contrast'
}

function isFontFamily(value: unknown): value is Settings['fontFamily'] {
  return value === 'jetbrains' || value === 'fira' || value === 'inconsolata'
    || value === 'menlo' || value === 'monaco' || value === 'courier'
}

function area(): chrome.storage.StorageArea | null {
  if (!hasChrome) return null
  return chrome.storage?.sync ?? chrome.storage?.local ?? null
}

export function normalizeSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS }
  const partial = raw as Partial<Settings>
  // The two experimental Qevi Studio colour schemes existed briefly. Migrate them to
  // the equivalent brightness while keeping the user's preference intact.
  const legacyTheme = String(partial.theme)
  const theme = isTheme(partial.theme)
    ? partial.theme
    : legacyTheme === 'spectrum'
      ? 'dark'
      : legacyTheme === 'soft'
        ? 'light'
        : DEFAULT_SETTINGS.theme
  const language = isLanguage(partial.language) ? partial.language : DEFAULT_SETTINGS.language
  const palette = isPalette(partial.palette)
    ? partial.palette
    : partial.palette === 'violet'
      ? 'github-dimmed'
      : partial.palette === 'graphite' || partial.palette === 'ocean'
        ? 'github'
        : DEFAULT_SETTINGS.palette
  const compactGraph = partial.settingsVersion === DEFAULT_SETTINGS.settingsVersion
    && typeof partial.compactGraph === 'boolean'
      ? partial.compactGraph
      : DEFAULT_SETTINGS.compactGraph
  // Retired generic choices (modern/system/sans) migrate to a concrete bundled face.
  const fontFamily = isFontFamily(partial.fontFamily)
    ? partial.fontFamily
    : DEFAULT_SETTINGS.fontFamily
  return {
    ...DEFAULT_SETTINGS, ...partial, theme, palette, language, fontFamily, compactGraph,
    settingsVersion: DEFAULT_SETTINGS.settingsVersion,
  }
}

export async function loadSettings(): Promise<Settings> {
  if (cached) return cached

  const store = area()
  if (store) {
    try {
      const got = await store.get(KEY)
      cached = normalizeSettings(got?.[KEY])
      return cached
    } catch {
      /* fall through to defaults */
    }
  } else {
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      cached = normalizeSettings(raw ? JSON.parse(raw) : null)
      return cached
    } catch {
      /* fall through to defaults */
    }
  }

  cached = { ...DEFAULT_SETTINGS }
  return cached
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(cached ?? DEFAULT_SETTINGS), ...patch }
  cached = next

  const store = area()
  if (store) {
    try {
      await store.set({ [KEY]: next })
    } catch {
      /* ignore */
    }
  } else {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  for (const listener of listeners) listener(next)
  return next
}

export async function resetSettings(): Promise<Settings> {
  return saveSettings({ ...DEFAULT_SETTINGS })
}

/** Subscribes to settings changes from any context (including other tabs). */
export function subscribeSettings(listener: Listener): () => void {
  listeners.add(listener)

  let detach: (() => void) | undefined
  if (hasChrome && chrome.storage?.onChanged) {
    const handler = (
      changes: Record<string, chrome.storage.StorageChange>,
      namespace: string,
    ) => {
      if (namespace !== 'sync' && namespace !== 'local') return
      if (!changes[KEY]) return
      cached = normalizeSettings(changes[KEY].newValue)
      listener(cached)
    }
    chrome.storage.onChanged.addListener(handler)
    detach = () => chrome.storage.onChanged.removeListener(handler)
  }

  return () => {
    listeners.delete(listener)
    detach?.()
  }
}

export type ResolvedTheme = Exclude<Settings['theme'], 'auto'>

export function resolveTheme(theme: Settings['theme']): ResolvedTheme {
  if (theme !== 'auto') return theme
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}
