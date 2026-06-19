import { useState, useEffect } from 'react'
import DetailDock from './DetailDock'

// =============================================================================
// THE PRESCRIPTIVE REFERENCE ARCHITECTURE
// "Here's THE way to do AI Training Storage - like META, but achievable"
// =============================================================================

// THE STACK (ONE choice, alternatives in parentheses)
const STACK = {
  platform: { primary: 'OpenShift AI', alts: ['Kubernetes', 'EKS/GKE'] },
  hardware: { primary: 'NVIDIA STX Rack', alts: ['HPE ProLiant DL380a', 'Dell PowerEdge'] },
  gpus: { primary: 'NVIDIA Vera Rubin (Rubin Ultra)', alts: ['Blackwell Ultra B300', 'H200'] },
  dpu: { primary: 'NVIDIA BlueField-4 SuperNIC', alts: ['BlueField-3'] },
  networking: { primary: 'Spectrum-X 800 GbE (ConnectX-9)', alts: ['400 GbE (ConnectX-7)'] },
  training: { primary: 'PyTorch', alts: ['TensorFlow', 'JAX'] },
  distributed: { primary: 'Ray', alts: ['Horovod', 'DeepSpeed'] },
  dataEng: { primary: 'Spark', alts: ['Dask', 'Polars'] },
  tableFormat: { primary: 'Iceberg (AIStor Tables)', alts: ['Delta Lake', 'Hudi'] },
  mlops: { primary: 'MLflow', alts: ['Kubeflow', 'W&B'] },
  vectorDb: { primary: 'Weaviate', alts: ['Milvus', 'Pinecone', 'pgvector'] },
  serving: { primary: 'vLLM + NVIDIA Dynamo', alts: ['TensorRT-LLM', 'Triton'] },
  contextMemory: { primary: 'MinIO MemKV (G3.5)', alts: ['(NVIDIA STX context-memory layer)'] },
  storage: { primary: 'MinIO AIStor', alts: ['(This is non-negotiable)'] },
}

// THE PIPELINE PHASES - Step by step, what happens where
interface PipelinePhase {
  id: string
  name: string
  description: string
  storageOperation: string
  tier: 0 | 'G3.5' | 1 | 2 | 3
  ioPattern: string
  dataVolume: string
  latencyReq: string
  minioRole: string
  metaComparison: string
}

