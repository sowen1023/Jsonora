import { Alert, Check, Info } from './Icons'

export interface Toast {
  id: number
  text: string
  tone: 'ok' | 'danger' | 'info'
}

export function Toasts({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null
  return (
    <div class="jr-toasts">
      {toasts.map((toast) => (
        <div key={toast.id} class={`jr-toast is-${toast.tone}`} role="status">
          {toast.tone === 'ok' ? <Check /> : toast.tone === 'danger' ? <Alert /> : <Info />}
          {toast.text}
        </div>
      ))}
    </div>
  )
}
