import { useEffect, useState } from 'preact/hooks'
import { render } from 'preact'
import { JsonoraApp } from '@/ui/App'
import { sampleById } from '@/ui/samples'
import { openOptions } from '@/platform/env'
import { takePending } from '@/platform/handoff'
import '@/ui/styles/index.css'

/**
 * The full-page viewer. Content arrives one of three ways:
 *   `?src=pending` — a payload parked by the content script, the context menu or the popup
 *   `?sample=<id>` — one of the built-in examples
 *   `?text=<json>` — short inline payloads
 */
function Viewer() {
  const [text, setText] = useState<string | undefined>(undefined)
  const [source, setSource] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const inline = params.get('text')
    const sample = params.get('sample')

    if (sample) {
      setText(sampleById(sample)?.text)
      return
    }
    if (inline) {
      setText(inline)
      return
    }
    if (params.get('src') === 'pending') {
      void takePending().then((payload) => {
        if (!payload) return
        setText(payload.text)
        setSource(payload.source ?? null)
      })
      return
    }
    if (import.meta.env.DEV) setText(sampleById('api')?.text)
  }, [])

  return (
    <JsonoraApp
      mode="page"
      initialText={text}
      source={source}
      onOpenSettings={() => void openOptions()}
    />
  )
}

render(<Viewer />, document.getElementById('app') as HTMLElement)
