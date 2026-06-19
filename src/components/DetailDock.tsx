import { useEffect, type ReactNode } from 'react'

// =============================================================================
// DetailDock — keeps a detail panel ALWAYS in view next to an interactive grid.
//
//   Desktop (>= lg): renders inline as a sticky right-rail (the parent lays it
//   out in a 2-col grid). Click tile after tile and watch it update in place,
//   zero scrolling.
//
//   Mobile (< lg): renders as a fixed, centered bottom-sheet / modal with a
//   backdrop — so the detail is always on-screen the instant you tap, never
//   below the fold.
//
// Escape key and backdrop click both close (mobile). The desktop rail shows an
// empty-state prompt when nothing is selected so the layout never collapses.
// =============================================================================

interface DetailDockProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Shown in the desktop rail when nothing is selected. */
  emptyState?: ReactNode
}

export default function DetailDock({ open, onClose, children, emptyState }: DetailDockProps) {
  // Escape-to-close (only relevant while the mobile sheet is open).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {/* ===== Desktop: sticky right-rail (>= lg) ===== */}
      <div className="hidden lg:block">
        <div className="sticky top-24">
          {open ? (
            <div className="animate-scale-in">{children}</div>
          ) : (
            emptyState ?? <DefaultEmptyState />
          )}
        </div>
      </div>

      {/* ===== Mobile: fixed bottom-sheet / modal (< lg) ===== */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <button
            aria-label="Close details"
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
          />
          {/* Sheet */}
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl animate-slide-up"
          >
            {children}
          </div>
        </div>
      )}
    </>
  )
}

function DefaultEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      </div>
      <p className="text-sm text-gray-400 font-medium">Click any tile to explore the details</p>
      <p className="text-xs text-gray-600 mt-1">The panel updates here as you click — no scrolling.</p>
    </div>
  )
}
