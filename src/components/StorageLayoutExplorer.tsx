import { useState, useCallback, useMemo } from 'react'
import DetailDock from './DetailDock'

// ============================================================================
// SOFTWARE STACK LOGOS (Text-based for now - can swap to images)
// ============================================================================

interface SoftwareComponent {
  name: string
  tier: number | number[] // which tier(s) it connects to
  category: 'compute' | 'mlops' | 'serving' | 'vector' | 'elt' | 'governance'
  color: string
}

const softwareStack: SoftwareComponent[] = [
  // ELT / Data Engineering
  { name: 'Spark', tier: [0, 1, 2], category: 'elt', color: '#E25A1C' },
  { name: 'Databricks', tier: 2, category: 'elt', color: '#FF3621' },
  // Training / Compute
  { name: 'PyTorch', tier: [0, 1], category: 'compute', color: '#EE4C2C' },
  { name: 'TensorFlow', tier: [0, 1], category: 'compute', color: '#FF6F00' },
  { name: 'Ray', tier: 1, category: 'compute', color: '#028CF0' },
  // MLOps
  { name: 'Kubeflow', tier: 1, category: 'mlops', color: '#326CE5' },
  { name: 'MLflow', tier: [1, 2], category: 'mlops', color: '#0194E2' },
  // Serving
  { name: 'vLLM', tier: 0, category: 'serving', color: '#7C3AED' },
  { name: 'KServe', tier: 1, category: 'serving', color: '#326CE5' },
  // Vector
  { name: 'Weaviate', tier: 0, category: 'vector', color: '#01CC88' },
  // Governance
  { name: 'TrustyAI', tier: 3, category: 'governance', color: '#EE0000' },
  // Table Formats
  { name: 'Iceberg', tier: 2, category: 'elt', color: '#4A90D9' },
  { name: 'Delta', tier: 2, category: 'elt', color: '#003366' },
]

// ============================================================================
// TYPES
// ============================================================================

interface StorageTier {
  id: string
  tier: number
  name: string
  subtitle: string
  capacity: string
  latency: string
  isMinIO: boolean
  color: string
  description: string
  components: ComponentInfo[]
  details: string[]
  accessMethod: string
}

interface ComponentInfo {
  id: string
  name: string
  shortName: string
  logo?: string
  tier: number
  description: string
  storageUse: string
  ioPattern: string
}

/*
interface DataFlowPath {
  id: string
  from: string
  to: string
  label: string
  volume: 'massive' | 'heavy' | 'medium' | 'light'
  animated: boolean
}
*/

// ============================================================================
// DATA
// ============================================================================

