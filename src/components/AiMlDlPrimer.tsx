// =============================================================================
// AI vs ML vs DL — a grounding primer for storage veterans landing cold.
// Shown on Step 1 (Reference Architecture) before the prescriptive stack.
// =============================================================================

const LAYERS = [
  {
    abbr: 'AI',
    name: 'Artificial Intelligence',
    blurb: 'The whole field: any technique that lets machines mimic tasks we associate with human intelligence — from hand-written rules and search to modern learning systems.',
    example: 'A chess engine, a spam filter, a chatbot.',
    ring: 'border-accent-blue',
    chip: 'bg-accent-blue/15 text-accent-blue-light',
    dot: 'bg-accent-blue',
    size: 'w-full',
  },
  {
    abbr: 'ML',
    name: 'Machine Learning',
    blurb: 'A subset of AI: instead of coding the rules by hand, you let an algorithm learn the patterns from data. The data — and where it lives — becomes the product.',
    example: 'Fraud detection, recommendation engines, demand forecasting.',
    ring: 'border-accent-purple',
    chip: 'bg-accent-purple/15 text-accent-purple-light',
    dot: 'bg-accent-purple',
    size: 'w-[78%]',
  },
  {
    abbr: 'DL',
    name: 'Deep Learning',
    blurb: 'A subset of ML using many-layered neural networks. This is where the petabytes, the GPU clusters, and the checkpoints live — and where storage moves into the critical path.',
    example: 'LLMs, image generation, frontier foundation models.',
    ring: 'border-raspberry',
    chip: 'bg-raspberry/15 text-raspberry-light',
    dot: 'bg-raspberry',
    size: 'w-[54%]',
  },
]

export default function AiMlDlPrimer() {
  return (
    <section className="mb-12">
      <div className="glow-wash bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-white/10 shadow-2xl p-6 sm:p-8">
        <div className="mb-6">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            PRIMER · START HERE
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-3">
            AI vs ML vs DL — getting the words straight
          </h2>
          <p className="text-gray-400 mt-2 max-w-3xl">
            These three terms get used interchangeably, but they nest. Each is a subset of the one before it.
            Knowing which layer you're in tells you how much data you're moving — and whether storage is a
            sidekick or the main event.
          </p>
        </div>

        {/* Nested layers — concentric "subset" visual */}
        <div className="space-y-3">
          {LAYERS.map((layer) => (
            <div
              key={layer.abbr}
              className={`${layer.size} rounded-xl border-2 ${layer.ring} bg-white/[0.03] p-5 transition-all hover:bg-white/[0.06]`}
            >
              <div className="flex items-start gap-4">
                <span className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl font-extrabold text-sm ${layer.chip}`}>
                  {layer.abbr}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${layer.dot}`} />
                    <h3 className="font-semibold text-white">{layer.name}</h3>
                  </div>
                  <p className="text-sm text-gray-300 mt-1.5 leading-relaxed">{layer.blurb}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    <span className="uppercase tracking-wide font-medium text-gray-400">e.g. </span>
                    {layer.example}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-400 mt-6 leading-relaxed">
          <span className="text-raspberry-light font-semibold">Why it matters here:</span> everything on this map —
          frontier training, fine-tuning, RAG, inference — is <em>deep learning</em>, the innermost layer.
          That's exactly the layer where data volumes explode and storage stops being an afterthought.
        </p>

        {/* PBS Crash Course AI callout */}
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/15 text-red-400">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-white">
              Want the full grounding? Check it out: <span className="text-raspberry-light">Crash Course: Artificial Intelligence</span> (PBS)
            </h4>
            <p className="text-sm text-gray-400 mt-1">
              Hosted by Jabril Ashe, this PBS Digital Studios series traces the logic and history of AI in
              plain language — an outstanding (and free) primer on AI, supervised learning, and neural networks.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-col sm:flex-shrink-0">
            <a
              href="https://www.youtube.com/playlist?list=PL8dPuuaLjXtO65LeD2p4_Sb5XQ51par_b"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors whitespace-nowrap"
            >
              Watch the playlist
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <a
              href="https://www.pbs.org/show/crash-course-artificial-intelligence/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white text-sm font-medium transition-colors whitespace-nowrap"
            >
              PBS show page
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
