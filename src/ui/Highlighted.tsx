import { Fragment } from 'preact'
import { findRanges } from '@/core/highlight'

interface HighlightedProps {
  text: string
  query: string
  regex: boolean
  caseSensitive: boolean
  /** Marks every hit in this run as the active one. */
  current?: boolean
  class?: string
}

/**
 * Renders `text` with search hits wrapped in `<mark>`. Ranges are recomputed per row
 * rather than stored, which keeps the model free of search state and means a query change
 * costs nothing beyond the rows actually on screen.
 */
export function Highlighted(props: HighlightedProps) {
  const { text, query, regex, caseSensitive, current, class: cls } = props

  if (!query) return <span class={cls}>{text}</span>

  const ranges = findRanges(text, query, { regex, caseSensitive })
  if (!ranges.length) return <span class={cls}>{text}</span>

  const parts: (string | { hit: string })[] = []
  let pos = 0
  for (const [start, end] of ranges) {
    if (start > pos) parts.push(text.slice(pos, start))
    parts.push({ hit: text.slice(start, end) })
    pos = end
  }
  if (pos < text.length) parts.push(text.slice(pos))

  return (
    <span class={cls}>
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          <Fragment key={i}>{part}</Fragment>
        ) : (
          <mark key={i} class={current ? 'jr-hit is-current' : 'jr-hit'}>
            {part.hit}
          </mark>
        ),
      )}
    </span>
  )
}
