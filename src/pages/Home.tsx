import { Link } from 'react-router-dom'

const pipelines = [
  {
    id: 'training',
    title: 'Frontier Model Training',
    subtitle: 'Pretraining from Scratch',
    description: 'Building frontier foundation models from raw data. Petabytes in, terabytes of checkpoints out. Storage is in the critical path from minute one.',
    intensity: 'critical',
    path: '/explorer?view=training',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    glow: 'rgba(233,26,69,0.85)',
    glow2: 'rgba(255,107,138,0.6)',
    iconColor: 'text-raspberry-light',
  },
  {
    id: 'rag',
    title: 'RAG',
    subtitle: 'Retrieval-Augmented Generation',
    description: 'Enhancing model responses with external context at query time. Storage owns the ingestion pipeline and may be in the retrieval path.',
    intensity: 'high',
    path: '/explorer?view=rag',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    glow: 'rgba(245,158,11,0.85)',
    glow2: 'rgba(251,191,36,0.6)',
    iconColor: 'text-amber-400',
  },
  {
    id: 'fine-tuning',
    title: 'Fine-Tuning',
    subtitle: 'LoRA & QLoRA',
    description: 'Adapting foundation models to specific domains with minimal trainable parameters. Small datasets in, tiny adapters out.',
    intensity: 'medium',
    path: '/explorer?view=fine-tuning',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
      </svg>
    ),
    glow: 'rgba(59,130,246,0.85)',
    glow2: 'rgba(96,165,250,0.6)',
    iconColor: 'text-blue-400',
  },
  {
    id: 'inference',
    title: 'Inference',
    subtitle: 'Model Serving',
    description: 'Running trained models to generate predictions. For agentic and long-context workloads, MinIO MemKV serves the G3.5 context-memory layer — KV cache GPU→NVMe over RDMA, with storage now inside the inference loop.',
    intensity: 'active',
    path: '/explorer?view=inference',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
      </svg>
    ),
    glow: 'rgba(20,184,166,0.85)',
    glow2: 'rgba(45,212,191,0.6)',
    iconColor: 'text-teal-300',
  },
]

const intensityConfig: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-gradient-to-r from-raspberry to-raspberry-dark', text: 'text-white', label: 'Critical Path' },
  high: { bg: 'bg-gradient-to-r from-amber-500 to-orange-500', text: 'text-white', label: 'High Involvement' },
  medium: { bg: 'bg-gradient-to-r from-blue-500 to-blue-600', text: 'text-white', label: 'Medium Involvement' },
  active: { bg: 'bg-gradient-to-r from-teal-500 to-cyan-600', text: 'text-white', label: 'Active Tier (MemKV G3.5)' },
}