const storageTiers: StorageTier[] = [
  {
    id: 'tier-0',
    tier: 0,
    name: 'Raw Block / Direct-Attach',
    subtitle: 'NVMe local bus / Direct-Attach (MinIO DirectPV / K8s)',
    capacity: 'Node-Local (TBs)',
    latency: '<100μs',
    isMinIO: false,
    color: '#10B981', // Emerald
    description: 'NOT object storage. Raw NVMe block I/O, GPU-Direct Storage (GDS), mmap, PVCs. PCIe 5 direct to VRAM.',
    accessMethod: 'Raw Block / mmap / GDS / PVC',
    components: [
      {
        id: 'spark-shuffle',
        name: 'Spark Shuffle Spill',
        shortName: 'Spark Shuffle Spill',
        tier: 0,
        description: 'Ephemeral shuffle data written to local NVMe during Spark jobs',
        storageUse: 'Temporary spill space for shuffle operations — not durable',
        ioPattern: 'Random R/W, ephemeral, high IOPS',
      },
      {
        id: 'weaviate-hnsw',
        name: 'Weaviate HNSW Index',
        shortName: 'Weaviate HNSW Index',
        tier: 0,
        description: 'In-memory vector graph requiring sub-500μs nearest-neighbor lookups',
        storageUse: 'HNSW graph traversal via memory-mapped NVMe',
        ioPattern: 'Random reads, memory-mapped, latency-critical',
      },
      {
        id: 'vllm-cache',
        name: 'vLLM KV Cache (VRAM)',
        shortName: 'vLLM KV Cache (VRAM)',
        tier: 0,
        description: 'Model weights loaded via GDS + KV cache hot pages pinned in GPU VRAM',
        storageUse: 'Bulk weight load via cuFile, then VRAM-resident KV cache hot pages',
        ioPattern: 'One-time bulk load → persistent VRAM residency; overflows to G3.5',
      },
    ],
    details: [
      'This is NOT MinIO — pure block I/O',
      'GPU-Direct Storage (GDS) via cuFile',
      'Sub-100μs P99 latency required',
      'Ephemeral - not durable storage',
      'PVCs for StatefulSets (Weaviate)',
      'PCIe Gen6 direct to GPU HBM',
      'KV cache hot pages; overflow moves to the G3.5 layer (MinIO MemKV)',
    ],
  },
  {
    id: 'tier-g35',
    tier: 0.5 as unknown as number,
    name: 'MinIO MemKV — Context Memory (G3.5)',
    subtitle: 'Shared NVMe over RDMA — the G3.5 layer of the GPU memory hierarchy',
    capacity: 'Petascale per inference cluster',
    latency: 'Microsecond (RDMA)',
    isMinIO: true,
    color: '#0891B2', // Teal/Cyan
    description: 'MinIO MemKV is purpose-built for the G3.5 layer — the memory tier between GPU HBM and object storage. KV cache moves from GPU memory to shared NVMe over RDMA, bypassing the file system and object protocols entirely, with no CPU in the data path. Runs inside NVIDIA STX as a single ARM64-native binary embedded in the storage tier.',
    accessMethod: 'RDMA over Spectrum-X 800 GbE — no file system, no object protocol, no CPU in the path',
    components: [
      {
        id: 'kv-overflow',
        name: 'KV Cache Pool',
        shortName: 'KV Cache Pool',
        tier: 0.5 as unknown as number,
        description: 'A petascale, flash-backed KV pool at the correct layer of the memory hierarchy — virtually eliminating redundant prefill computation instead of evicting cache or starving the model',
        storageUse: 'Shared KV cache parked on NVMe so GPUs decode instead of recomputing context they already processed',
        ioPattern: 'RDMA, 2–16 MB blocks tuned for GPU access patterns (not legacy 4 KB)',
      },
      {
        id: 'agentic-context',
        name: 'Agentic & Long-Context Sessions',
        shortName: 'Agentic & Long-Context',
        tier: 0.5 as unknown as number,
        description: 'Multi-step agentic tasks that previously needed prohibitive GPU memory run at 100× scale with consistent response times — long-context workloads become viable in production',
        storageUse: 'Shared context memory reused across reasoning steps and across the cluster',
        ioPattern: 'Write-once per prefill, read-many per generation step',
      },
      {
        id: 'independent-scaling',
        name: 'Independent Scaling',
        shortName: 'Independent Scaling',
        tier: 0.5 as unknown as number,
        description: 'Scale GPU compute and shared context memory independently — add KV cache capacity without provisioning more GPU nodes, and vice versa',
        storageUse: 'Petabytes of G3.5 KV cache deployed across the inference cluster',
        ioPattern: 'Spectrum-X 800 GbE + PCIe Gen6, driven to near wire speed',
      },
    ],
    details: [
      'MinIO MemKV — a single ARM64-native binary embedded in NVIDIA STX',
      'Built for the G3.5 layer between GPU HBM (G3) and object storage (G4)',
      'KV cache GPU → NVMe over RDMA — no file system, no object protocol, no CPU in the path',
      '2–16 MB blocks tuned for throughput-oriented GPU access',
      'Built for NVIDIA Spectrum-X 800 GbE and PCIe Gen6 — near wire speed',
      'Sustains 95%+ GPU utilization cluster-wide (not a single-node peak)',
      'Agentic / long-context workloads run at 100× scale with consistent latency',
      'Petascale shared KV pool across the entire serving infrastructure',
      'GPU compute and context memory scale independently',
    ],
  },
  {
    id: 'tier-1',
    tier: 1,
    name: 'RDMA → S3 to 100% NVMe',
    subtitle: 'S3 over RDMA to all-NVMe nodes',
    capacity: '100s TB+',
    latency: '1-5ms',
    isMinIO: true,
    color: '#C72C48', // MinIO Raspberry
    description: 'MinIO AIStor on all-NVMe nodes, served over S3 with RDMA transport. Operational, latency-sensitive S3 for active workloads — the hot lifecycle tier.',
    accessMethod: 'S3 over RDMA (RoCE v2) to 100% NVMe',
    components: [
      {
        id: 'pytorch-dataloader',
        name: 'PyTorch DataLoader',
        shortName: 'PyTorch DataLoader',
        tier: 1,
        description: 'Streaming tokenized shards to GPUs via S3 with prefetch buffers',
        storageUse: 'Sequential reads with multi-worker prefetch',
        ioPattern: 'High aggregate read throughput (~103.5 GB/s GET, 8-node reference)',
      },
      {
        id: 'kubeflow-artifacts',
        name: 'Kubeflow Pipeline Artifacts',
        shortName: 'Kubeflow Pipeline Artifacts',
        tier: 1,
        description: 'Intermediate outputs between pipeline steps (models, metrics, datasets)',
        storageUse: 'Step outputs, workflow state, inter-stage data',
        ioPattern: 'Mixed R/W, workflow-driven, ephemeral',
      },
      {
        id: 'mlflow-active',
        name: 'MLflow Model Registry',
        shortName: 'MLflow Model Registry',
        tier: 1,
        description: 'Active model versions staged for deployment — fast retrieval required',
        storageUse: 'Production model binaries, version metadata',
        ioPattern: 'Read-heavy, low-latency serving path',
      },
      {
        id: 'ray-objects',
        name: 'Ray Object Store',
        shortName: 'Ray Object Store',
        tier: 1,
        description: 'Distributed shared objects across Ray workers for parallel compute',
        storageUse: 'Shared tensors, intermediate results across workers',
        ioPattern: 'Random R/W, distributed, latency-sensitive',
      },
    ],
    details: [
      'MinIO AIStor Pod IN-CLUSTER (not adjacent)',
      'Single pod with local NVMe drives',
      'Operational S3 — not capacity tier',
      '~103.5 GB/s aggregate GET (8-node reference, ~12.9 GB/s/node)',
      'Scales linearly as nodes are added',
      'MinIO Cache (DRAM) prevents GPU starvation',
      'S3 API over localhost / service mesh',
    ],
  },
  {
    id: 'tier-2',
    tier: 2,
    name: 'Standard S3 → 100% NVMe',
    subtitle: 'Standard S3 (100G) to all-NVMe nodes',
    capacity: 'PB+',
    latency: '5-15ms',
    isMinIO: true,
    color: '#F59E0B', // Amber
    description: 'MinIO AIStor — high-performance S3 over RDMA delivering GPUDirect transfers straight into GPU HBM. THE capacity tier: Data Lake, Lakehouse, Medallion architecture. AIStor Tables (native Iceberg), Delta Sharing, ClickHouse analytics backend. 800 GbE Spectrum-X RoCE v2.',
    accessMethod: 'S3 over RDMA / RoCE v2 (800 GbE Spectrum-X)',
    components: [
      {
        id: 'checkpoints',
        name: 'Training Checkpoints',
        shortName: 'Training Checkpoints',
        tier: 2,
        description: 'Full model state saved for disaster recovery — 500 GB to 1 TB per save (70B model)',
        storageUse: 'Periodic full-state snapshots during training runs',
        ioPattern: 'Bursty sequential writes, 50-100 GB/s peak',
      },
      {
        id: 'medallion',
        name: 'Medallion Architecture (Bronze/Silver/Gold)',
        shortName: 'Medallion (Bronze/Silver/Gold)',
        tier: 2,
        description: 'Lakehouse data lifecycle: raw ingest → cleaned/deduped → tokenized/sharded',
        storageUse: 'Each layer is a full read-write cycle through object storage',
        ioPattern: 'ELT batch processing, TB-scale per job',
      },
      {
        id: 'feast-features',
        name: 'Feast Feature Store',
        shortName: 'Feast Feature Store',
        tier: 2,
        description: 'Offline feature snapshots in Parquet/ORC for reproducible training',
        storageUse: 'Historical feature tables, point-in-time joins',
        ioPattern: 'Bulk columnar reads for training pipelines',
      },
      {
        id: 's3-tables',
        name: 'AIStor Tables (Native Iceberg V3)',
        shortName: 'AIStor Tables (Iceberg V3)',
        tier: 2,
        description: 'Native Iceberg V3 with REST Catalog API, Iceberg Views, multi-table atomic transactions, deletion vectors, Variant type, and row-level lineage',
        storageUse: 'Structured data with transactional guarantees — born-clean lakehouse',
        ioPattern: 'Columnar reads/writes, partition pruning, zero-copy Delta Sharing to Databricks',
      },
    ],
    details: [
      'MinIO AIStor — THE CAPACITY TIER',
      'Data Lake / Lakehouse lives here',
      'AIStor Tables: Native Iceberg V3 with REST Catalog API',
      'Delta Sharing: zero-copy access from Databricks',
      'ClickHouse analytics backend (coming soon)',
      'Medallion: Bronze → Silver → Gold',
      'S3 over RDMA to NVMe — 800 GbE Spectrum-X RoCE v2',
      'Reed-Solomon erasure coding (whitepaper: per-object inline EC)',
      '~34.4 GB/s PUT (8-node reference); scales with node count',
    ],
  },
  {
    id: 'tier-3',
    tier: 3,
    name: 'Cold Archive',
    subtitle: 'Standard S3 (25G/100G) to SSD or hybrid SSD/HDD',
    capacity: 'EB+',
    latency: '15-50ms',
    isMinIO: true,
    color: '#6B7280', // Gray
    description: 'MinIO AIStor with Object Lock. S3 to NVMe/SSD over 100GbE. 7-year retention, WORM compliance, immutable audit trails.',
    accessMethod: 'Standard S3 (25G/100G) w/ Object Lock + ILM — SSD or hybrid SSD/HDD',
    components: [
      {
        id: 'trustyai-logs',
        name: 'TrustyAI Audit Logs',
        shortName: 'TrustyAI Audit Logs',
        tier: 3,
        description: 'Immutable model lineage and decision audit trail — WORM-protected',
        storageUse: 'Write-once compliance logs with Object Lock',
        ioPattern: 'Write-once, read on audit/investigation',
      },
      {
        id: 'model-archives',
        name: 'Model Version Archive',
        shortName: 'Model Version Archive',
        tier: 3,
        description: 'Retired model versions retained for regulatory compliance',
        storageUse: 'Long-term immutable model retention via ILM from Tier 2',
        ioPattern: 'Auto-tiered from Tier 2, rarely retrieved',
      },
      {
        id: 'historical-data',
        name: 'Historical Training Data',
        shortName: 'Historical Training Data',
        tier: 3,
        description: 'Original training datasets preserved for reproducibility and legal holds',
        storageUse: 'Legal/compliance retention, SEC 17a-4(f)',
        ioPattern: 'Archive, retrieved for audits or retraining',
      },
    ],
    details: [
      'MinIO AIStor with Object Lock',
      'WORM: SEC 17a-4(f), FINRA 4511(c) (whitepaper)',
      '7-year retention policies',
      'Immutable audit trails',
      'Auto-tiering from Tier 2 via ILM (whitepaper: lifecycle mgmt)',
      'Legal hold capability',
      'BitRot protection via HighwayHash >10 GB/s/core',
    ],
  },
]

