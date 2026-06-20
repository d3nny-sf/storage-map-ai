import { Link, Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

const navLinks = [
  { path: '/', label: 'Overview' },
  { path: '/explorer', label: 'Explorer', highlight: true },

  { path: '/compare', label: 'Compare' },
  { path: '/paths', label: 'S3 Paths' },
  { path: '/glossary', label: 'Glossary & Reference' },
]

// The one-screen / no-scroll rule applies ONLY to these two routes.
const ONE_SCREEN_ROUTES = ['/', '/explorer']

export default function Layout() {
  const location = useLocation()
  const isOneScreen = ONE_SCREEN_ROUTES.includes(location.pathname)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  // The Explorer "look here" pulse should only nudge first-time visitors.
  const [explorerVisited, setExplorerVisited] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem('explorerVisited') === 'true'
  })

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Record the first Explorer visit so the header pulse stops nagging.
  useEffect(() => {
    if (location.pathname === '/explorer' && !explorerVisited) {
      window.localStorage.setItem('explorerVisited', 'true')
      setExplorerVisited(true)
    }
  }, [location.pathname, explorerVisited])

  // Close mobile menu on route change
  const prevPathname = location.pathname
  useEffect(() => {
    // Only close if menu is currently open (avoids unnecessary state updates)
    if (mobileMenuOpen) {
      setMobileMenuOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevPathname])

  return (
    <div className={`flex flex-col ${isOneScreen ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {/* Header */}
      <header 
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-dark/95 backdrop-blur-lg shadow-lg shadow-black/20' 
            : 'bg-dark'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 bg-gradient-to-br from-raspberry to-raspberry-dark rounded-xl flex items-center justify-center shadow-lg shadow-raspberry/30 group-hover:shadow-raspberry/50 transition-all duration-300 group-hover:scale-105">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight leading-tight text-white">
                  <span className="gradient-text">AI</span> Storage Map
                </span>
                <span className="text-[10px] text-gray-500 tracking-wide uppercase">Technical Reference</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path
                const isHighlight = 'highlight' in link && link.highlight
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'text-white'
                        : isHighlight
                          ? 'text-raspberry-light hover:text-white hover:bg-raspberry/10'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute inset-0 bg-gradient-to-r from-raspberry to-raspberry-dark rounded-lg -z-10" />
                    )}
                    {isHighlight && !isActive && !explorerVisited && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-raspberry rounded-full animate-pulse" />
                    )}
                    {link.label}
                  </Link>
                )
              })}
            </nav>

            {/* Mobile menu button */}
            <button
              className="md:hidden relative p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <div className="w-6 h-6 flex flex-col items-center justify-center gap-1.5">
                <span className={`block w-5 h-0.5 bg-current transform transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block w-5 h-0.5 bg-current transition-all duration-300 ${mobileMenuOpen ? 'opacity-0 scale-0' : ''}`} />
                <span className={`block w-5 h-0.5 bg-current transform transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </div>
            </button>
          </div>

          {/* Mobile Navigation */}
          <div className={`md:hidden overflow-hidden transition-all duration-300 ${mobileMenuOpen ? 'max-h-[500px] pb-4' : 'max-h-0'}`}>
            <nav className="space-y-1 pt-2">
              {navLinks.map((link, index) => {
                const isActive = location.pathname === link.path
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    style={{ animationDelay: `${index * 50}ms` }}
                    className={`block px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                      mobileMenuOpen ? 'animate-slide-up opacity-0' : ''
                    } ${
                      isActive
                        ? 'bg-gradient-to-r from-raspberry to-raspberry-dark text-white shadow-lg shadow-raspberry/20'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content — on one-screen routes the page fills exactly the
          remaining viewport with no scroll in any direction. */}
      <main className={isOneScreen ? 'flex-1 min-h-0 overflow-hidden' : 'flex-1'}>
        <Outlet />
      </main>

      {/* Footer — hidden on the one-screen routes (Home + Explorer) so it
          never forces a scroll; the credit lives here for every other page. */}
      {!isOneScreen && (
      <footer className="relative bg-gradient-to-b from-dark to-darker text-gray-400 pt-12 pb-8 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 pattern-dots opacity-30" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-raspberry/30 to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Single slim row — nav already carries the wayfinding, so the footer
              only keeps the brand, the one external destination (AIStor), and the sign-off. */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Brand + tagline */}
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-raspberry to-raspberry-dark rounded-lg flex items-center justify-center shadow-lg shadow-raspberry/20">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <div>
                <span className="block font-bold text-white text-sm leading-tight">AI Storage Map</span>
                <span className="block text-xs text-gray-500">Where object storage fits in AI/ML pipelines.</span>
              </div>
            </div>

            {/* The one external link worth keeping */}
            <a
              href="https://min.io/product/aistor"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-all duration-200 hover:border-raspberry/50 group self-start md:self-auto"
            >
              <span>Learn about MinIO AIStor</span>
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Sign-off + professional credit */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <p className="text-xs text-gray-600 text-center md:text-left max-w-2xl">
              Storage examples reference MinIO AIStor — the S3-compatible object store built for AI workloads. Built for the team that has to actually build it.
            </p>
            <div className="text-center md:text-right">
              <p className="text-sm font-semibold text-white leading-tight">Denny Kalaf <span className="text-gray-500 font-normal">(Denny)</span></p>
              <p className="text-xs text-gray-400 leading-tight mt-0.5">
                Field Architect, <span className="text-raspberry-light font-medium">MinIO</span> · San Francisco
              </p>
            </div>
          </div>
        </div>
      </footer>
      )}
    </div>
  )
}
