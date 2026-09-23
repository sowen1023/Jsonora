import type { Settings } from '@/platform/settings'
import { AutoTheme, Moon, Palette, Sun } from './Icons'
import { Menu, type MenuEntry } from './Menu'
import { useI18n } from './i18n'

interface ThemeMenuProps {
  value: Settings['theme']
  onChange: (theme: Settings['theme']) => void
}

export function ThemeMenu({ value, onChange }: ThemeMenuProps) {
  const { t } = useI18n()
  const labels: Record<Settings['theme'], string> = {
    auto: t('themeAuto'),
    light: t('themeLight'),
    dark: t('themeDark'),
  }
  const entries: MenuEntry[] = [
    {
      label: labels.auto,
      hint: 'OS',
      icon: <AutoTheme size={14} />,
      checked: value === 'auto',
      onClick: () => onChange('auto'),
    },
    {
      label: labels.light,
      icon: <Sun size={14} />,
      checked: value === 'light',
      onClick: () => onChange('light'),
    },
    {
      label: labels.dark,
      icon: <Moon size={14} />,
      checked: value === 'dark',
      onClick: () => onChange('dark'),
    },
  ]

  return <Menu entries={entries} title={t('themeTitle', { theme: labels[value] })} icon={<Palette />} />
}