const PIPELINE_PHASES: PipelinePhase[] = [
  {
    id: 'ingest',
    name: '1. Data Ingestion',
    description: 'Raw data lands in the lake. Unstructured: images, video, text, logs.',
    storageOperation: 'WRITE → Bronze layer',
    tier: 2,
    ioPattern: 'Sequential writes, massive volume',
    dataVolume: 'Petabytes',
    latencyReq: '5-15ms OK (batch)',
    minioRole: 'Data Lake Foundation',
    metaComparison: 'META: Tectonic distributed FS. You: MinIO AIStor. Source of truth: 8-node reference cluster ~34.4 GB/s PUT, scaling linearly with node count.',
  },
  {
    id: 'elt',
    name: '2. ELT Processing',
    description: 'Spark transforms raw → cleaned → tokenized. Bronze → Silver → Gold.',
    storageOperation: 'READ Bronze → WRITE Silver/Gold',
    tier: 2,
    ioPattern: 'Batch R/W, Iceberg tables',
    dataVolume: 'Terabytes per job',
    latencyReq: '5-15ms (batch)',
    minioRole: 'Medallion Architecture Host',
    metaComparison: 'META: Custom data preprocessing. You: Spark + Iceberg on MinIO AIStor.',
  },
  {
    id: 'shuffle',
    name: '3. Spark Shuffle',
    description: 'Intermediate shuffle data during ELT. Ephemeral, high IOPS.',
    storageOperation: 'Ephemeral R/W',
    tier: 0,
    ioPattern: 'Random I/O, <100μs required',
    dataVolume: 'GBs-TBs per job',
    latencyReq: '<100μs (critical)',
    minioRole: 'NONE - Local NVMe only',
    metaComparison: 'META: Local NVMe shuffle. You: Same - Tier 0 block.',
  },
  {
    id: 'dataload',
    name: '4. DataLoader Streaming',
    description: 'PyTorch DataLoader pulls tokenized shards to GPUs. Sustained throughput.',
    storageOperation: 'READ Gold shards → GPU memory',
    tier: 1,
    ioPattern: 'Sequential reads, prefetch, high aggregate GET',
    dataVolume: 'Continuous stream',
    latencyReq: '1-5ms (throughput > latency)',
    minioRole: 'Hot S3 Cache + MinIO Cache (DRAM)',
    metaComparison: 'META: 16 TB/s to 16K GPUs. You: ~103.5 GB/s aggregate GET on an 8-node reference cluster (~12.9 GB/s/node), scaling with nodes. MinIO Cache prevents GPU starvation.',
  },
  {
    id: 'training',
    name: '5. GPU Training Loop',
    description: 'Forward pass → Loss → Backward pass → Gradient sync. Pure compute.',
    storageOperation: 'NONE - GPU memory only',
    tier: 0,
    ioPattern: 'Compute-bound, no storage I/O',
    dataVolume: 'Weights in GPU HBM (GBs-TBs)',
    latencyReq: 'N/A - memory-resident',
    minioRole: 'NONE during active training',
    metaComparison: 'META: 400 TFLOPs/GPU. You: Vera Rubin next-gen FP4/FP6 = even more.',
  },
  {
    id: 'checkpoint',
    name: '6. Checkpointing',
    description: 'Save full model state every N steps. Disaster recovery. Critical.',
    storageOperation: 'WRITE model + optimizer state',
    tier: 2,
    ioPattern: 'Bursty large sequential writes',
    dataVolume: '500GB-1TB per checkpoint (70B model)',
    latencyReq: '5-15ms OK (periodic burst)',
    minioRole: 'Durable checkpoint store (erasure coded)',
    metaComparison: 'META: Tectonic synchronized checkpoints. You: MinIO AIStor with Reed-Solomon EC (whitepaper: 12-drive, 6-parity).',
  },
  {
    id: 'experiment',
    name: '7. Experiment Tracking',
    description: 'MLflow logs metrics, params, artifacts. Continuous throughout training.',
    storageOperation: 'WRITE artifacts + READ for analysis',
    tier: 1,
    ioPattern: 'Mixed small-medium objects',
    dataVolume: 'GBs per experiment',
    latencyReq: '1-5ms',
    minioRole: 'MLflow artifact backend',
    metaComparison: 'META: Internal tooling. You: MLflow + MinIO AIStor.',
  },
  {
    id: 'vectorize',
    name: '8. Embedding/Vectorization',
    description: 'For RAG: chunk documents → embed → store vectors in Weaviate.',
    storageOperation: 'READ docs → WRITE vectors',
    tier: 0,
    ioPattern: 'Random access, <500μs for HNSW',
    dataVolume: 'Millions of vectors',
    latencyReq: '<500μs (query time)',
    minioRole: 'NONE - Weaviate on local NVMe',
    metaComparison: 'META: Not public. You: Weaviate PVC on local NVMe.',
  },
  {
    id: 'kvcache',
    name: '8b. G3.5 Context Memory (Inference)',
    description: 'Long-context / agentic inference keeps the KV cache resident in the G3.5 context-memory layer (NVIDIA memory-hierarchy lens) via MinIO MemKV — instead of evicting and recomputing.',
    storageOperation: 'KV cache GPU→NVMe over RDMA',
    tier: 'G3.5' as unknown as PipelinePhase['tier'],
    ioPattern: 'Microsecond RDMA, Spectrum-X 800 GbE',
    dataVolume: 'GBs-TBs KV state',
    latencyReq: '<1ms (RDMA)',
    minioRole: 'MinIO MemKV — single ARM64-native binary in the NVIDIA STX rack',
    metaComparison: 'The inference-era layer: MinIO MemKV. KV cache GPU→NVMe over RDMA — no file system, no object protocol, no CPU in the data path; sustains 95%+ GPU utilization cluster-wide.',
  },
  {
    id: 'export',
    name: '9. Model Export',
    description: 'Final model → safetensors → Model Registry. Immutable artifact.',
    storageOperation: 'WRITE final model',
    tier: 2,
    ioPattern: 'Large sequential write, versioned',
    dataVolume: '100s GB per model',
    latencyReq: '5-15ms',
    minioRole: 'Model Registry (S3 versioning)',
    metaComparison: 'META: Internal registry. You: MinIO AIStor with versioning.',
  },
  {
    id: 'archive',
    name: '10. Compliance Archive',
    description: 'Old checkpoints, audit logs, historical data. 7-year retention.',
    storageOperation: 'WRITE-once, read-rarely',
    tier: 3,
    ioPattern: 'Archive, ILM auto-tiered',
    dataVolume: 'Exabytes over time',
    latencyReq: '15-50ms OK',
    minioRole: 'Object Lock + WORM (SEC 17a-4(f))',
    metaComparison: 'META: Compliance requirements. You: MinIO AIStor Object Lock (whitepaper: SEC 17a-4(f), FINRA 4511(c)).',
  },
]

