import type { ComponentChildren, JSX } from 'preact'

interface IconProps {
  size?: number
  class?: string
}

function svg(children: ComponentChildren, { size = 16, class: cls }: IconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      class={cls}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/* ------------------------------------------------------------------- brand -- */

const BRAND_J = 'M8.2 6.5h9.4M16.4 6.5v8.9c0 3.1-2.2 4.8-5.1 4.8-2.5 0-4.1-1.3-4.8-3.3'

export function BrandMark({ size = 22, class: cls }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} class={cls} aria-hidden="true">
      <rect x="0" y="0" width="24" height="24" rx="5" fill="#f7f4f0" />
      <rect
        x="0.35"
        y="0.35"
        width="23.3"
        height="23.3"
        rx="4.65"
        fill="none"
        stroke="#d9d0cb"
        strokeWidth="0.7"
      />
      <path d={BRAND_J} fill="none" stroke="#2b2630" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="5.8" y="11.5" width="2" height="2" rx="0.45" fill="#c46059" />
    </svg>
  )
}

/* ------------------------------------------------------------------- icons -- */

const DISCLOSURE_TRIANGLE_PATH = 'M5 3L13 8L5 13Z'

export function DisclosureTriangle({ size = 16, class: cls }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" class={cls} aria-hidden="true">
      <path d={DISCLOSURE_TRIANGLE_PATH} />
    </svg>
  )
}


export const ArrowUp = (p: IconProps) => svg(<path d="M12 19V5M5 12l7-7 7 7" />, p)
export const ArrowDown = (p: IconProps) => svg(<path d="M12 5v14M19 12l-7 7-7-7" />, p)
export const Search = (p: IconProps) => svg(<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>, p)
export const Close = (p: IconProps) => svg(<path d="M18 6L6 18M6 6l12 12" />, p)
export const Copy = (p: IconProps) =>
  svg(
    <>
      <rect x="9" y="9" width="12" height="12" rx="2.5" />
      <path d="M5 15V5.5A1.5 1.5 0 016.5 4H15" />
    </>,
    p,
  )
export const Check = (p: IconProps) => svg(<path d="M20 6L9 17l-5-5" />, p)
export const Download = (p: IconProps) =>
  svg(<><path d="M12 3v12M7 11l5 5 5-5" /><path d="M4 20h16" /></>, p)
export const ExpandAll = (p: IconProps) =>
  svg(<><path d="M8 4L12 8l4-4" /><path d="M8 20l4-4 4 4" /><path d="M12 8v8" /></>, p)
export const CollapseAll = (p: IconProps) =>
  svg(<><path d="M8 8l4-4 4 4" /><path d="M8 16l4 4 4-4" /><path d="M12 4v16" /></>, p)
export const Sun = (p: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>,
    p,
  )
export const Moon = (p: IconProps) => svg(<path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />, p)
export const AutoTheme = (p: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17a8.5 8.5 0 000-17z" fill="currentColor" stroke="none" />
    </>,
    p,
  )
export const Palette = (p: IconProps) =>
  svg(
    <>
      <path d="M12 3a9 9 0 100 18h1.4a1.8 1.8 0 001.2-3.2 1.8 1.8 0 011.2-3.2H18a3 3 0 003-3C21 6.9 17 3 12 3z" />
      <circle cx="7.5" cy="10" r=".7" fill="currentColor" stroke="none" />
      <circle cx="10" cy="6.8" r=".7" fill="currentColor" stroke="none" />
      <circle cx="14" cy="6.8" r=".7" fill="currentColor" stroke="none" />
      <circle cx="16.6" cy="10" r=".7" fill="currentColor" stroke="none" />
    </>,
    p,
  )
export const Settings = (p: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z" />
    </>,
    p,
  )
export const Alert = (p: IconProps) =>
  svg(
    <>
      <path d="M10.3 3.9L1.9 18a2 2 0 001.7 3h16.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>,
    p,
  )
export const Info = (p: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </>,
    p,
  )

export const Code = (p: IconProps) => svg(<path d="M15 5l7 7-7 7M9 5l-7 7 7 7" />, p)
export const Clipboard = (p: IconProps) =>
  svg(
    <>
      <rect x="8" y="3" width="8" height="4" rx="1.5" />
      <path d="M16 5h1.5A1.5 1.5 0 0119 6.5v13A1.5 1.5 0 0117.5 21h-11A1.5 1.5 0 015 19.5v-13A1.5 1.5 0 016.5 5H8" />
    </>,
    p,
  )
export const Pencil = (p: IconProps) =>
  svg(
    <>
      <path d="M4 20l4.2-.9L19 8.3a2 2 0 00-2.8-2.8L5.4 16.3 4 20z" />
      <path d="M14.8 6.9l2.8 2.8" />
    </>,
    p,
  )
