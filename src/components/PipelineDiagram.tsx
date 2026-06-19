import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle: string
  description: string
  children?: ReactNode
}

export function PageHeader({ title, subtitle, description, children }: PageHeaderProps) {
  return (
    <div className="relative bg-dark text-white py-20 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 animated-gradient opacity-50" />
      
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-raspberry/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4" />
      
      {/* Grid overlay */}
      <div className="absolute inset-0 pattern-grid opacity-30" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="inline-block px-4 py-2 rounded-full bg-raspberry/20 text-raspberry-light font-semibold text-sm mb-6 border border-raspberry/30">
            {subtitle}
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">{title}</h1>
          <p className="text-xl text-gray-300 leading-relaxed">{description}</p>
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
    <div className="relative bg-gradient-to-r from-raspberry/5 via-raspberry/10 to-raspberry/5 border-2 border-raspberry/20 rounded-2xl p-8 mt-12 overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-raspberry/10 rounded-full blur-2xl" />
      
      <div className="relative flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-raspberry to-raspberry-dark rounded-xl flex items-center justify-center shadow-lg shadow-raspberry/30">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-raspberry text-lg mb-2">The Bottom Line</h3>
          <p className="text-gray-700 leading-relaxed">{children}</p>
        </div>
      </div>
    </div>
  )
}
