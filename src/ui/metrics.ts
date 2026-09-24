import type { JSX } from 'preact'
import type { CodeFont } from '@/platform/settings'

/** Row height, indent step and raw-view line height, mirrored into CSS as custom properties. */
export const ROW_H = 24
export const INDENT = 16
export const RAW_LINE_H = 22

export const CODE_FONT_CHOICES: readonly { value: CodeFont; label: string }[] = [
  { value: 'jetbrains', label: 'JetBrains Mono' },
  { value: 'fira', label: 'Fira Code' },
  { value: 'inconsolata', label: 'Inconsolata' },
  { value: 'menlo', label: 'Menlo' },
  { value: 'monaco', label: 'Monaco' },
  { value: 'courier', label: 'Courier New' },
]

export const CODE_FONT_STACKS: Record<CodeFont, string> = {
  jetbrains:
    "'Jsonora JetBrains Mono', Menlo, Consolas, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', monospace",
  fira:
    "'Jsonora Fira Code', Menlo, Consolas, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', monospace",
  inconsolata:
    "'Jsonora Inconsolata', Menlo, Consolas, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', monospace",
  menlo:
    "Menlo, Consolas, 'Liberation Mono', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', monospace",
  monaco:
    "Monaco, Menlo, Consolas, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', monospace",
  courier:
    "'Courier New', Courier, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', monospace",
}

export function rootVars(fontSize: number, fontFamily: CodeFont = 'jetbrains'): JSX.CSSProperties {
  return {
    '--row-h': `${ROW_H}px`,
    '--indent': `${INDENT}px`,
    '--raw-line-h': `${RAW_LINE_H}px`,
    '--font-size': `${fontSize}px`,
    '--font-mono': CODE_FONT_STACKS[fontFamily],
  } as JSX.CSSProperties
}