// THE TIERS - Clear, no ambiguity
const TIERS = [
  {
    tier: 0,
    name: 'NVMe Local Bus / Direct-Attach',
    subtitle: 'ILM lens · DirectPV / K8s local NVMe',
    what: 'Local NVMe on the node bus — MinIO DirectPV provisions raw drives for Kubernetes. GPU-Direct Storage, mmap, ephemeral PVCs.',
    capacity: 'TB+',
    latency: '<100μs',
    isMinIO: true,
    color: '#10B981',
    accessMethod: 'PCIe / NVMe-oF / cuFile (GPU-Direct Storage); MinIO DirectPV for K8s',
    keyUse: 'Spark shuffle, Weaviate HNSW index, GPU HBM staging',
  },
  {
    tier: 'G3.5',
    name: 'MinIO MemKV — G3.5 Context Memory',
    subtitle: 'NVIDIA memory-hierarchy lens · between GPU HBM (G3) and object storage (G4)',
    what: 'The G3.5 context-memory layer. MinIO MemKV moves the KV cache GPU→NVMe over RDMA — no file system, no object protocol, no CPU in the data path — over Spectrum-X 800 GbE. Single ARM64-native binary inside the STX rack; 2–16 MB blocks; sustains 95%+ GPU utilization cluster-wide.',
    capacity: 'Petascale pool',
    latency: 'microsecond (RDMA)',
    isMinIO: true,
    color: '#14B8A6',
    accessMethod: 'GPUDirect RDMA over Spectrum-X 800 GbE + PCIe Gen6 (NIXL plugin)',
    keyUse: 'Inference KV-cache residency, agentic context persistence, long-context serving',
  },
  {
    tier: 1,
    name: 'RDMA → S3 to 100% NVMe',
    subtitle: 'ILM lens · in-cluster fast path',
    what: 'MinIO AIStor on 100% NVMe, reached via S3 over RDMA inside the cluster — the fast in-cluster S3 path.',
    capacity: 'TB+',
    latency: '1-5ms',
    isMinIO: true,
    color: '#C72C48',
    accessMethod: 'S3 over RDMA / RoCE v2 (in-cluster)',
    keyUse: 'DataLoader streaming, MLflow artifacts, base model load, adapter swaps',
  },
  {
    tier: 2,
    name: 'Standard S3 (100G) to 100% NVMe',
    subtitle: 'ILM lens · the capacity tier',
    what: 'MinIO AIStor on 100% NVMe over standard S3 at 100 GbE. THE capacity tier: Data Lake, Lakehouse, Medallion architecture, AIStor Tables (native Iceberg).',
    capacity: 'PB+',
    latency: '5-15ms',
    isMinIO: true,
    color: '#F59E0B',
    accessMethod: 'Standard S3 over 100 GbE',
    keyUse: 'Lakehouse (Iceberg/Delta), checkpoints, model registry, document store',
  },
  {
    tier: 3,
    name: 'Standard S3 (25G/100G) to SSD or Hybrid (cold)',
    subtitle: 'ILM lens · cold/archive',
    what: 'MinIO AIStor on SSD or hybrid SSD/HDD with Object Lock, ILM tiering, WORM compliance.',
    capacity: 'EB+',
    latency: '15-50ms',
    isMinIO: true,
    color: '#6B7280',
    accessMethod: 'Standard S3 (25G/100G) with Object Lock + ILM lifecycle rules',
    keyUse: 'Compliance archive, audit logs (SEC 17a-4(f)), retired model versions',
  },
]

