import jetbrains400 from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?inline'
import jetbrains500 from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2?inline'
import fira400 from '@fontsource/fira-code/files/fira-code-latin-400-normal.woff2?inline'
import fira500 from '@fontsource/fira-code/files/fira-code-latin-500-normal.woff2?inline'
import inconsolata400 from '@fontsource/inconsolata/files/inconsolata-latin-400-normal.woff2?inline'
import inconsolata500 from '@fontsource/inconsolata/files/inconsolata-latin-500-normal.woff2?inline'

const FACES = [
  ['Jsonora JetBrains Mono', 400, jetbrains400],
  ['Jsonora JetBrains Mono', 500, jetbrains500],
  ['Jsonora Fira Code', 400, fira400],
  ['Jsonora Fira Code', 500, fira500],
  ['Jsonora Inconsolata', 400, inconsolata400],
  ['Jsonora Inconsolata', 500, inconsolata500],
] as const

let loading: Promise<void> | undefined

function bytesFromDataUrl(url: string): ArrayBuffer {
  const base64 = url.slice(url.indexOf(',') + 1)
  const binary = atob(base64)
  const bytes = new ArrayBuffer(binary.length)
  const view = new Uint8Array(bytes)
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Shadow-root @font-face rules are not reliably registered in document.fonts. Add the
 * bundled bytes directly instead: this also lets canvas measure the same faces as the UI.
 * Names are scoped to Jsonora so the page's own fonts cannot override them.
 */
export function ensureCodeFonts(): Promise<void> {
  if (loading) return loading
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') return Promise.resolve()

  loading = Promise.all(FACES.map(async ([family, weight, url]) => {
    try {
      const face = new FontFace(family, bytesFromDataUrl(url), {
        style: 'normal',
        weight: String(weight),
      })
      await face.load()
      document.fonts.add(face)
    } catch {
      // A platform that cannot decode WOFF2 still gets the local fallback stack.
    }
  })).then(() => undefined)
  return loading
}
