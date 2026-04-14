import { useEffect } from 'react'
import { useGraphStore } from '../store/graphStore'

export default function ToastContainer() {
  const toasts = useGraphStore((state) => state.toasts)
  const dismissToast = useGraphStore((state) => state.dismissToast)

  return (
    <div className="absolute top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} id={toast.id} message={toast.message} onDismiss={dismissToast} />
      ))}
    </div>
  )
}

function Toast({ id, message, onDismiss }: { id: string; message: string; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), 4000)
    return () => clearTimeout(timer)
  }, [id, onDismiss])

  return (
    <div className="pointer-events-auto flex items-center gap-3 bg-[#2a2a32] border border-white/15 rounded-xl px-4 py-3 shadow-xl text-sm text-white/80 animate-slide-in">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-yellow-400 shrink-0">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span className="flex-1">{message}</span>
      <button
        onClick={() => onDismiss(id)}
        className="text-white/30 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