// THE STORAGE DINOSAUR TRANSLATION
// This is the key insight for your audience
const DINOSAUR_TRANSLATION = {
  title: 'For Storage Veterans: From Block & Fabric to Objects & Tensors',
  tagline: 'You spent years mastering SAN, fabric, and LUNs. Good news — the instincts transfer. Here is the Rosetta Stone.',
  // Progressive-disclosure sections (replaces the old <pre> blob)
  sections: [
    {
      id: 'tensors',
      icon: '🧮',
      heading: 'Tensors are the new blocks',
      summary: 'The fundamental data unit of AI.',
      body: [
        'Tensors are multi-dimensional arrays (think: matrices of matrices) that hold model weights, activations, and gradients in GPU memory.',
        'What blocks are to a SAN, tensors are to GPU compute — the atomic unit everything else is built on.',
      ],
    },
    {
      id: 'staging',
      icon: '⚡',
      heading: 'The GPU is the compute; storage is the staging area',
      summary: 'Reset the "initiator talks to target" instinct.',
      body: [
        'Your instinct: "GPU talks to storage like an iSCSI initiator talks to a target." Reality: during training the GPU does not "talk to storage" at all.',
        'Data is PRELOADED into GPU HBM before training starts. The training loop then runs ENTIRELY in GPU memory. Checkpoints are PERIODIC writes — not continuous I/O.',
      ],
    },
    {
      id: 'inference',
      icon: '🔥',
      heading: 'Inference flips the script — storage enters the hot path',
      summary: 'The KV cache makes storage continuous again.',
      body: [
        'For inference, the KV cache can live in the G3.5 context-memory layer (NVIDIA lens) — and that IS continuous, microsecond RDMA I/O during active serving.',
        'MinIO MemKV is a single ARM64-native binary inside the NVIDIA STX rack. KV cache moves GPU→NVMe over RDMA: no file system, no object protocol, no CPU in the data path.',
      ],
    },
    {
      id: 'mental-model',
      icon: '🧭',
      heading: 'The mental model, three ways',
      summary: 'Old database habit vs. training vs. inference.',
      body: [
        'OLD: a database server doing random I/O to the SAN all day long.',
        'NEW (Training): load the dataset, train for hours in memory, occasionally save.',
        'NEW (Inference): KV cache resident in the G3.5 layer over RDMA — storage IS in the hot path again.',
      ],
    },
    {
      id: 'roles',
      icon: '🗂️',
      heading: 'Who handles what',
      summary: 'DPU vs. storage responsibilities.',
      body: [
        'The DPU (BlueField-4 SuperNIC in the STX rack) handles network offload (RDMA/RoCE 800 GbE for GPU-to-GPU comms), the G3.5 context-memory data path (MinIO MemKV, GPU→NVMe over RDMA), and GPUDirect RDMA for S3 — zero-copy transfers.',
        'Storage handles the Data Lake (before training), Checkpoints (periodic, during training), the Model Registry (after training), and G3.5 context memory (continuous, during inference).',
      ],
    },
  ],
  comparison: [
    { old: 'iSCSI Initiator', new: 'RDMA NIC (ConnectX-9)', purpose: 'GPU-to-GPU gradient sync, 800 GbE' },
    { old: 'TOE Card', new: 'DPU (BlueField-4 SuperNIC)', purpose: 'Network offload + G3.5 context-memory data path' },
    { old: 'SAN Target', new: 'MinIO AIStor + MemKV', purpose: 'Data Lake + Checkpoints + G3.5 context memory' },
    { old: 'LUN', new: 'S3 Bucket', purpose: 'Namespace for objects' },
    { old: 'RAID Controller', new: 'Erasure Coding', purpose: 'Data protection' },
    { old: 'FC Fabric', new: 'Spectrum-X 800 GbE / InfiniBand', purpose: 'GPU + storage interconnect' },
    { old: 'Disk Shelf', new: 'STX Rack (NVMe + BF-4)', purpose: 'Converged GPU + storage enclosure' },
  ],
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function ReferenceArchitecture() {
  const [selectedPhase, setSelectedPhase] = useState<PipelinePhase | null>(null)
  const [showDinosaurGuide, setShowDinosaurGuide] = useState(false)
  const [viewMode, setViewMode] = useState<'pipeline' | 'tiers' | 'stack'>('pipeline')

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
      {/* Header */}
      <div className="bg-gradient-to-r from-raspberry to-raspberry-dark px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">
              AI Training & Inference Reference Architecture
            </h2>
            <p className="text-black mt-1">
              Prescriptive. One stack. Two tiering lenses. MemKV-aware.
            </p>
          </div>
          <button
            onClick={() => setShowDinosaurGuide(true)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors border border-white/20"
          >
            🦖 Storage Veteran Guide
          </button>
        </div>
      </div>

      {/* View Selector */}
      <div className="border-b border-white/10 px-6 py-3 bg-gray-800/50">
        <div className="flex gap-2">
          {/* Pipeline Flow — right-facing arrow, no FOLLOW badge */}
          <button
            onClick={() => setViewMode('pipeline')}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'pipeline'
                ? 'bg-raspberry text-white'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span
              className="absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: '#10B981', boxShadow: '0 0 8px #10B98160' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
            <span className="block">Pipeline Flow</span>
            <span className="block text-[10px] opacity-70">Step-by-step</span>
          </button>

          {/* Storage Tiers — green FOLLOW badge, no step number */}
          <button
            onClick={() => setViewMode('tiers')}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'tiers'
                ? 'bg-raspberry text-white'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span
              className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[8px] font-bold rounded-full text-white animate-pulse"
              style={{ backgroundColor: '#10B981' }}
            >
              FOLLOW
            </span>
            <span className="block">Storage Tiers</span>
            <span className="block text-[10px] opacity-70">Two-lens layout</span>
          </button>

          {/* The Stack — green FOLLOW badge, no step number */}
          <button
            onClick={() => setViewMode('stack')}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'stack'
                ? 'bg-raspberry text-white'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span
              className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[8px] font-bold rounded-full text-white animate-pulse"
              style={{ backgroundColor: '#10B981' }}
            >
              FOLLOW
            </span>
            <span className="block">The Stack</span>
            <span className="block text-[10px] opacity-70">Software choices</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {viewMode === 'pipeline' && (
          <PipelineView
            phases={PIPELINE_PHASES}
            selectedPhase={selectedPhase}
            onSelectPhase={setSelectedPhase}
          />
        )}
        {viewMode === 'tiers' && <TierView tiers={TIERS} />}
        {viewMode === 'stack' && <StackView stack={STACK} />}
      </div>

      {/* Dinosaur Guide Modal */}
      {showDinosaurGuide && (
        <DinosaurGuideModal
          data={DINOSAUR_TRANSLATION}
          onClose={() => setShowDinosaurGuide(false)}
        />
      )}
    </div>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function PipelineView({
  phases,
  selectedPhase,
  onSelectPhase,
}: {
  phases: PipelinePhase[]
  selectedPhase: PipelinePhase | null
  onSelectPhase: (phase: PipelinePhase | null) => void
}) {
  const tierColors: Record<number | string, string> = {
    0: '#10B981',
    'G3.5': '#14B8A6',
    1: '#C72C48',
    2: '#F59E0B',
    3: '#6B7280',
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-400 mb-4">
        <strong className="text-white">The Pipeline:</strong> Click any phase to see storage details.
        Each phase maps to a specific storage tier.
      </div>

      {/* Phase strip on the left, detail docked on the right (desktop) */}
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start">
        {/* Phase Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
          {phases.map((phase, idx) => (
            <button
              key={phase.id}
              onClick={() => onSelectPhase(selectedPhase?.id === phase.id ? null : phase)}
              className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                selectedPhase?.id === phase.id
                  ? 'border-white/50 bg-white/10 scale-[1.02]'
                  : 'border-white/10 bg-gray-800/30 hover:border-white/30 hover:bg-gray-800/50'
              }`}
            >
              {/* Tier Indicator */}
              <div
                className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: tierColors[phase.tier] || '#14B8A6' }}
              >
                {typeof phase.tier === 'string' ? phase.tier : `T${phase.tier}`}
              </div>

              {/* Phase Number */}
              <div className="text-xs text-gray-500 mb-1">Phase {idx + 1}</div>

              {/* Phase Name */}
              <h4 className="text-white font-semibold text-sm leading-tight pr-8">
                {phase.name.replace(/^\d+\.\s*/, '')}
              </h4>

              {/* Storage Op */}
              <div className="mt-2 text-[10px] text-gray-400 font-mono">
                {phase.storageOperation}
              </div>
            </button>
          ))}
        </div>

        {/* Detail Dock — sticky right-rail on desktop, modal on mobile */}
        <DetailDock open={!!selectedPhase} onClose={() => onSelectPhase(null)}>
          {selectedPhase && (
            <div className="bg-gray-900/95 lg:bg-gray-800/50 rounded-2xl border border-white/10 shadow-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div
                    className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white mb-2"
                    style={{ backgroundColor: tierColors[selectedPhase.tier] }}
                  >
                    TIER {selectedPhase.tier}
                  </div>
                  <h3 className="text-xl font-bold text-white">{selectedPhase.name}</h3>
                  <p className="text-gray-400 mt-1">{selectedPhase.description}</p>
                </div>
                <button
                  onClick={() => onSelectPhase(null)}
                  className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">I/O Pattern</div>
                  <div className="text-white text-sm">{selectedPhase.ioPattern}</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Data Volume</div>
                  <div className="text-white text-sm">{selectedPhase.dataVolume}</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Latency Req</div>
                  <div className="text-white text-sm">{selectedPhase.latencyReq}</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">MinIO AIStor Role</div>
                  <div className="text-white text-sm font-medium" style={{ color: selectedPhase.tier === 0 ? '#EF4444' : '#E91A45' }}>
                    {selectedPhase.minioRole}
                  </div>
                </div>
              </div>

              {/* META Comparison */}
              <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-1">META Comparison</div>
                <p className="text-gray-300 text-sm">{selectedPhase.metaComparison}</p>
              </div>
            </div>
          )}
        </DetailDock>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-white/10">
        {TIERS.map((tier) => (
          <div key={tier.tier} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: tier.color }}
            />
            <span className="text-xs text-gray-400">
              {typeof tier.tier === 'string' ? tier.tier : `T${tier.tier}`}: {tier.name} {!tier.isMinIO && '(NOT MinIO AIStor)'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TierView({ tiers }: { tiers: typeof TIERS }) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-400 mb-4">
        <strong className="text-white">Two tiering lenses:</strong> The <strong className="text-teal-400">G3.5 row</strong> belongs to the NVIDIA memory hierarchy (between GPU HBM and object storage). <strong className="text-amber-400">T0–T3</strong> are the storage-agnostic ILM tiers. They are not one stack — don’t conflate them.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tiers.map((tier) => (
          <div
            key={tier.tier}
            className="rounded-xl border-2 p-5"
            style={{
              borderColor: `${tier.color}50`,
              background: `linear-gradient(135deg, ${tier.color}10 0%, transparent 100%)`,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: tier.color }}
                >
                  {typeof tier.tier === 'string' ? tier.tier : `T${tier.tier}`}
                </div>
                <div>
                  <h4 className="text-white font-bold">{tier.name}</h4>
                  <div className="text-xs text-gray-400">{tier.latency} · {tier.capacity}</div>
                </div>
              </div>
              {!tier.isMinIO && (
                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full">
                  NOT MinIO AIStor
                </span>
              )}
              {tier.isMinIO && (
                <span className="px-2 py-1 bg-raspberry/20 text-raspberry text-xs font-bold rounded-full">
                  MinIO AIStor
                </span>
              )}
            </div>

            <p className="text-gray-400 text-xs mb-1">{tier.subtitle}</p>
            <p className="text-gray-300 text-sm mb-4">{tier.what}</p>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-gray-500 uppercase tracking-wider text-[10px]">Access</span>
                <p className="text-gray-300 mt-0.5">{tier.accessMethod}</p>
              </div>
              <div>
                <span className="text-gray-500 uppercase tracking-wider text-[10px]">Key Use</span>
                <p className="text-gray-300 mt-0.5">{tier.keyUse}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Capacity Scale */}
      <div className="mt-6 bg-gray-800/50 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-white mb-3">Capacity Scale</h4>
        <div className="flex items-end gap-1 h-16">
          {tiers.map((tier) => (
            <div
              key={tier.tier}
              className="flex-1 rounded-t flex flex-col items-center justify-center h-full"
              style={{
                backgroundColor: `${tier.color}30`,
              }}
            >
              <span className="text-[10px] text-white font-medium">{tier.capacity}</span>
            </div>
          ))}
        </div>
        <div className="flex mt-2">
          {tiers.map((tier) => (
            <div key={tier.tier} className="flex-1 text-center text-[10px] text-gray-500">
              Tier {tier.tier}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StackView({ stack }: { stack: typeof STACK }) {
  const categories = [
    { key: 'platform', label: 'Platform', icon: '☸️' },
    { key: 'hardware', label: 'Hardware', icon: '🖥️' },
    { key: 'gpus', label: 'GPUs', icon: '🎮' },
    { key: 'dpu', label: 'DPU / SuperNIC', icon: '🛡️' },
    { key: 'networking', label: 'Networking', icon: '🌐' },
    { key: 'training', label: 'Training Framework', icon: '🔥' },
    { key: 'distributed', label: 'Distributed', icon: '🌟' },
    { key: 'dataEng', label: 'Data Engineering', icon: '⚡' },
    { key: 'tableFormat', label: 'Table Format', icon: '🧊' },
    { key: 'mlops', label: 'MLOps', icon: '📊' },
    { key: 'vectorDb', label: 'Vector DB', icon: '🔍' },
    { key: 'serving', label: 'Serving', icon: '🚀' },
    { key: 'contextMemory', label: 'Context Memory (G3.5)', icon: '🧠' },
    { key: 'storage', label: 'Storage', icon: '📾' },
  ]

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-400 mb-4">
        <strong className="text-white">The Stack:</strong> ONE primary choice per category.
        Alternatives in parentheses for flexibility.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map(({ key, label, icon }) => {
          const item = stack[key as keyof typeof stack]
          const isStorage = key === 'storage'
          
          return (
            <div
              key={key}
              className={`rounded-xl border p-4 ${
                isStorage
                  ? 'border-raspberry bg-raspberry/10'
                  : 'border-white/10 bg-gray-800/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{icon}</span>
                <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
              </div>
              <div className={`font-bold ${isStorage ? 'text-raspberry' : 'text-white'}`}>
                {item.primary}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ({item.alts.join(', ')})
              </div>
            </div>
          )
        })}
      </div>

      {/* The Bottom Line */}
      <div className="mt-6 bg-gradient-to-r from-raspberry/20 to-transparent border border-raspberry/30 rounded-xl p-5">
        <h4 className="text-raspberry font-bold mb-2">The Bottom Line</h4>
        <p className="text-gray-300 text-sm">
          META built Tectonic (custom distributed FS) to train Llama 3 on 16K GPUs.
          You get the same architecture pattern with <strong className="text-white">MinIO AIStor</strong> — 
          without building from scratch. Same S3 API, same performance class, fraction of the effort.
          And in the inference era, <strong className="text-teal-400">MinIO MemKV</strong> also serves the G3.5 context-memory
          layer — KV cache GPU→NVMe over RDMA, no CPU in the data path, 95%+ GPU utilization cluster-wide.
        </p>
      </div>
    </div>
  )
}

function DinosaurGuideModal({
  data,
  onClose,
}: {
  data: typeof DINOSAUR_TRANSLATION
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <button
        aria-label="Close guide"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
      />

      {/* Shell */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/10 glass-rail shadow-2xl animate-slide-up"
      >
        {/* Glow-wash hero */}
        <div className="glow-wash sticky top-0 z-10 px-6 py-6 sm:px-8 sm:py-7 border-b border-white/10 glass-rail">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-5xl animate-float drop-shadow-[0_0_12px_rgba(145,79,219,0.6)]" aria-hidden>🦖</span>
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-accent-purple/20 text-accent-purple-light border border-accent-purple/30">
                  Storage Veteran Guide
                </span>
                <h3 className="mt-2 text-xl sm:text-2xl font-bold text-white leading-tight">{data.title}</h3>
                <p className="mt-1.5 text-sm text-gray-300 max-w-xl">{data.tagline}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors border border-white/10"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-7">
          {/* Progressive-disclosure concepts */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Start here · tap to expand</h4>
            {data.sections.map((section, i) => (
              <details
                key={section.id}
                className="accordion-row group rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors overflow-hidden"
                open={i === 0}
              >
                <summary className="flex items-center gap-3 px-4 py-3.5 select-none">
                  <span className="text-2xl shrink-0" aria-hidden>{section.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-white font-semibold">{section.heading}</span>
                    <span className="block text-xs text-gray-400 truncate">{section.summary}</span>
                  </span>
                  <svg className="chevron w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </summary>
                <div className="accordion-body px-4 pb-4 pl-[3.75rem] space-y-2.5">
                  {section.body.map((para, j) => (
                    <p key={j} className="text-sm text-gray-300 leading-relaxed">{para}</p>
                  ))}
                </div>
              </details>
            ))}
          </div>

          {/* Animated translation rows: Old World → AI World */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-semibold">The Rosetta Stone</h4>
              <span className="text-xs text-gray-500">Old World → AI World</span>
            </div>
            <div className="space-y-2.5">
              {data.comparison.map((row, i) => (
                <div
                  key={i}
                  className="group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-raspberry/15 text-accent-purple-light border border-raspberry/30 sm:w-44 shrink-0">
                    {row.old}
                  </span>
                  <svg
                    className="hidden sm:block w-5 h-5 text-gray-500 shrink-0 transition-transform group-hover:translate-x-1"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
                  </svg>
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-accent-green/15 text-accent-green border border-accent-green/30 sm:w-56 shrink-0">
                    {row.new}
                  </span>
                  <span className="text-xs text-gray-400 sm:flex-1">{row.purpose}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Critical insight */}
          <div className="rounded-2xl border border-raspberry/30 bg-raspberry/[0.08] p-5">
            <h4 className="flex items-center gap-2 text-accent-purple-light font-bold mb-2">
              <span aria-hidden>⚠️</span> The Critical Insight
            </h4>
            <p className="text-gray-300 text-sm">
              <strong className="text-white">For training: storage is NOT in the critical path.</strong> The GPU
              training loop runs entirely in GPU memory. Storage is used for:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-400">
              <li>• <strong className="text-accent-amber">Before:</strong> loading the dataset (DataLoader → GPU)</li>
              <li>• <strong className="text-accent-amber">During:</strong> periodic checkpoints (every N steps)</li>
              <li>• <strong className="text-accent-amber">After:</strong> saving the final model</li>
            </ul>
            <p className="mt-3 text-gray-300 text-sm">
              <strong className="text-accent-cyan">For inference, the script flips:</strong> storage IS in the hot path.
              The KV cache lives in the G3.5 context-memory layer via MinIO MemKV — GPU→NVMe over RDMA, no file
              system, no object protocol, no CPU in the data path. Continuous, microsecond I/O during serving.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
