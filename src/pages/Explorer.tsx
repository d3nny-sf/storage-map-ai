import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { BottomLine } from '../components/PipelineDiagram'
import InteractiveTrainingExplorer from '../components/InteractiveTrainingExplorer'
import InteractiveRAGExplorer from '../components/InteractiveRAGExplorer'
import InteractiveFineTuningExplorer from '../components/InteractiveFineTuningExplorer'
import InteractiveInferenceExplorer from '../components/InteractiveInferenceExplorer'
import StorageLayoutExplorer from '../components/StorageLayoutExplorer'
import ReferenceArchitecture from '../components/ReferenceArchitecture'
import AiMlDlPrimer from '../components/AiMlDlPrimer'
import StepperBar from '../components/StepperBar'

type ViewType = 'reference' | 'storage-layout' | 'training' | 'rag' | 'fine-tuning' | 'inference'

const validViews: ViewType[] = ['reference', 'storage-layout', 'training', 'rag', 'fine-tuning', 'inference']

export default function Explorer() {
  const [searchParams, setSearchParams] = useSearchParams()
  const viewParam = searchParams.get('view') as ViewType | null
  const initialView: ViewType = viewParam && validViews.includes(viewParam) ? viewParam : 'reference'
  const [activeView, setActiveView] = useState<ViewType>(initialView)
  // Primer is collapsed by default — revealed via the toggle in the Reference Architecture header.
  const [showPrimer, setShowPrimer] = useState(false)

  // Sync URL → state when query param changes (e.g. back/forward navigation)
  useEffect(() => {
    const v = searchParams.get('view') as ViewType | null
    if (v && validViews.includes(v) && v !== activeView) {
      setActiveView(v)
    }
  }, [searchParams])

  // Sync state → URL when user clicks a tab
  const handleViewChange = (view: ViewType) => {
    setActiveView(view)
    setSearchParams(view === 'reference' ? {} : { view })
  }

  // Single source of truth for the guided sequence.
  // ORDER (locked): Reference -> Storage Tiers -> Frontier Training -> Fine-Tuning -> RAG -> Inference
  const views: { id: ViewType; name: string; description: string }[] = [
    { id: 'reference',      name: 'Reference Architecture', description: 'Start here — the prescriptive guide' },
    { id: 'storage-layout', name: 'Storage Tiers',          description: 'ILM tiers + the G3.5 layer' },
    { id: 'training',       name: 'Frontier Model Training', description: 'Pretraining data flow at scale' },
    { id: 'fine-tuning',    name: 'Fine-Tuning',            description: 'LoRA & adapter training' },
    { id: 'rag',            name: 'RAG Pipeline',           description: 'Retrieval-augmented generation' },
    { id: 'inference',      name: 'Inference',              description: 'Model serving & generation' },
  ]

  const currentIndex = views.findIndex(v => v.id === activeView)
  const totalSteps = views.length
  const prevView = currentIndex > 0 ? views[currentIndex - 1] : null
  const nextView = currentIndex < totalSteps - 1 ? views[currentIndex + 1] : null
  const progressPct = ((currentIndex + 1) / totalSteps) * 100

  return (
    // ONE-SCREEN RULE (Screen Shot Steps): the whole guided explorer fits a
    // single viewport. The page never scrolls — the chrome (compact header +
    // stepper + Prev/Next) is pinned and only the step content scrolls inside
    // its own contained frame.
    <div className="lock-screen cosmos-bg text-white flex flex-col">
      {/* Ambient cosmic backdrop */}
      <div className="starfield opacity-50" />
      <div className="aurora bg-raspberry/20 w-[30rem] h-[30rem] -top-40 -right-32" />
      <div className="aurora bg-accent-blue/15 w-80 h-80 -bottom-32 -left-24" style={{ animationDelay: '-7s' }} />

      {/* Compact header strip */}
      <div className="relative flex-shrink-0 border-b border-white/10 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">
              <span className="gradient-text">AI Storage Reference Architecture</span>
            </h1>
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-xs text-gray-400">
                <li><Link to="/" className="hover:text-white transition-colors">AI Storage Map</Link></li>
                <li aria-hidden="true" className="text-gray-600">/</li>
                <li className="text-gray-300">Explorer</li>
                <li aria-hidden="true" className="text-gray-600">/</li>
                <li aria-current="page" className="text-raspberry-light font-medium">{views[currentIndex]?.name}</li>
              </ol>
            </nav>
          </div>
          <span className="px-3 py-1 rounded-full bg-raspberry/20 text-raspberry-light font-semibold text-xs border border-raspberry/30">
            A Guided Sequence
          </span>
        </div>
      </div>

      {/* Guided step rail */}
      <div className="relative flex-shrink-0">
        <StepperBar
          views={views}
          activeView={activeView}
          currentIndex={currentIndex}
          totalSteps={totalSteps}
          progressPct={progressPct}
          onSelect={(id) => handleViewChange(id as ViewType)}
        />
      </div>

      {/* Step content — the ONLY scroll region, contained to the remaining
          viewport so the page as a whole never scrolls. */}
      <div className="relative flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Explorer */}
        <section className="mb-8">
          {activeView === 'reference' && (
            <>
              {showPrimer && (
                <div className="animate-slide-down">
                  <AiMlDlPrimer />
                </div>
              )}
              <ReferenceArchitecture
                showPrimer={showPrimer}
                onTogglePrimer={() => setShowPrimer((v) => !v)}
              />
            </>
          )}
          {activeView === 'storage-layout' && <StorageLayoutExplorer />}
          
          {activeView === 'training' && (
            <>
              <InteractiveTrainingExplorer />

              {/* Key Technical Insights — migrated from Training tab */}
              <section className="mt-12 mb-12">
                <h2 className="text-xl font-bold gradient-text mb-4">Key Technical Insights</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="outta-card p-5">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-raspberry/10 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-raspberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </span>
                      Throughput Over Latency
                    </h3>
                    <p className="text-gray-300">
                      Training storage is throughput-bound, not latency-bound. DataLoaders need sustained GB/s reads. 
                      Checkpoints need burst GB/s writes. ELT jobs read and write entire tables. 
                      The metric is aggregate throughput (GB/s), not random IOPS. Size your storage accordingly.
                    </p>
                  </div>

                  <div className="outta-card p-5">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-raspberry/10 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-raspberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                      Storage Speed = GPU Dollars
                    </h3>
                    <p className="text-gray-300">
                      When DataLoader throughput drops below GPU consumption rate, GPUs idle waiting for data. 
                      When synchronous checkpoints pause training, every GPU in the cluster burns money doing nothing. 
                      On a large GPU cluster, every minute of storage-induced idle time is expensive — idle accelerators
                      are the single biggest cost in the loop. Faster storage directly reduces training cost.
                    </p>
                  </div>

                  <div className="outta-card p-5">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-raspberry/10 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-raspberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </span>
                      Medallion Architecture
                    </h3>
                    <p className="text-gray-300">
                      Bronze (raw) → Silver (cleaned, deduplicated) → Gold (tokenized, sharded). Each layer lives in 
                      object storage with Iceberg table format providing ACID transactions, schema evolution, and time travel. 
                      Every transformation is a full read-write cycle through storage. This is where the petabytes get processed.
                    </p>
                  </div>

                  <div className="outta-card p-5">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-raspberry/10 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-raspberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </span>
                      Disaster Recovery
                    </h3>
                    <p className="text-gray-300">
                      Checkpoints are your insurance policy. GPU node failure, network partition, software crash — 
                      the ability to resume from the last checkpoint is why durable object storage is non-negotiable. 
                      A failed checkpoint during a multi-week training run means restarting from the last good save — 
                      potentially losing days of GPU compute.
                    </p>
                  </div>
                </div>
              </section>

              {/* I/O Profile Summary — migrated from Training tab */}
              <section className="mb-12">
                <h2 className="text-xl font-bold gradient-text mb-4">I/O Profile Summary</h2>
                <div className="outta-card outta-table overflow-hidden">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Operation</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Pattern</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Volume</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Priority Metric</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">Data Ingestion</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Sequential writes</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Petabytes</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Write throughput</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">ELT / Medallion</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Batch read-write cycles</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">TB-scale per job</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">R/W throughput, ACID (Iceberg)</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">DataLoader Streaming</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Sequential reads w/ prefetch</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Continuous (high aggregate GET)</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Read throughput (GB/s)</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">Checkpointing</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Bursty large writes (sync pause)</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">500GB-1TB per checkpoint</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Write throughput, durability</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">Artifact Logging</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Continuous small writes</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Gigabytes</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Availability, versioning</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <BottomLine>
                Object storage is in the critical path for every phase of training except the GPU compute loop itself. 
                It's the data lake foundation (Bronze → Silver → Gold), the DataLoader source that must sustain 
                high aggregate throughput to keep GPUs fed (an 8-node AIStor reference cluster sustains ~103.5 GB/s 
                aggregate GET, ~12.9 GB/s/node, scaling with nodes), the checkpoint store where 500GB-1TB writes pause 
                the entire cluster, and the artifact registry for experiment tracking and model export. Storage throughput 
                directly impacts GPU utilization and training cost. The GPU training loop runs in HBM — but 
                everything that feeds it, saves it, and records it runs through object storage.
              </BottomLine>
            </>
          )}

          {activeView === 'rag' && <InteractiveRAGExplorer />}

          {activeView === 'fine-tuning' && (
            <>
              <InteractiveFineTuningExplorer />

              {/* Scale Comparison */}
              <section className="mt-12 mb-12">
                <h2 className="text-xl font-bold gradient-text mb-4">The Scale Difference</h2>
                <div className="outta-card p-5">
                  <p className="text-gray-300 mb-6">
                    The key insight: with LoRA, you're not touching 99%+ of the base model weights. 
                    This fundamentally changes the storage requirements.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-5 outta-inset">
                      <div className="text-4xl font-bold text-raspberry mb-2">140GB</div>
                      <div className="text-sm text-gray-300 mb-1">70B Model (FP16)</div>
                      <div className="text-xs text-gray-400">Base model weights</div>
                    </div>
                    <div className="text-center p-5 outta-inset">
                      <div className="text-4xl font-bold text-amber-500 mb-2">500GB+</div>
                      <div className="text-sm text-gray-300 mb-1">Full Training Checkpoint</div>
                      <div className="text-xs text-gray-400">Model + optimizer state</div>
                    </div>
                    <div className="text-center p-5 rounded-xl bg-raspberry/15 border-2 border-raspberry/60">
                      <div className="text-4xl font-bold text-raspberry mb-2">100MB</div>
                      <div className="text-sm text-gray-300 mb-1">LoRA Adapter</div>
                      <div className="text-xs text-gray-400">Just the trained parameters</div>
                    </div>
                  </div>
                  <p className="text-center text-sm text-gray-400 mt-4">
                    That's a <span className="font-semibold">5,000x</span> difference in checkpoint size.
                  </p>
                </div>
              </section>

              {/* Key Insights */}
              <section className="mb-12">
                <h2 className="text-xl font-bold gradient-text mb-4">Key Technical Insights</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="outta-card p-5">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-raspberry/10 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-raspberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </span>
                      Adapter Versioning
                    </h3>
                    <p className="text-gray-300">
                      The model registry pattern becomes elegant with LoRA: version adapters independently from base models. 
                      Same base model, multiple domain-specific adapters, clear lineage tracking. 
                      <code className="text-xs bg-white/10 text-raspberry-light px-1 rounded">/llama-3-8b/adapters/customer-support-v2/</code>
                    </p>
                  </div>

                  <div className="outta-card p-5">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-raspberry/10 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-raspberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </span>
                      Hot-Swap at Inference
                    </h3>
                    <p className="text-gray-300">
                      Adapters are small enough to load dynamically at inference time. vLLM and Triton support 
                      multi-adapter serving — load base model once, swap adapters per request or tenant. 
                      Object storage is in the hot path for adapter swaps.
                    </p>
                  </div>

                  <div className="outta-card p-5">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-raspberry/10 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-raspberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </span>
                      Dataset Curation Matters
                    </h3>
                    <p className="text-gray-300">
                      Fine-tuning is only as good as your data. The dataset preparation phase — curation, 
                      formatting, quality filtering — is where the real work happens. Object storage holds 
                      the versioned datasets that make results reproducible.
                    </p>
                  </div>

                  <div className="outta-card p-5">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                      QLoRA: Same Storage, Less GPU
                    </h3>
                    <p className="text-gray-300">
                      <span className="font-semibold">QLoRA</span> adds 4-bit quantization to LoRA — reducing GPU memory 
                      dramatically. From a storage perspective, patterns are identical: quantization happens at load time, 
                      not in storage. Checkpoints and adapters are the same size; you just need less GPU memory during training.
                    </p>
                  </div>
                </div>
              </section>

              {/* I/O Profile Summary */}
              <section className="mb-12">
                <h2 className="text-xl font-bold gradient-text mb-4">I/O Profile Summary</h2>
                <div className="outta-card outta-table overflow-hidden">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Operation</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Pattern</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Volume</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Frequency</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">Dataset Load</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Sequential read</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">MB to GB</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Once at training start</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">Base Model Load</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Large sequential read</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">16-140 GB</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Once at training start</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">Adapter Checkpoint</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Small sequential write</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">~50-500 MB</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Per epoch or N steps</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">Adapter Export</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Small sequential write</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">~50-500 MB</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Once at training end</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <BottomLine>
                Fine-tuning with LoRA transforms the storage story: small curated datasets instead of petabytes, 
                tiny adapter checkpoints instead of terabytes. Object storage remains the dataset store, model registry, 
                and checkpoint store — but at dramatically smaller scale. The adapter versioning pattern is where 
                object storage shines: same base, many adapters, clear lineage. And adapters are small enough 
                to hot-swap at inference time — bridging fine-tuning directly into serving.
              </BottomLine>
            </>
          )}

          {activeView === 'inference' && (
            <>
              <InteractiveInferenceExplorer />

              {/* Anatomy of a Request */}
              <section className="mt-12 mb-12">
                <h2 className="text-xl font-bold gradient-text mb-4">Anatomy of a Single Request</h2>
                <div className="outta-card p-5">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm font-bold text-gray-300">1</div>
                      <div>
                        <p className="font-medium text-white">User prompt arrives at API endpoint</p>
                        <p className="text-sm text-gray-400">Network I/O, not storage</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm font-bold text-gray-300">2</div>
                      <div>
                        <p className="font-medium text-white">Tokenizer converts text to token IDs</p>
                        <p className="text-sm text-gray-400">CPU, in-memory operation</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm font-bold text-gray-300">3</div>
                      <div>
                        <p className="font-medium text-white">Token IDs sent to GPU</p>
                        <p className="text-sm text-gray-400">PCIe transfer, not storage</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-400/30">
                      <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-sm font-bold text-white">4</div>
                      <div className="flex-1">
                        <p className="font-medium text-cyan-200">Forward pass through transformer layers</p>
                        <div className="mt-2 text-sm text-cyan-300 space-y-1">
                          <p>&rarr; Attention computation (KV cache in GPU HBM)</p>
                          <p>&rarr; FFN layers (matrix multiplications, GPU compute)</p>
                          <p>&rarr; <span className="font-semibold text-cyan-100">If context exceeds GPU HBM: the KV cache lives in the G3.5 context-memory layer (MinIO MemKV) — GPU→NVMe over RDMA</span></p>
                          <p>&rarr; Logits produced &rarr; sampling &rarr; output token</p>
                          <p>&rarr; <span className="font-semibold">Repeat autoregressively until stop condition</span></p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded">
                            SHORT REQUESTS: GPU HBM ONLY
                          </span>
                          <span className="inline-flex items-center px-3 py-1 bg-cyan-600 text-white text-xs font-bold rounded">
                            LONG-CONTEXT / AGENTIC: HBM + MEMKV G3.5
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm font-bold text-gray-300">5</div>
                      <div>
                        <p className="font-medium text-white">Detokenize back to text</p>
                        <p className="text-sm text-gray-400">CPU, in-memory operation</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm font-bold text-gray-300">6</div>
                      <div>
                        <p className="font-medium text-white">Return response + log to object storage</p>
                        <p className="text-sm text-gray-400">Network I/O + async storage write</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Key Insights */}
              <section className="mb-12">
                <h2 className="text-xl font-bold gradient-text mb-4">Key Technical Insights</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="outta-card p-5">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </span>
                      MinIO MemKV (G3.5): Breaking the Memory Wall
                    </h3>
                    <p className="text-gray-300">
                      Agentic AI workloads with long contexts explode the KV cache beyond GPU HBM capacity. 
                      The <strong>G3.5 context-memory layer</strong> &mdash; between GPU HBM (G3) and object storage (G4) &mdash; 
                      keeps that KV cache resident instead of evicting and recomputing it. MinIO MemKV moves it{' '}
                      <span className="font-semibold text-cyan-700">GPU→NVMe over RDMA</span> with{' '}
                      <span className="font-semibold text-cyan-700">no file system, no object protocol, and no CPU in the data path</span>, sustaining 95%+ GPU utilization cluster-wide.
                    </p>
                  </div>

                  <div className="outta-card p-5">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                      Cold Start Impact
                    </h3>
                    <p className="text-gray-300">
                      Object storage throughput directly affects how fast a new instance is ready to serve. 
                      A 70B model at 140 GB needs to move from S3 to GPU HBM. At 10 GB/s, that's 14 seconds. 
                      At 1 GB/s, that's 2+ minutes. This matters for autoscaling and recovery.
                    </p>
                  </div>

                  <div className="outta-card p-5">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-raspberry/10 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-raspberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </span>
                      Logging at Scale
                    </h3>
                    <p className="text-gray-300">
                      A high-traffic inference endpoint generates terabytes of logs over time: request/response pairs, 
                      latency metrics, token counts, error codes. Compliance requirements often mandate retention. 
                      Object storage is the durable, cost-effective home for this data.
                    </p>
                  </div>

                  <div className="outta-card p-5">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </span>
                      Feedback Loop &rarr; Fine-Tuning
                    </h3>
                    <p className="text-gray-300">
                      User feedback (preferences, corrections, thumbs up/down) feeds back into fine-tuning via RLHF/DPO. 
                      Object storage is the bridge: inference feedback data becomes the training data 
                      for the next LoRA adapter iteration. The model lifecycle is circular, not linear.
                    </p>
                  </div>
                </div>
              </section>

              {/* I/O Profile Summary */}
              <section className="mb-12">
                <h2 className="text-xl font-bold gradient-text mb-4">I/O Profile Summary</h2>
                <div className="outta-card outta-table overflow-hidden">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Operation</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Pattern</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">When</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Storage Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">Model Loading</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Large sequential read</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Cold start, scale-out, updates</td>
                        <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">BURST READ</span></td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">Adapter Swap</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Small sequential read</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Per-request or per-tenant</td>
                        <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">BURST READ</span></td>
                      </tr>
                      <tr className="bg-cyan-500/10">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-cyan-200">KV Cache Residency (MemKV G3.5)</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-300">Microsecond random R/W via RDMA</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-300">Long-context / agentic requests</td>
                        <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium bg-cyan-200 text-cyan-800 rounded">ACTIVE TIER</span></td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">Request Logging</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Continuous small writes</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Every request</td>
                        <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium bg-raspberry/20 text-raspberry rounded">PRIMARY</span></td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">Feedback Storage</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">Small writes</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">When users provide feedback</td>
                        <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium bg-raspberry/20 text-raspberry rounded">PRIMARY</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <BottomLine>
                Inference is no longer just bookends. For short requests, the forward pass still runs entirely in GPU HBM.
                But for agentic and long-context workloads, the KV cache lives in the{' '}
                <strong>G3.5 context-memory layer</strong> &mdash; MinIO MemKV, a single ARM64-native binary inside the NVIDIA STX rack,
                moving KV cache GPU→NVMe over RDMA at 800 GbE via Spectrum-X with no CPU in the data path. This is storage <em>inside</em> the inference loop.
                Add model loading, adapter swaps, logging, and RLHF feedback,
                and object storage touches every phase of the inference lifecycle.
              </BottomLine>
            </>
          )}
        </section>
      </div>
      </div>

      {/* Guided sequence — Prev / Next navigation (pinned to the bottom of the
          locked screen so it's always reachable without scrolling the page) */}
      <div className="relative flex-shrink-0 border-t border-white/10 bg-white/[0.02]">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-stretch justify-between gap-4">
          {prevView ? (
            <button
              onClick={() => handleViewChange(prevView.id)}
              className="group flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-raspberry/40 hover:bg-white/10 transition-all text-left max-w-[48%]"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-raspberry-light transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="min-w-0">
                <span className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide">Previous</span>
                <span className="block font-semibold text-white truncate">{prevView.name}</span>
              </span>
            </button>
          ) : (
            <span className="max-w-[48%]" />
          )}

          {nextView ? (
            <button
              onClick={() => handleViewChange(nextView.id)}
              className="btn-primary group flex items-center gap-3 px-4 py-2.5 rounded-xl text-white text-right max-w-[48%] ml-auto"
            >
              <span className="min-w-0">
                <span className="block text-[11px] font-medium text-white/70 uppercase tracking-wide">Next — Step {currentIndex + 2} of {totalSteps}</span>
                <span className="block font-semibold truncate">{nextView.name}</span>
              </span>
              <svg className="w-5 h-5 text-white/80 group-hover:translate-x-0.5 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-right max-w-[48%] ml-auto">
              <span>
                <span className="block text-[11px] font-medium text-emerald-400 uppercase tracking-wide">Sequence complete</span>
                <span className="block font-semibold text-emerald-200">You've walked the whole stack</span>
              </span>
              <svg className="w-6 h-6 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          )}
        </nav>
      </div>
    </div>
  )
}
