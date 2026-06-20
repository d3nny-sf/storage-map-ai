import { useEffect, useRef, useState } from 'react'

interface StepView {
  id: string
  name: string
  description: string
}

interface StepperBarProps {
  views: StepView[]
  activeView: string
  currentIndex: number
  totalSteps: number
  progressPct: number
  onSelect: (id: string) => void
}

/**
 * Guided-sequence stepper that docks under the sticky nav.
 *
 * - Expanded (page top): roomy chips with the per-step sub-label.
 * - Stuck (scrolled): condenses to a single-line bar — number + name only —
 *   so wayfinding stays visible the whole time without eating the canvas.
 */
export default function StepperBar({
  views,
  activeView,
  currentIndex,
  totalSteps,
  progressPct,
  onSelect,
}: StepperBarProps) {
  const [stuck, setStuck] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // A zero-height sentinel sits just above the sticky bar. When it scrolls out
  // of view, the bar is "stuck" and we switch to the condensed layout.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { rootMargin: '-64px 0px 0px 0px', threshold: 0 }, // -64px = nav height
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="h-0" />
      <div
        className={`sticky top-16 z-40 bg-dark/95 backdrop-blur-lg border-b border-white/10 transition-all duration-300 ${
          stuck ? 'shadow-lg shadow-black/30' : ''
        }`}
      >
        <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-10">
          {/* Progress bar */}
          <div className={`flex items-center gap-3 transition-all duration-300 ${stuck ? 'pt-2.5' : 'pt-4'}`}>
            <span className="text-xs font-semibold text-gray-400 tabular-nums whitespace-nowrap">
              STEP {currentIndex + 1} <span className="text-gray-600">/ {totalSteps}</span>
            </span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full shimmer-bar rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Numbered step chips — equal-width grid keeps all steps on one line */}
          <div
            className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 transition-all duration-300 ${
              stuck ? 'py-2.5' : 'py-4'
            }`}
          >
            {views.map((view, index) => {
              const isActive = activeView === view.id
              const isVisited = index < currentIndex
              return (
                <button
                  key={view.id}
                  onClick={() => onSelect(view.id)}
                  aria-current={isActive ? 'step' : undefined}
                  className={`group relative flex items-center gap-2 min-w-0 rounded-lg font-medium text-sm transition-all duration-200 ${
                    stuck ? 'pl-2 pr-2.5 py-1.5' : 'pl-2 pr-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-raspberry text-white shadow-lg shadow-raspberry/40'
                      : 'bg-white/8 text-gray-200 hover:bg-white/15 border border-white/15 hover:border-white/25'
                  }`}
                >
                  {/* Step number badge */}
                  <span
                    className={`flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold transition-all ${
                      stuck ? 'w-5 h-5' : 'w-6 h-6'
                    } ${
                      isActive
                        ? 'bg-white text-raspberry'
                        : isVisited
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white/15 text-gray-300 group-hover:bg-white/25'
                    }`}
                  >
                    {isVisited ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="text-left min-w-0 flex-1">
                    <span className="block font-semibold leading-tight truncate">{view.name}</span>
                    {/* Sub-label only in the expanded state — collapses away when stuck */}
                    {!stuck && (
                      <span className={`block text-xs mt-0.5 truncate ${isActive ? 'text-white/70' : 'opacity-60'}`}>
                        {view.description}
                      </span>
                    )}
                  </span>
                  {!stuck && index === 0 && currentIndex === 0 && (
                    <span
                      className="absolute -top-2 -right-2 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full shadow-lg"
                      style={{ boxShadow: '0 0 8px rgba(34,197,94,0.6)' }}
                    >
                      START HERE
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