export default function Home() {
  return (
    <div>
      {/* Hero Section — StarGazer */}
      <section className="relative cosmos-bg text-white py-16 lg:py-24 overflow-hidden">
        {/* Twinkling starfield */}
        <div className="starfield" />

        {/* Drifting aurora blobs */}
        <div className="aurora bg-raspberry/30 w-[520px] h-[520px] -top-32 -right-24" />
        <div className="aurora bg-accent-blue/25 w-[420px] h-[420px] -bottom-40 -left-24" style={{ animationDelay: '-6s' }} />
        <div className="aurora bg-accent-purple/20 w-[360px] h-[360px] top-1/3 left-1/2" style={{ animationDelay: '-11s' }} />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 pattern-grid opacity-40" />
        {/* Vignette to seat the content */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            {/* Eyebrow chip */}
            <div
              className="inline-flex items-center gap-2 mb-5 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-xs font-medium text-gray-300 animate-slide-up"
              style={{ animationDelay: '0.05s', animationFillMode: 'both' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-raspberry opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-raspberry" />
              </span>
              Object storage, mapped across every AI pipeline
            </div>

            <h1
              className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-5 animate-slide-up"
              style={{ animationDelay: '0.1s', animationFillMode: 'both' }}
            >
              The{' '}
              <span className="gradient-text drop-shadow-[0_0_25px_rgba(233,26,69,0.45)]">AI Storage</span>{' '}
              Map
            </h1>

            <p
              className="text-lg lg:text-xl text-gray-300 mb-8 leading-relaxed max-w-3xl animate-slide-up"
              style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
            >
              A technical reference for where object storage actually lives in AI/ML pipelines.
              <span className="text-white font-medium"> Every phase mapped. Every I/O pattern explained.</span>
            </p>

            <div
              className="flex flex-wrap gap-4 animate-slide-up"
              style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
            >
              <Link
                to="/explorer"
                className="btn-primary group inline-flex items-center px-8 py-4 text-white font-semibold rounded-xl transition-all"
              >
                Start Here
                <svg className="ml-2 w-5 h-5 nudge-x" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                to="/glossary"
                className="inline-flex items-center px-8 py-4 font-semibold rounded-xl text-white border border-white/15 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/25 transition-all"
              >
                Glossary & Reference
              </Link>
            </div>
          </div>

          {/* Floating medallion — glowing glass "4 Pipelines" */}
          <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2">
            <div className="relative w-56 h-56 animate-float">
              {/* Rotating conic halo behind */}
              <div className="conic-halo" />
              {/* Orbit rings */}
              <div className="absolute inset-0 border border-white/10 rounded-full" />
              <div className="absolute inset-3 border border-raspberry/20 rounded-2xl rotate-12 animate-pulse-glow" />
              <div className="absolute inset-6 border border-white/10 rounded-2xl -rotate-6" />
              {/* Glass core */}
              <div className="absolute inset-10 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_0_50px_-8px_rgba(233,26,69,0.6)] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl font-extrabold gradient-text drop-shadow-[0_0_20px_rgba(233,26,69,0.5)]">4</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-gray-400 mt-1">Pipelines</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline Cards — StarGazer dazzle on a continuous cosmic canvas */}
      <section className="relative cosmos-bg py-16 lg:py-20 overflow-hidden">
        {/* Seam glow so the hero flows seamlessly into the cards */}
        <div className="absolute -top-px inset-x-0 h-px bg-gradient-to-r from-transparent via-raspberry/40 to-transparent" />
        <div className="aurora bg-accent-purple/15 w-[460px] h-[460px] top-1/4 -right-32" style={{ animationDelay: '-3s' }} />
        <div className="aurora bg-raspberry/15 w-[380px] h-[380px] bottom-0 -left-28" style={{ animationDelay: '-9s' }} />
        <div className="absolute inset-0 pattern-dots opacity-20" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                Four Pipelines.{' '}
                <span className="gradient-text drop-shadow-[0_0_18px_rgba(233,26,69,0.4)]">Four Storage Stories.</span>
              </h2>
              <p className="text-sm lg:text-base text-gray-400 mt-2 max-w-xl">
                Each AI workload puts storage in a different role. Click any card to explore the details.
              </p>
            </div>
            <Link
              to="/compare"
              className="group inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white border border-white/15 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-raspberry/50 transition-all whitespace-nowrap self-start sm:self-auto"
            >
              Compare all four
              <svg className="w-4 h-4 nudge-x" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {pipelines.map((pipeline, index) => (
              <Link
                key={pipeline.id}
                to={pipeline.path}
                style={{
                  animationDelay: `${index * 110}ms`,
                  ['--card-glow' as string]: pipeline.glow,
                  ['--card-glow-2' as string]: pipeline.glow2,
                }}
                className="dazzle-card group p-7 opacity-0 animate-scale-in"
              >
                {/* Glow aura + crossing sheen */}
                <div className="card-aura" />
                <div className="card-sheen" />

                <div className="relative flex items-start gap-5">
                  <div className={`dazzle-icon flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center ${pipeline.iconColor}`}>
                    {pipeline.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2 pr-8">
                      <h3 className="text-xl lg:text-2xl font-bold text-white">
                        {pipeline.title}
                      </h3>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${intensityConfig[pipeline.intensity].bg} ${intensityConfig[pipeline.intensity].text} shadow-lg`}>
                        {intensityConfig[pipeline.intensity].label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3 font-medium uppercase tracking-wide">{pipeline.subtitle}</p>
                    <p className="text-gray-300 leading-relaxed">{pipeline.description}</p>
                  </div>
                </div>

                {/* Arrow indicator */}
                <div className="absolute top-6 right-6 text-gray-500 group-hover:text-white transition-colors duration-300">
                  <svg className="w-6 h-6 nudge-x" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
