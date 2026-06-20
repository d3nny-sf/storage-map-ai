import type { ReactNode } from 'react'
import { useState } from 'react'

interface PageHeaderProps {
  title: string
  subtitle: string
  description: string
  children?: ReactNode
}

export function PageHeader({ title, subtitle, description, children }: PageHeaderProps) {
  // Compact by default — the orientation copy is read once, so it's tucked
  // behind a "What is this?" disclosure to reclaim working real estate.
  const [showDescription, setShowDescription] = useState(false)

  return (
    <div className="relative cosmos-bg text-white py-8 sm:py-10 overflow-hidden">
      {/* OUTTA SITE backdrop — twinkling starfield + drifting aurora */}
      <div className="starfield opacity-60" />
      <div className="aurora w-[28rem] h-[28rem] bg-raspberry/25 -top-32 -right-24" />
      <div className="aurora w-72 h-72 bg-accent-blue/20 -bottom-24 -left-16" style={{ animationDelay: '-6s' }} />

      {/* Grid overlay */}
      <div className="absolute inset-0 pattern-grid opacity-20" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          {/* Eyebrow + title on one tight row, with the disclosure toggle inline */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-raspberry/20 text-raspberry-light font-semibold text-xs border border-raspberry/30">
              {subtitle}
            </span>
            <button
              onClick={() => setShowDescription((v) => !v)}
              aria-expanded={showDescription}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              What is this?
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${showDescription ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-3">
            <span className="gradient-text">{title}</span>
          </h1>

          {/* Orientation copy — collapsed by default */}
          {showDescription && (
            <p className="animate-slide-down text-base sm:text-lg text-gray-300 leading-relaxed mt-3">
              {description}
            </p>
          )}

          {children}
        </div>
      </div>
    </div>
  )
}

interface BottomLineProps {
  children: ReactNode
}

export function BottomLine({ children }: BottomLineProps) {
  return (
    <div className="dazzle-card relative p-8 mt-12 overflow-hidden" style={{ ['--card-glow' as string]: 'rgba(233,26,69,0.85)', ['--card-glow-2' as string]: 'rgba(145,79,219,0.6)' }}>
      <div className="card-aura" />
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-raspberry/15 rounded-full blur-3xl" />

      <div className="relative flex items-start gap-4">
        <div className="dazzle-icon flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-raspberry-light">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-lg mb-2 gradient-text">The Bottom Line</h3>
          <p className="text-gray-300 leading-relaxed">{children}</p>
        </div>
      </div>
    </div>
  )
}
