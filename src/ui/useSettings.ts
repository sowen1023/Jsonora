import { useCallback, useEffect, useState } from 'preact/hooks'
import { DEFAULT_SETTINGS, loadSettings, saveSettings, subscribeSettings } from '@/platform/settings'
import type { ResolvedTheme, Settings } from '@/platform/settings'

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  useEffect(() => {
    let alive = true
    void loadSettings().then((loaded) => {
      if (alive) setSettings(loaded)
    })
    const unsubscribe = subscribeSettings((next) => setSettings(next))
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  const update = useCallback((patch: Partial<Settings>) => {
    void saveSettings(patch)
  }, [])

  return [settings, update]
}

/** Resolves `auto` against the OS preference and keeps it live. */
export function useResolvedTheme(theme: Settings['theme']): ResolvedTheme {
  const [system, setSystem] = useState<'dark' | 'light'>(() =>
    typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  )

  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const handler = () => setSystem(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return theme === 'auto' ? system : theme
}
