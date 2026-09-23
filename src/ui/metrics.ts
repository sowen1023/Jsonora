import type { JSX } from 'preact'
import type { CodeFont } from '@/platform/settings'

/** Row height, indent step and raw-view line height, mirrored into CSS as custom properties. */
export const ROW_H = 24
export const INDENT = 16
export const RAW_LINE_H = 22

export const CODE_FONT_STACKS: Record<CodeFont, string> = {
  modern:
    "'JetBrains Mono', 'Cascadia Code', Menlo, Monaco, 'SFMono-Regular', Consolas, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', monospace",
  system:
    "ui-monospace, 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', monospace",
  sans:
    "Inter, 'Avenir Next', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI Variable Text', 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei UI', system-ui, sans-serif",
}

export function rootVars(fontSize: number, fontFamily: CodeFont = 'modern'): JSX.CSSProperties {
  return {
    '--row-h': `${ROW_H}px`,
    '--indent': `${INDENT}px`,
    '--raw-line-h': `${RAW_LINE_H}px`,
    '--font-size': `${fontSize}px`,
    '--font-mono': CODE_FONT_STACKS[fontFamily],
  } as JSX.CSSProperties
}
