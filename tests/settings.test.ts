import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, normalizeSettings } from '@/platform/settings'

describe('settings migration', () => {
  it('defaults to VS Code, compact graph and no grid', () => {
    const settings = normalizeSettings(null)
    expect(settings.palette).toBe('vscode')
    expect(settings.compactGraph).toBe(true)
    expect(settings.showGrid).toBe(false)
  })

  it('moves old palettes and the former expanded-graph default to current choices', () => {
    expect(normalizeSettings({ palette: 'graphite', compactGraph: false })).toMatchObject({
      palette: 'github', compactGraph: true,
    })
    expect(normalizeSettings({ palette: 'ocean' }).palette).toBe('github')
    expect(normalizeSettings({ palette: 'violet' }).palette).toBe('github-dimmed')
  })

  it('preserves an explicit layout choice in the current settings version', () => {
    expect(normalizeSettings({
      settingsVersion: DEFAULT_SETTINGS.settingsVersion,
      palette: 'github-contrast',
      compactGraph: false,
    })).toMatchObject({ palette: 'github-contrast', compactGraph: false })
  })
})