export const FileJson = (p: IconProps) =>
  svg(
    <>
      <path d="M14 3v5h5" />
      <path d="M19 8v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2h7z" />
      <path d="M10 12.5c-.8 0-1.2.4-1.2 1.1v.7c0 .5-.3.8-.8.9.5.1.8.4.8.9v.7c0 .7.4 1.1 1.2 1.1M14 12.5c.8 0 1.2.4 1.2 1.1v.7c0 .5.3.8.8.9-.5.1-.8.4-.8.9v.7c0 .7-.4 1.1-1.2 1.1" />
    </>,
    p,
  )
export const Upload = (p: IconProps) =>
  svg(<><path d="M12 20V8M7 12l5-5 5 5" /><path d="M4 4h16" /></>, p)
export const Trash = (p: IconProps) =>
  svg(
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
      <path d="M6 7l1 12.2A1.8 1.8 0 008.8 21h6.4a1.8 1.8 0 001.8-1.8L18 7" />
    </>,
    p,
  )
export const Dots = (p: IconProps) =>
  svg(
    <>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>,
    p,
  )
export const Sort = (p: IconProps) =>
  svg(<><path d="M4 7h11M4 12h8M4 17h5" /><path d="M17 9l3-3 3 3" /><path d="M20 6v12" /></>, p)

export const Wand = (p: IconProps) =>
  svg(
    <>
      <path d="M5 19L17 7" />
      <path d="M14 4l1 1M20 10l1 1M17 3l.5 2.5L20 6l-2.5.5L17 9l-.5-2.5L14 6l2.5-.5z" />
      <path d="M4 14l1 1M8 4l.5 2L10 6.5 8.5 7 8 9l-.5-2L6 6.5 7.5 6z" />
    </>,
    p,
  )
export const Regex = (p: IconProps) =>
  svg(
    <>
      <path d="M12 4v8" />
      <path d="M8.5 6l7 4M15.5 6l-7 4" />
      <circle cx="6" cy="18" r="1.6" />
    </>,
    p,
  )
export const CaseSensitive = (p: IconProps) => svg(<path d="M3 18l4.5-12L12 18M4.6 14h5.8M15 18V7M15 12.5c1.2-1.4 5-1.9 5 1.2V18" />, p)
export const Filter = (p: IconProps) => svg(<path d="M4 5h16l-6.2 7.3V19l-3.6 2v-8.7z" />, p)
export const ExternalLink = (p: IconProps) =>
  svg(
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4l-8.5 8.5" />
      <path d="M18 14v4.5A1.5 1.5 0 0116.5 20h-11A1.5 1.5 0 014 18.5v-11A1.5 1.5 0 015.5 6H10" />
    </>,
    p,
  )
export const Refresh = (p: IconProps) =>
  svg(
    <>
      <path d="M20 12a8 8 0 11-2.3-5.6" />
      <path d="M20 4v5h-5" />
    </>,
    p,
  )
export const Play = (p: IconProps) => svg(<path d="M7 4.5l12 7.5-12 7.5z" />, p)

export const Plus = (p: IconProps) => svg(<path d="M12 5v14M5 12h14" />, p)
export const Minus = (p: IconProps) => svg(<path d="M5 12h14" />, p)
export const Fit = (p: IconProps) =>
  svg(
    <>
      <path d="M9 3H5.5A1.5 1.5 0 004 4.5V8" />
      <path d="M15 3h3.5A1.5 1.5 0 0120 4.5V8" />
      <path d="M20 16v3.5a1.5 1.5 0 01-1.5 1.5H15" />
      <path d="M4 16v3.5A1.5 1.5 0 005.5 21H9" />
      <rect x="8.5" y="8.5" width="7" height="7" rx="1.6" />
    </>,
    p,
  )
export const Graph = (p: IconProps) =>
  svg(
    <>
      <rect x="2.5" y="9" width="6" height="6" rx="1.8" />
      <rect x="15.5" y="2.5" width="6" height="6" rx="1.8" />
      <rect x="15.5" y="15.5" width="6" height="6" rx="1.8" />
      <path d="M8.5 11.4l7-6.4M8.5 12.6l7 6.4" />
    </>,
    p,
  )

export const Tree = (p: IconProps) =>
  svg(
    <>
      <path d="M4 4v16M4 7h6M4 14h6" />
      <rect x="10" y="4" width="10" height="6" rx="1.5" />
      <rect x="10" y="11" width="10" height="6" rx="1.5" />
    </>,
    p,
  )

export const Grid = (p: IconProps) =>
  svg(
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </>,
    p,
  )

export const Cards = (p: IconProps) =>
  svg(
    <>
      <rect x="2" y="3.5" width="11" height="17" rx="2" />
      <path d="M2 9h11M2 14.5h11M13 12h3.5" />
      <rect x="16.5" y="7" width="5.5" height="10" rx="1.5" />
      <path d="M18.5 10h1.5M18.5 14h1.5" />
    </>,
    p,
  )

export const PanelLeft = (p: IconProps) =>
  svg(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16M14 9l-3 3 3 3" />
    </>,
    p,
  )

export const PanelRight = (p: IconProps) =>
  svg(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M15 4v16M10 9l3 3-3 3" />
    </>,
    p,
  )
