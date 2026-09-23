/**
 * Clipboard writes that work from every surface we render in: extension pages, a shadow
 * root injected into an arbitrary site, and the devtools panel. `navigator.clipboard`
 * needs focus and a secure context, so there is an `execCommand` fallback for the cases
 * where a page has stolen focus or the document is not focused yet.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the legacy path */
  }
  return legacyCopy(text)
}

function legacyCopy(text: string): boolean {
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0;pointer-events:none'
    document.body.appendChild(area)
    area.select()
    area.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  } catch {
    return false
  }
}