/*
// Data flows for future animation use
const dataFlows: DataFlowPath[] = [
  { id: 'ingest-to-lake', from: 'tier-1', to: 'tier-2', label: 'ELT to Lake', volume: 'massive', animated: true },
  { id: 'lake-to-loader', from: 'tier-2', to: 'tier-1', label: 'Training Data', volume: 'heavy', animated: true },
  { id: 'loader-to-gpu', from: 'tier-1', to: 'tier-0', label: 'Batches', volume: 'heavy', animated: true },
  { id: 'gpu-to-checkpoint', from: 'tier-0', to: 'tier-2', label: 'Checkpoints', volume: 'heavy', animated: true },
  { id: 'archive-ilm', from: 'tier-2', to: 'tier-3', label: 'ILM Archive', volume: 'medium', animated: false },
]
*/

// ============================================================================
// COMPONENT
// ============================================================================

export default function StorageLayoutExplorer() {
  const [selectedTier, setSelectedTier] = useState<StorageTier | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<ComponentInfo | null>(null)
  const [showLakehouseInfo, setShowLakehouseInfo] = useState(false)
  const [activeSoftware, setActiveSoftware] = useState<string | null>(null)

  // Which tier numbers are highlighted by the active software pill
  const highlightedTiers = useMemo<number[]>(() => {
    if (!activeSoftware) return []
    const sw = softwareStack.find(s => s.name === activeSoftware)
    if (!sw) return []
    return Array.isArray(sw.tier) ? sw.tier : [sw.tier]
  }, [activeSoftware])

  const handleTierClick = useCallback((tier: StorageTier) => {
    setSelectedTier(tier)
    setSelectedComponent(null)
  }, [])

  const handleComponentClick = useCallback((component: ComponentInfo, tier: StorageTier) => {
    setSelectedComponent(component)
    setSelectedTier(tier)
  }, [])

  const handleClose = useCallback(() => {
    setSelectedTier(null)
    setSelectedComponent(null)
  }, [])

  const handleSoftwareClick = useCallback((name: string) => {
    setActiveSoftware(prev => prev === name ? null : name)
  }, [])

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-white/10 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-raspberry animate-pulse" />
              AI Storage Layout
              <span className="text-sm font-normal text-gray-400">— The 5-Tier Architecture (incl. the G3.5 layer · MinIO MemKV)</span>
            </h3>
            <p className="text-sm text-gray-400 mt-1">Click any tier or component to explore details</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLakehouseInfo(true)}
              className="relative px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-colors border border-amber-500/30"
            >
              {/* Follow-me badge from Storage Tiers (step 3 purple) */}
              <span
                className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg animate-pulse"
                style={{ backgroundColor: '#8B5CF6', boxShadow: '0 0 8px rgba(139,92,246,0.6)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              Data Lake vs Lakehouse?
            </button>
          </div>
        </div>
      </div>

      {/* Software Stack - Above the Tiers */}
      <div className="px-6 py-4 border-b border-white/10 bg-gray-800/30">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Application Layer</span>
          <span className="text-[10px] text-gray-500">
            {activeSoftware
              ? <>
                  <span className="text-white font-semibold">{activeSoftware}</span>
                  {' '}uses Tier {highlightedTiers.join(' & ')}
                  <button onClick={() => setActiveSoftware(null)} className="ml-2 text-gray-400 hover:text-white">✕</button>
                </>
              : 'Click any app to see which tiers it uses'
            }
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {softwareStack.map((sw) => {
            const tierArr = Array.isArray(sw.tier) ? sw.tier : [sw.tier]
            const isActive = activeSoftware === sw.name
            const tierColors = tierArr.map(t => storageTiers.find(st => st.tier === t)?.color || '#fff')
            return (
              <button
                key={sw.name}
                onClick={() => handleSoftwareClick(sw.name)}
                className={`relative px-3 py-2 rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'scale-105 shadow-lg'
                    : activeSoftware
                      ? 'opacity-40 hover:opacity-70'
                      : 'hover:border-white/40 hover:scale-105'
                } border ${
                  isActive ? 'border-white/50 bg-gray-700/80' : 'border-white/10 bg-gray-800/50'
                }`}
                style={isActive ? { boxShadow: `0 0 12px ${tierColors[0]}40, 0 0 0 2px ${tierColors[0]}` } : undefined}
              >
                <span className={`text-xs font-semibold ${
                  isActive ? 'text-white' : 'text-gray-200'
                }`}>{sw.name}</span>
                <span className="ml-1.5 text-[10px] font-medium" style={{
                  color: isActive ? tierColors[0] : '#6b7280'
                }}>
                  T{tierArr.join(',')}
                </span>
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {tierArr.map(t => (
                      <div key={t} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: storageTiers.find(st => st.tier === t)?.color }} />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Diagram — grid on the left, detail docked on the right (desktop) */}
      <div className="p-6 lg:p-8 lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 lg:items-start">
        <div>
        {/* Tier Cards - compact, natural-height columns (no equal-height void) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8 items-start">
          {storageTiers.map((tier, i) => (
            <TierCard
              key={tier.id}
              tier={tier}
              index={i}
              isSelected={selectedTier?.id === tier.id}
              isHighlighted={highlightedTiers.includes(tier.tier)}
              isDimmed={highlightedTiers.length > 0 && !highlightedTiers.includes(tier.tier)}
              onClick={() => handleTierClick(tier)}
              onComponentClick={(comp) => handleComponentClick(comp, tier)}
            />
          ))}
        </div>

        {/* Capacity Scale Bar */}
        <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-300">Capacity Scale</span>
          </div>
          <div className="flex items-center gap-1 h-12">
            <div className="flex-1 bg-emerald-500/30 rounded h-full flex items-center justify-center">
              <div className="text-[10px] text-emerald-400 font-medium">TB+</div>
            </div>
            <div className="flex-1 rounded h-full flex items-center justify-center" style={{ backgroundColor: 'rgba(20,184,166,0.2)' }}>
              <div className="text-[10px] font-medium" style={{ color: '#14B8A6' }}>TB+</div>
            </div>
            <div className="flex-1 bg-raspberry/30 rounded h-full flex items-center justify-center">
              <div className="text-[10px] text-raspberry font-medium">TB+</div>
            </div>
            <div className="flex-1 bg-amber-500/30 rounded h-full flex items-center justify-center">
              <div className="text-[10px] text-amber-400 font-medium">PB+</div>
            </div>
            <div className="flex-1 bg-gray-500/30 rounded h-full flex items-center justify-center">
              <div className="text-[10px] text-gray-400 font-medium">EB+</div>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-500">
            <span>Tier 0</span>
            <span>Tier G3.5</span>
            <span>Tier 1</span>
            <span>Tier 2</span>
            <span>Tier 3</span>
          </div>
        </div>

        {/* Key Insight */}
        <div className="bg-gradient-to-r from-teal-500/10 to-transparent border border-teal-500/20 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-teal-400 mb-1">NEW: The G3.5 Layer — MinIO MemKV Brings Context Memory to Inference</h4>
              <p className="text-sm text-gray-400">
                <strong className="text-white">The G3.5 layer sits between GPU HBM and object storage</strong>, and
                <strong className="text-white"> MinIO MemKV</strong> is purpose-built for it. KV cache moves from GPU memory to shared
                NVMe over RDMA — no file system, no object protocol, no CPU in the data path — so GPUs decode instead of recomputing
                context they already processed. It runs inside NVIDIA STX as a single ARM64-native binary and sustains 95%+ GPU utilization
                cluster-wide, letting agentic and long-context workloads run at 100× scale with consistent latency.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-emerald-400 mb-1">Two Lenses, Not One Stack</h4>
              <p className="text-sm text-gray-400">
                There are two ways to slice this, and they don't mash into a single ladder.
                <strong className="text-teal-400"> NVIDIA's GPU-memory hierarchy</strong> names the inference-side layers: <strong className="text-white">G3.5</strong> is
                where <strong className="text-white">MinIO MemKV</strong> lives (shared NVMe context memory over RDMA), and <strong className="text-white">G4.0</strong> is networked S3/RDMA
                object storage. <strong className="text-emerald-300"> The storage-agnostic ILM view</strong> is the lifecycle MinIO AIStor manages:
                <strong className="text-white"> Tier 0</strong> direct-attach NVMe (DirectPV), <strong className="text-white">Tier 1</strong> RDMA→S3 on all-NVMe,
                <strong className="text-white"> Tier 2</strong> standard S3 (100G) on all-NVMe, and <strong className="text-white">Tier 3</strong> standard S3 (25G/100G) on SSD or hybrid SSD/HDD.
              </p>
            </div>
          </div>
        </div>
        {/* end left column */}
        </div>

        {/* Detail Dock — sticky right-rail on desktop, modal on mobile */}
        <DetailDock
          open={!!(selectedTier || selectedComponent)}
          onClose={handleClose}
          contentKey={selectedComponent?.id ?? selectedTier?.id}
        >
          <DetailPanel
            tier={selectedTier}
            component={selectedComponent}
            onClose={handleClose}
          />
        </DetailDock>
      </div>

      {/* Lakehouse Modal */}
      {showLakehouseInfo && (
        <LakehouseModal onClose={() => setShowLakehouseInfo(false)} />
      )}

      {/* Legend */}
      <div className="bg-gray-800/50 border-t border-white/10 px-6 py-4">
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-500" />
            <span className="text-gray-400">Tier 0: NVMe Local Block (NOT MinIO AIStor)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#0891B2' }} />
            <span className="text-gray-400">G3.5: Context Memory (MinIO MemKV · shared NVMe over RDMA)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-raspberry" />
            <span className="text-gray-400">Tier 1: NVMe Local PVC/S3 (MinIO AIStor)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500" />
            <span className="text-gray-400">Tier 2: RDMA/S3 to NVMe 800GbE (MinIO AIStor)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-500" />
            <span className="text-gray-400">Tier 3: Cold Archive (Compliance)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface TierCardProps {
  tier: StorageTier
  index: number
  isSelected: boolean
  isHighlighted: boolean
  isDimmed: boolean
  onClick: () => void
  onComponentClick: (comp: ComponentInfo) => void
}

function TierCard({ tier, index, isSelected, isHighlighted, isDimmed, onClick, onComponentClick }: TierCardProps) {
  return (
    <div
      className={`stagger-item relative rounded-xl border-2 transition-all duration-300 cursor-pointer ${
        isSelected
          ? 'border-white/50 shadow-lg scale-[1.02]'
          : isHighlighted
            ? 'border-white/40 shadow-lg scale-[1.02]'
            : isDimmed
              ? 'border-white/5 opacity-30 scale-[0.98]'
              : 'border-white/10 hover:border-white/30 hover:-translate-y-1'
      }`}
      style={{ 
        ['--i' as string]: index,
        background: `linear-gradient(135deg, ${tier.color}${isHighlighted ? '25' : '15'} 0%, transparent 100%)`,
        borderColor: isSelected ? tier.color : isHighlighted ? `${tier.color}90` : undefined,
        boxShadow: isHighlighted ? `0 0 20px ${tier.color}30` : undefined,
      }}
      onClick={onClick}
    >
      {/* Highlight glow ring when software pill targets this tier */}
      {isHighlighted && (
        <div
          className="absolute -inset-1 rounded-xl opacity-25 animate-pulse pointer-events-none"
          style={{ backgroundColor: tier.color }}
        />
      )}
      {/* Header - compact */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-2.5">
          <span
            className="px-2 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: `${tier.color}30`, color: tier.color }}
          >
            TIER {tier.tier}
          </span>
          {!tier.isMinIO && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
              NOT MinIO AIStor
            </span>
          )}
          {tier.isMinIO && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-raspberry/20 text-raspberry">
              MinIO AIStor
            </span>
          )}
        </div>
        
        <h4 className="text-white font-bold text-base lg:text-lg leading-tight">{tier.name}</h4>
        <p className="text-gray-400 text-sm mt-1">{tier.subtitle}</p>
        
        <div className="flex flex-wrap items-center gap-3 lg:gap-4 mt-3 text-xs">
          <div>
            <span className="text-gray-500">Capacity:</span>
            <span className="text-white font-semibold ml-1">{tier.capacity}</span>
          </div>
          <div>
            <span className="text-gray-500">Latency:</span>
            <span className="font-semibold ml-1" style={{ color: tier.color }}>{tier.latency}</span>
          </div>
        </div>
      </div>

      {/* Components */}
      <div className="p-3 space-y-1.5">
        {tier.components.map((comp) => (
          <button
            key={comp.id}
            onClick={(e) => {
              e.stopPropagation()
              onComponentClick(comp)
            }}
            className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-white font-medium leading-snug">{comp.shortName}</span>
              <svg className="nudge-x w-4 h-4 text-gray-500 group-hover:text-white transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{comp.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

interface DetailPanelProps {
  tier: StorageTier | null
  component: ComponentInfo | null
  onClose: () => void
}

function DetailPanel({ tier, component, onClose }: DetailPanelProps) {
  if (!tier) return null

  return (
    <div className="rounded-2xl border border-white/10 bg-gray-900/95 lg:bg-gray-900/80 backdrop-blur-xl shadow-2xl">
      <div className="p-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                className="px-3 py-1 rounded-full text-sm font-bold"
                style={{ backgroundColor: `${tier.color}30`, color: tier.color }}
              >
                TIER {tier.tier}
              </span>
              {!tier.isMinIO && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                  NOT OBJECT STORAGE
                </span>
              )}
            </div>
            <h3 className="text-2xl font-bold text-white">
              {component ? component.name : tier.name}
            </h3>
            <p className="text-gray-400 mt-1">
              {component ? component.description : tier.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {component ? (
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-gray-800/50 rounded-xl p-3.5">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Storage Use</h4>
              <p className="text-white">{component.storageUse}</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-3.5">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">I/O Pattern</h4>
              <p className="text-white">{component.ioPattern}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Key Details</h4>
              <ul className="space-y-2">
                {tier.details.map((detail, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span
                      className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tier.color }}
                    />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Access Method</h4>
              <code className="block text-sm bg-gray-900 text-raspberry-light px-3 py-2 rounded-lg font-mono">
                {tier.accessMethod}
              </code>
              
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mt-4 mb-3">Capacity</h4>
              <div className="text-2xl font-bold" style={{ color: tier.color }}>{tier.capacity}</div>
              
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mt-4 mb-3">Latency Target</h4>
              <div className="text-2xl font-bold" style={{ color: tier.color }}>{tier.latency}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LakehouseModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl border border-white/10 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Data Lake vs Data Lakehouse</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* The Swamp */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
            <h4 className="text-lg font-bold text-red-400 mb-3">
              Approach 1: "The Swamp Evolution" 🏚️
            </h4>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-red-400 font-semibold mb-1">DATA LAKE (The Swamp)</div>
                <ul className="space-y-1 text-gray-400">
                  <li>• Raw files dumped in S3 — Parquet, CSV, JSON chaos</li>
                  <li>• No schema, no ACID, no governance</li>
                  <li>• "Data Swamp" — nobody knows what's in there</li>
                </ul>
              </div>
              <div className="text-center text-gray-500">↓ Years later... ↓</div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-amber-400 font-semibold mb-1">DATA LAKEHOUSE (Bolted On)</div>
                <ul className="space-y-1 text-gray-400">
                  <li>• Iceberg/Delta/Hudi table format ADDED on top</li>
                  <li>• Now you have schema, ACID, time travel</li>
                  <li>• <span className="text-red-400">But the swamp is still underneath</span></li>
                  <li>• Retrofitted governance, migration pain</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Born Clean */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
            <h4 className="text-lg font-bold text-emerald-400 mb-3">
              Approach 2: "Born Clean" ✨
            </h4>
            <div className="bg-gray-800/50 rounded-lg p-3 text-sm">
              <div className="text-emerald-400 font-semibold mb-2">DATA LAKEHOUSE (Native)</div>
              <ul className="space-y-1 text-gray-300">
                <li>• Start fresh with S3 Tables (Iceberg/Hudi/Delta)</li>
                <li>• Schema-on-write from day 1</li>
                <li>• ACID transactions, time travel, governance BUILT IN</li>
                <li>• <span className="text-emerald-400 font-semibold">No swamp — just structured medallion</span></li>
                <li>• MinIO S3 Tables = born-clean lakehouse</li>
              </ul>
            </div>
          </div>

          {/* MinIO AIStor Tables */}
          <div className="bg-raspberry/10 border border-raspberry/30 rounded-xl p-5">
            <h4 className="text-lg font-bold text-raspberry mb-3">
              MinIO AIStor Tables — Native Iceberg V3 + Delta Sharing
            </h4>
            <p className="text-sm text-gray-300 mb-3">
              MinIO AIStor Tables embeds <strong className="text-white">Apache Iceberg V3 natively</strong> — the first data store to do so. 
              Full REST Catalog API, Iceberg Views, multi-table atomic transactions, deletion vectors (Roaring Bitmaps), row-level lineage, 
              Variant type for semi-structured data, and native geometry/geography types.
            </p>
            <p className="text-sm text-gray-300 mb-3">
              <strong className="text-white">AIStor Table Sharing</strong> embeds the Delta Sharing protocol directly into AIStor, 
              enabling live, read-only access to on-premises data from <strong className="text-white">Databricks</strong> without 
              replication, extra infrastructure, or a separate sharing server.
            </p>
            <div className="bg-gray-800/50 rounded-lg p-3 text-sm font-mono text-raspberry-light">
              On-Prem MinIO AIStor<br/>
              → AIStor Tables (Native Iceberg V3)<br/>
              → AIStor Table Sharing (Delta Sharing protocol)<br/>
              → Databricks Unity Catalog<br/>
              <span className="text-emerald-400">→ ZERO COPY — data never leaves MinIO AIStor</span>
            </div>
          </div>

          {/* Bottom Line */}
          <div className="text-sm text-gray-400">
            <strong className="text-white">Bottom Line:</strong> If you're starting new, go Lakehouse-native. 
            If you inherited a swamp, S3 Tables lets you add structure without ripping everything out.
          </div>
        </div>
      </div>
    </div>
  )
}
