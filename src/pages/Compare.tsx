import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, BottomLine } from '../components/PipelineDiagram'

// =============================================================================
// TYPES
// =============================================================================

type Role = 'primary' | 'buffered' | 'burst' | 'not-in-path' | 'varies' | 'active-tier'
type Tier = 0 | 1 | 2 | 3

interface PhaseDetail {
  role: Role
  short: string
  detail: string
  tier: Tier | Tier[]
  apps: string[]
  s3Path: string
  ioProfile: string
  volume: string
  minioFeature: string
  paperRef?: string  // citation from MinIO whitepaper
}

interface WorkloadSummary {
  key: string
  label: string
  color: string
  bgColor: string
  borderColor: string
  intensity: string
  intensityPct: number
  nodeCount: number
  description: string
  keyInsight: string
  hotPath: string
  peakThroughput: string
  dataScale: string
}

// =============================================================================
// THE COMPARISON MATRIX — Every cell has tier, apps, S3 path, I/O profile
// All performance numbers cross-referenced with:
//   "MinIO High-Performance Object Storage for AI Data Infrastructure"
// =============================================================================

const phases = [
  'Data Ingestion',
  'Data Processing',
  'Active Compute Loop',
  'Checkpointing',
  'Model / Artifact Registry',
  'Observability & Logging',
  'Feedback / Iteration Loop',
] as const

type Phase = typeof phases[number]

const matrix: Record<Phase, Record<string, PhaseDetail>> = {
  'Data Ingestion': {
    training: {
      role: 'primary',
      short: 'PB-scale writes',
      detail: 'Web scrapes, Common Crawl, domain corpora — petabytes of unstructured data land in the Bronze layer of the Lakehouse. MinIO\'s disaggregated architecture enables compute-storage separation so ingestion clusters scale independently of GPU clusters.',
      tier: 2,
      apps: ['Spark', 'Airflow', 'Kafka'],
      s3Path: 's3://data-lake/raw/common-crawl/',
      ioProfile: 'Sequential writes, 10-50 GB/s ingestion',
      volume: 'Petabytes',
      minioFeature: 'High sustained PUT throughput on an 8-node reference cluster (~34.4 GB/s PUT); scales linearly as nodes are added',
      paperRef: 'Source of truth (minio-core-v2): 8-Node AIStor Reference Cluster — ~103.5 GB/s aggregate GET, ~34.4 GB/s PUT, scales with node count',
    },
    rag: {
      role: 'primary',
      short: 'Continuous ingestion',
      detail: 'Documents arrive continuously — PDFs, APIs, web pages. Object storage is the canonical source of truth. MinIO bucket notifications (via Kafka, NATS, AMQP, MQTT, Webhooks) trigger downstream pipelines automatically on upload.',
      tier: 2,
      apps: ['LangChain', 'LlamaIndex', 'Kafka'],
      s3Path: 's3://rag-source/documents/',
      ioProfile: 'Continuous small-medium writes',
      volume: 'GBs to TBs',
      minioFeature: 'Bucket notifications via Kafka/NATS/AMQP/MQTT/Webhooks — event-driven pipeline triggers',
      paperRef: 'Whitepaper: "Lambda Notifications" supporting Kafka, NATS, AMQP, MQTT, Webhooks, Elasticsearch, Redis, Postgres, MySQL',
    },
    fineTuning: {
      role: 'primary',
      short: 'Small datasets (GB)',
      detail: 'Curated instruction/response pairs in JSONL format. Thousands to millions of examples — not trillions of tokens. Quality > quantity. Object versioning preserves every dataset iteration for reproducibility.',
      tier: 2,
      apps: ['Custom curation'],
      s3Path: 's3://finetune-data/customer-support-v2/train.jsonl',
      ioProfile: 'Small-medium writes during curation',
      volume: 'MBs to GBs',
      minioFeature: 'Object versioning with delete markers — every dataset iteration preserved and recoverable',
      paperRef: 'Whitepaper: "Object-level versioning" with delete markers for complete audit trail',
    },
    inference: {
      role: 'not-in-path',
      short: 'N/A',
      detail: 'Inference does not ingest raw training data. The model weights already encode the knowledge from training.',
      tier: [],
      apps: [],
      s3Path: '—',
      ioProfile: 'None',
      volume: '—',
      minioFeature: '—',
    },
  },

  'Data Processing': {
    training: {
      role: 'primary',
      short: 'ELT Medallion (TB/job)',
      detail: 'Spark transforms raw data through Bronze → Silver → Gold via Iceberg tables. Each layer is a full read-write cycle. Deduplication removes 30-50%. S3 Select with SIMD acceleration pre-filters data server-side, reducing bandwidth by 80%+.',
      tier: [0, 2],
      apps: ['Spark', 'Iceberg', 'Polars', 'Presto/Trino'],
      s3Path: 's3://lakehouse/bronze/ → silver/ → gold/',
      ioProfile: 'Batch R/W cycles, TB-scale per job',
      volume: 'Terabytes per ELT stage',
      minioFeature: 'S3 Tables (Iceberg) — ACID, time travel; S3 Select with SIMD cuts bandwidth 80%+',
      paperRef: 'Whitepaper: "S3 Select" — SIMD-accelerated, supports CSV/JSON/Parquet, returns partial data; "S3 compatible" with Spark, Presto, Trino, Hive',
    },
    rag: {
      role: 'primary',
      short: 'Chunking + Embedding',
      detail: 'Documents split into 512-2048 token chunks, cleaned, embedded into 768-1536 dim vectors via embedding model, stored in vector DB. S3 Select enables server-side filtering of document metadata before processing.',
      tier: [0, 1, 2],
      apps: ['Weaviate', 'Sentence Transformers'],
      s3Path: 's3://rag-processed/chunks/doc-{id}-chunk-{N}.json',
      ioProfile: 'Read source → Write chunks → Write vectors',
      volume: 'Millions of chunk objects',
      minioFeature: 'S3 Select — SIMD-accelerated server-side filtering, 80%+ bandwidth reduction on CSV/JSON/Parquet',
      paperRef: 'Whitepaper: "S3 Select" queries CSV, JSON, Parquet objects server-side, returning only matching data',
    },
    fineTuning: {
      role: 'not-in-path',
      short: 'Pre-curated',
      detail: 'Fine-tuning data is curated offline. No Medallion pipeline or ELT — datasets arrive ready to use. The "processing" is human curation.',
      tier: [],
      apps: [],
      s3Path: '—',
      ioProfile: 'None — datasets pre-curated',
      volume: '—',
      minioFeature: '—',
    },
    inference: {
      role: 'not-in-path',
      short: 'N/A',
      detail: 'Inference does not process raw data. It serves a finished model.',
      tier: [],
      apps: [],
      s3Path: '—',
      ioProfile: 'None',
      volume: '—',
      minioFeature: '—',
    },
  },

  'Active Compute Loop': {
    training: {
      role: 'buffered',
      short: 'High-throughput streaming',
      detail: 'PyTorch DataLoader streams tokenized shards from fast S3 (Tier 1, RDMA → 100% NVMe) with multi-worker prefetch. MinIO Cache (distributed shared DRAM cache) eliminates cold reads and prevents GPU starvation. GPU training loop runs in HBM — no storage I/O during forward/backward pass.',
      tier: [0, 1],
      apps: ['PyTorch DataLoader', 'Ray', 'DeepSpeed'],
      s3Path: 's3://lakehouse/gold/tokenized-shards/',
      ioProfile: 'Sequential reads w/ prefetch, high aggregate GET',
      volume: 'Continuous stream',
      minioFeature: '~103.5 GB/s aggregate GET on an 8-node reference cluster (scales with nodes); MinIO Cache (DRAM) prevents GPU starvation on hot reads',
      paperRef: 'Source of truth (minio-core-v2): 8-Node AIStor Reference Cluster ~103.5 GB/s aggregate GET; "MinIO Cache" — distributed shared DRAM cache for high-performance AI workloads',
    },
    rag: {
      role: 'varies',
      short: 'Arch-dependent',
      detail: 'Vector search runs in Weaviate (Tier 0 — local NVMe HNSW). LLM generation is GPU-only. If chunks fetched from S3 at query time, storage is in hot path. MinIO Cache can accelerate frequently-accessed chunks.',
      tier: 0,
      apps: ['Weaviate', 'vLLM'],
      s3Path: 'Weaviate PVC (Tier 0 block)',
      ioProfile: 'Random reads, <500μs HNSW lookups',
      volume: 'Per-query (ms-scale)',
      minioFeature: 'Weaviate S3 backup/restore for DR; MinIO Cache for frequently-accessed chunk acceleration',
      paperRef: 'Whitepaper: "MinIO Cache" accelerates hot reads; MinIO serves as durable backend for vector DB snapshots',
    },
    fineTuning: {
      role: 'buffered',
      short: 'Streaming reads',
      detail: 'Same DataLoader pattern as training but dramatically smaller scale. Frozen base model + LoRA adapters trained on <1% of parameters. Hours, not weeks.',
      tier: [0, 1],
      apps: ['PyTorch + PEFT/LoRA'],
      s3Path: 's3://finetune-data/customer-support-v2/train.jsonl',
      ioProfile: 'Sequential reads (small dataset)',
      volume: 'MBs to GBs',
      minioFeature: 'Fast single-object read; an 8-node reference cluster (~103.5 GB/s aggregate GET) is far more than enough for small-scale fine-tuning',
      paperRef: 'Source of truth (minio-core-v2): 8-Node AIStor Reference Cluster ~103.5 GB/s aggregate GET',
    },
    inference: {
      role: 'active-tier',
      short: 'MemKV G3.5 Context Memory',
      detail: 'Short requests run entirely in GPU HBM. For agentic and long-context workloads, the KV cache lives in the G3.5 context-memory layer (NVIDIA memory-hierarchy lens) instead of being evicted and recomputed. MinIO MemKV moves KV cache GPU→NVMe over RDMA — no file system, no object protocol, no CPU in the data path — over Spectrum-X 800 GbE.',
      tier: [0, 1] as Tier[],
      apps: ['vLLM', 'Triton', 'NIXL', 'Dynamo/KVBM'],
      s3Path: '# G3.5 context-memory pool (NIXL plugin, not the S3 API)',
      ioProfile: 'Microsecond random R/W via RDMA (long-context/agentic)',
      volume: 'GBs-TBs of KV state per session',
      minioFeature: 'MinIO MemKV — single ARM64-native binary in the NVIDIA STX rack; KV cache GPU→NVMe over RDMA, no CPU in the data path; 2–16 MB blocks; sustains 95%+ GPU utilization cluster-wide',
      paperRef: 'Public product page (min.io/product/memkv): G3.5 context-memory layer between GPU HBM and object storage',
    },
  },

  'Checkpointing': {
    training: {
      role: 'primary',
      short: '500GB-1TB writes',
      detail: 'Full model state (weights + Adam optimizer momentum + variance) saved every N steps. Your disaster recovery. A failed checkpoint during multi-week run = days of lost GPU time. Reed-Solomon erasure coding ensures durability even through drive failures.',
      tier: 2,
      apps: ['PyTorch DCP', 'DeepSpeed'],
      s3Path: 's3://training-checkpoints/{run-id}/step-{N}/',
      ioProfile: 'Bursty large sequential writes',
      volume: '500GB-1TB per checkpoint (70B model)',
      minioFeature: 'Reed-Solomon erasure coding (e.g., 12-drive, 6-parity tolerates 5 failures); BitRot protection via HighwayHash',
      paperRef: 'Whitepaper: "inline, per-object erasure code written in assembly" — Reed-Solomon; 12-drive 6-parity tolerates loss of up to 5 drives; HighwayHash >10 GB/s per core',
    },
    rag: {
      role: 'not-in-path',
      short: '—',
      detail: 'RAG does not train a model, so there are no model checkpoints. Weaviate snapshots are a separate backup operation backed by S3.',
      tier: [],
      apps: [],
      s3Path: '—',
      ioProfile: 'None',
      volume: '—',
      minioFeature: '—',
    },
    fineTuning: {
      role: 'primary',
      short: '~100MB adapters',
      detail: 'Only LoRA adapter weights saved — ~50-500MB per checkpoint vs 500GB+ for full training. 1,000-5,000x smaller. Same S3 pattern, dramatically different scale. Object versioning tracks every adapter iteration.',
      tier: 2,
      apps: ['PEFT', 'MLflow'],
      s3Path: 's3://finetune-checkpoints/{dataset}/epoch-{N}/adapter_model.bin',
      ioProfile: 'Small sequential writes',
      volume: '~50-500 MB per checkpoint',
      minioFeature: 'Object versioning tracks every adapter iteration; erasure coding protects even small objects',
      paperRef: 'Whitepaper: "Object versioning" with delete markers; erasure coding applies per-object regardless of size',
    },
    inference: {
      role: 'not-in-path',
      short: '—',
      detail: 'Inference does not modify weights — nothing to checkpoint. The model is read-only at serving time.',
      tier: [],
      apps: [],
      s3Path: '—',
      ioProfile: 'None',
      volume: '—',
      minioFeature: '—',
    },
  },

  'Model / Artifact Registry': {
    training: {
      role: 'primary',
      short: 'Export destination',
      detail: 'Final trained model exported as safetensors to Model Registry. Versioned, immutable artifact. Object Lock (WORM) ensures compliance — once written, no modification or deletion until retention expires.',
      tier: 2,
      apps: ['MLflow', 'Kubeflow'],
      s3Path: 's3://model-registry/{model}/{version}/model.safetensors',
      ioProfile: 'Large sequential write, versioned',
      volume: '100s GB per model',
      minioFeature: 'S3 Object Lock (WORM) — SEC 17a-4(f), FINRA 4511(c) compliant immutable retention',
      paperRef: 'Whitepaper: "Object Lock" with retention/legal hold, compliant with SEC 17a-4(f), FINRA 4511(c), CFTC 1.31(c-d)',
    },
    rag: {
      role: 'not-in-path',
      short: '—',
      detail: 'RAG uses existing models but does not produce new model artifacts. The embedding model is loaded from registry but not modified.',
      tier: [],
      apps: [],
      s3Path: '—',
      ioProfile: 'None (consumer, not producer)',
      volume: '—',
      minioFeature: '—',
    },
    fineTuning: {
      role: 'primary',
      short: 'Adapter versioning',
      detail: 'LoRA adapters versioned independently from base models. Same base, multiple domain-specific adapters. Clear lineage: /llama-3-8b/adapters/customer-support-v2/. MinIO Catalog enables GraphQL-based metadata search across adapters.',
      tier: [1, 2],
      apps: ['MLflow', 'PEFT'],
      s3Path: 's3://model-registry/{model}/adapters/{adapter-name}/{version}/',
      ioProfile: 'Small sequential writes, read-heavy retrieval',
      volume: '~50-500 MB per adapter',
      minioFeature: 'MinIO Catalog — GraphQL metadata search across billions of adapter artifacts',
      paperRef: 'Whitepaper: "MinIO Catalog" — GraphQL-based namespace and metadata search',
    },
    inference: {
      role: 'burst',
      short: 'Burst read source',
      detail: 'Model weights pulled on cold start, scale-out, or updates. LoRA adapters hot-swapped per request or tenant. MinIO Cache (distributed DRAM) ensures sub-second adapter swaps without cold disk reads.',
      tier: [1, 2],
      apps: ['vLLM', 'Triton', 'KServe'],
      s3Path: 's3://model-registry/llama-3-70b/v1.0/model.safetensors',
      ioProfile: 'Large burst read (model) + small reads (adapters)',
      volume: '16-140 GB models, 50-500 MB adapters',
      minioFeature: 'MinIO Cache (DRAM) — sub-second adapter swaps; high aggregate GET for model loading (~103.5 GB/s on 8 nodes, scaling with node count)',
      paperRef: 'Source of truth (minio-core-v2): 8-Node AIStor Reference Cluster ~103.5 GB/s aggregate GET; "MinIO Cache" — distributed shared DRAM cache',
    },
  },

  'Observability & Logging': {
    training: {
      role: 'primary',
      short: 'Training metrics',
      detail: 'MLflow logs loss curves, learning rate, gradient norms, artifacts. TensorBoard event files. Continuous small writes throughout training. MinIO ILM auto-tiers old experiment data to cold storage.',
      tier: 1,
      apps: ['MLflow', 'TensorBoard', 'W&B'],
      s3Path: 's3://mlflow-artifacts/experiment-{id}/run-{id}/',
      ioProfile: 'Continuous small-medium writes',
      volume: 'GBs per experiment',
      minioFeature: 'ILM lifecycle rules auto-tier old experiments; MLflow artifact backend on MinIO AIStor',
      paperRef: 'Whitepaper: "Lifecycle Management (ILM)" — automatic tiering and expiration rules',
    },
    rag: {
      role: 'primary',
      short: 'Query logs',
      detail: 'Retrieved chunks, relevance scores, latency metrics. Essential for debugging retrieval quality and optimizing chunk strategy. Bucket notifications trigger real-time quality monitoring.',
      tier: [1, 2],
      apps: ['LangSmith', 'Custom'],
      s3Path: 's3://rag-logs/queries/',
      ioProfile: 'Continuous small writes',
      volume: 'GBs over time',
      minioFeature: 'Bucket notifications for real-time quality monitoring; S3 Select on log Parquet files',
      paperRef: 'Whitepaper: "Lambda Notifications" for event-driven monitoring; "S3 Select" for query-in-place on logs',
    },
    fineTuning: {
      role: 'primary',
      short: 'Adapter metrics',
      detail: 'Same as training but smaller scale. Validation loss, adapter convergence, eval metrics. Experiment comparison across adapter iterations.',
      tier: 1,
      apps: ['MLflow', 'W&B'],
      s3Path: 's3://mlflow-artifacts/finetune-{id}/',
      ioProfile: 'Continuous small writes',
      volume: 'MBs to GBs',
      minioFeature: 'MLflow artifact backend — compare adapter experiments with versioned artifacts',
      paperRef: 'Whitepaper: "Object versioning" enables experiment artifact comparison over time',
    },
    inference: {
      role: 'primary',
      short: 'Request/response logs',
      detail: 'Every interaction logged: prompts, completions, token counts, latency, errors. Compliance mandates durable retention. Terabytes at scale. Object Lock enforces immutable log retention.',
      tier: [2, 3],
      apps: ['Prometheus', 'Grafana', 'Custom'],
      s3Path: 's3://inference-logs/{YYYY-MM}/{DD}/requests.parquet',
      ioProfile: 'Continuous small writes (async)',
      volume: 'Terabytes over time',
      minioFeature: 'ILM auto-tiers old logs to Tier 3; Object Lock for compliance retention (SEC 17a-4(f))',
      paperRef: 'Whitepaper: "ILM" for lifecycle tiering; "Object Lock" with legal hold for regulatory compliance',
    },
  },

  'Feedback / Iteration Loop': {
    training: {
      role: 'not-in-path',
      short: '—',
      detail: 'Pre-training is a one-shot process — no direct feedback loop. The dataset is fixed for the duration of a training run.',
      tier: [],
      apps: [],
      s3Path: '—',
      ioProfile: 'None',
      volume: '—',
      minioFeature: '—',
    },
    rag: {
      role: 'primary',
      short: 'Corpus updates',
      detail: 'New documents trigger re-embedding. Relevance feedback improves chunking strategy. The RAG pipeline is inherently iterative — corpus freshness is critical. Bucket notifications auto-trigger re-ingestion.',
      tier: 2,
      apps: ['LangChain', 'Custom'],
      s3Path: 's3://rag-source/ (updated documents)',
      ioProfile: 'Triggered writes on document updates',
      volume: 'Varies',
      minioFeature: 'Bucket notifications trigger re-ingestion automatically on PUT; active-active replication for multi-site',
      paperRef: 'Whitepaper: "Lambda Notifications"; "Active-Active Replication" for multi-site corpus sync',
    },
    fineTuning: {
      role: 'primary',
      short: 'RLHF → new adapter',
      detail: 'User feedback from inference feeds back into fine-tuning via RLHF/DPO. Preference pairs become training data for the next adapter iteration. Object versioning tracks dataset evolution.',
      tier: 2,
      apps: ['TRL', 'Custom RLHF'],
      s3Path: 's3://feedback-data/rlhf/preference-pairs/',
      ioProfile: 'Batch reads of feedback data',
      volume: 'GBs',
      minioFeature: 'Object versioning tracks feedback dataset evolution; batch replication for DR',
      paperRef: 'Whitepaper: "Batch Replication" for disaster recovery of feedback datasets',
    },
    inference: {
      role: 'primary',
      short: 'User feedback → RLHF',
      detail: 'Thumbs up/down, corrections, preference pairs. Stored durably, batched for fine-tuning. Closes the loop: Inference → Feedback → Fine-Tuning → New Adapter → Inference.',
      tier: 2,
      apps: ['Custom feedback API'],
      s3Path: 's3://feedback-data/rlhf/preference-pairs/batch-{date}.jsonl',
      ioProfile: 'Small writes (feedback), batch reads (training)',
      volume: 'GBs over time',
      minioFeature: 'Object Lock for immutable feedback audit trails; WORM compliance',
      paperRef: 'Whitepaper: "Object Lock" with WORM retention for immutable audit records',
    },
  },
}

// =============================================================================
// WORKLOAD SUMMARIES (for top banner)
// =============================================================================

const workloadSummaries: WorkloadSummary[] = [
  {
    key: 'training',
    label: 'Training',
    color: 'text-raspberry',
    bgColor: 'bg-raspberry',
    borderColor: 'border-raspberry',
    intensity: 'Critical Path',
    intensityPct: 100,
    nodeCount: 8,
    description: 'Pre-training from petabytes of raw data. Storage in every phase.',
    keyInsight: 'Storage throughput = GPU utilization. Throughput lost to slow storage shows up directly as idle, expensive GPUs. An 8-node AIStor reference cluster sustains ~103.5 GB/s aggregate GET and scales linearly with node count.',
    hotPath: 'Yes — throughput-sensitive end-to-end',
    peakThroughput: '~103.5 GB/s GET (8-node, scales)',
    dataScale: 'Petabytes in, terabytes of checkpoints',
  },
  {
    key: 'rag',
    label: 'RAG',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-500',
    intensity: 'Architecture-Dependent',
    intensityPct: 75,
    nodeCount: 8,
    description: 'Retrieval-augmented generation. Storage owns ingestion; query path varies.',
    keyInsight: 'Whether storage is in the query hot path depends on your architecture: inline S3, pointer-based retrieval, or Weaviate with S3 backup. Bucket notifications drive event-driven pipelines.',
    hotPath: 'Depends on retrieval architecture',
    peakThroughput: 'Varies — query path may bypass S3',
    dataScale: 'GBs-TBs corpus, millions of vectors',
  },
  {
    key: 'fineTuning',
    label: 'Fine-Tuning',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-500',
    intensity: 'Medium',
    intensityPct: 45,
    nodeCount: 6,
    description: 'LoRA/QLoRA — same patterns as training at 1,000-5,000x smaller scale.',
    keyInsight: 'LoRA adapter ~100MB vs full checkpoint ~500GB. Same S3 patterns, dramatically different scale. An 8-node reference cluster (~103.5 GB/s aggregate GET) is far more than enough.',
    hotPath: 'Possibly (adapter swap at inference)',
    peakThroughput: '~103.5 GB/s GET (8-node)',
    dataScale: 'MBs datasets, MBs adapters',
  },
  {
    key: 'inference',
    label: 'Inference',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-600',
    borderColor: 'border-cyan-600',
    intensity: 'Active Tier (MemKV G3.5)',
    intensityPct: 55,
    nodeCount: 7,
    description: 'Model serving. For agentic/long-context workloads, the KV cache lives in the G3.5 context-memory layer (MinIO MemKV) — storage IS in the inference loop.',
    keyInsight: 'Short requests stay in GPU HBM. Agentic AI with long contexts keeps the KV cache resident in the G3.5 layer (MinIO MemKV) — GPU→NVMe over RDMA, no CPU in the data path — instead of evicting and recomputing. Plus model loading, adapter swaps, logging, RLHF feedback.',
    hotPath: 'Yes — MemKV G3.5 for long-context/agentic',
    peakThroughput: 'Microsecond RDMA (MemKV); high-throughput model load',
    dataScale: '16-140 GB model, GBs-TBs KV state',
  },
]

// =============================================================================
// STYLE CONFIGS
// =============================================================================

const roleConfig: Record<Role, { bg: string; text: string; label: string; dot: string }> = {
  'primary':     { bg: 'bg-gradient-to-r from-raspberry to-raspberry-dark', text: 'text-white', label: 'Primary', dot: 'bg-raspberry' },
  'buffered':    { bg: 'bg-gradient-to-r from-amber-500 to-orange-500',     text: 'text-white', label: 'Buffered', dot: 'bg-amber-500' },
  'burst':       { bg: 'bg-gradient-to-r from-blue-500 to-blue-600',        text: 'text-white', label: 'Burst', dot: 'bg-blue-500' },
  'not-in-path': { bg: 'bg-gradient-to-r from-gray-300 to-gray-400',        text: 'text-white', label: 'Not In Path', dot: 'bg-gray-400' },
  'varies':      { bg: 'bg-gradient-to-r from-purple-500 to-purple-600',    text: 'text-white', label: 'Varies', dot: 'bg-purple-500' },
  'active-tier': { bg: 'bg-gradient-to-r from-teal-500 to-cyan-600',        text: 'text-white', label: 'Active Tier (MemKV G3.5)', dot: 'bg-cyan-500' },
}

// Storage-agnostic ILM lens (Lens B) — distinct from the NVIDIA memory hierarchy.
const tierColors: Record<number, { bg: string; text: string; label: string }> = {
  0: { bg: 'bg-emerald-500',  text: 'text-emerald-700', label: 'T0 NVMe Local Bus / Direct-Attach (DirectPV/K8s)' },
  1: { bg: 'bg-raspberry',    text: 'text-raspberry',   label: 'T1 RDMA → S3 to 100% NVMe' },
  2: { bg: 'bg-amber-500',    text: 'text-amber-600',   label: 'T2 Standard S3 (100G) to 100% NVMe' },
  3: { bg: 'bg-gray-500',     text: 'text-gray-600',    label: 'T3 Standard S3 (25G/100G) to SSD or hybrid SSD/HDD (cold)' },
}

const workloads = [
  { key: 'training',    label: 'Training',    color: 'text-raspberry',      explorerView: 'training' },
  { key: 'rag',         label: 'RAG',         color: 'text-amber-600',      explorerView: 'rag' },
  { key: 'fineTuning',  label: 'Fine-Tuning', color: 'text-blue-600',       explorerView: 'fine-tuning' },
  { key: 'inference',   label: 'Inference',    color: 'text-cyan-600',      explorerView: 'inference' },
]

// =============================================================================
// VIEW TYPES
// =============================================================================

type ViewMode = 'matrix' | 'tier-heatmap' | 'lifecycle'

// =============================================================================
// COMPONENT
// =============================================================================

export default function Compare() {
  const [selectedCell, setSelectedCell] = useState<{ phase: Phase; workload: string } | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('matrix')

  const getSelectedData = (): PhaseDetail | null => {
    if (!selectedCell) return null
    const wk = selectedCell.workload as keyof typeof matrix[Phase]
    return matrix[selectedCell.phase]?.[wk] || null
  }

  const selectedData = getSelectedData()

  return (
    <div className="page-cosmos text-white">
      <div className="starfield-fixed starfield opacity-50" />
      <PageHeader
        title="Cross-Pipeline Comparison"
        subtitle="The Complete Picture"
        description="Every phase, every tier, every workload — side by side. All performance numbers cross-referenced with the MinIO High-Performance Object Storage for AI Data Infrastructure whitepaper."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* ============================================================= */}
        {/* WHITEPAPER CITATION BANNER                                    */}
        {/* ============================================================= */}
        <section className="mb-10">
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-white/10 p-5 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-raspberry/20 flex items-center justify-center mt-0.5">
                <svg className="w-5 h-5 text-raspberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-bold text-sm mb-1">Source: MinIO High-Performance Object Storage for AI Data Infrastructure</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  All throughput numbers, feature descriptions, and architectural claims on this page are cross-referenced with the MinIO source of truth.
                  Reference benchmark (8-Node AIStor Reference Cluster): <span className="text-emerald-400 font-mono text-xs">~103.5 GB/s aggregate GET</span> (~12.9 GB/s/node) and <span className="text-emerald-400 font-mono text-xs">~34.4 GB/s PUT</span>,{' '}
                  <span className="text-emerald-400 font-mono text-xs">4.4 PB usable</span>, 400G ConnectX-7 per node — scaling linearly as nodes are added. Encryption has negligible performance impact.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* WORKLOAD SCORECARDS                                           */}
        {/* ============================================================= */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold gradient-text mb-6">Workload Scorecards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {workloadSummaries.map((ws) => (
              <div
                key={ws.key}
                className={`outta-card border-2 ${ws.borderColor}/30 p-5`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-lg font-bold ${ws.color}`}>{ws.label}</h3>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${ws.bgColor} text-white`}>
                    {ws.intensity}
                  </span>
                </div>

                {/* Storage intensity bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Storage Intensity</span>
                    <span className="font-semibold">{ws.intensityPct}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${ws.bgColor}`}
                      style={{ width: `${ws.intensityPct}%` }}
                    />
                  </div>
                </div>

                <p className="text-sm text-gray-300 mb-3">{ws.description}</p>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pipeline Nodes</span>
                    <span className="font-semibold text-white">{ws.nodeCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Hot Path?</span>
                    <span className="font-semibold text-white">{ws.hotPath}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Peak Throughput</span>
                    <span className="font-semibold text-white">{ws.peakThroughput}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Data Scale</span>
                    <span className="font-semibold text-white">{ws.dataScale}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10">
                  <p className="text-xs text-gray-400 italic leading-relaxed">{ws.keyInsight}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================= */}
        {/* VIEW SELECTOR                                                 */}
        {/* ============================================================= */}
        <section className="mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-gray-300">View:</span>
            {[
              { id: 'matrix' as ViewMode,       label: 'Storage Role Matrix',    desc: 'Role per phase per workload' },
              { id: 'tier-heatmap' as ViewMode,  label: 'Tier Heatmap',          desc: 'Which tier each phase hits' },
              { id: 'lifecycle' as ViewMode,      label: 'I/O Profile Summary',   desc: 'Volume, throughput, patterns' },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  viewMode === v.id
                    ? 'bg-raspberry text-white shadow-lg shadow-raspberry/30'
                    : 'outta-inset text-gray-300 hover:border-raspberry/40 hover:text-white'
                }`}
              >
                <span className="block font-semibold">{v.label}</span>
                <span className="block text-[10px] opacity-70 mt-0.5">{v.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ============================================================= */}
        {/* LEGEND                                                        */}
        {/* ============================================================= */}
        <section className="mb-6">
          <div className="outta-card p-4">
            <div className="flex flex-wrap items-center gap-6">
              {viewMode !== 'tier-heatmap' ? (
                <>
                  <span className="text-sm font-bold text-gray-300">Storage Role:</span>
                  {Object.entries(roleConfig).map(([role, config]) => (
                    <div key={role} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${config.dot}`} />
                      <span className="text-sm text-gray-300">{config.label}</span>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <span className="text-sm font-bold text-gray-300">Storage Tier:</span>
                  {Object.entries(tierColors).map(([tier, config]) => (
                    <div key={tier} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${config.bg}`} />
                      <span className="text-sm text-gray-300">{config.label}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* MAIN VIEW: MATRIX                                             */}
        {/* ============================================================= */}
        {viewMode === 'matrix' && (
          <section className="mb-8">
            <div className="outta-card outta-table overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-white/[0.04] border-b border-white/10">
                      <th className="px-5 py-4 text-left text-sm font-bold text-white w-48">Phase</th>
                      {workloads.map((wl) => (
                        <th key={wl.key} className="px-5 py-4 text-center">
                          <Link
                            to={`/explorer?view=${wl.explorerView}`}
                            className={`text-sm font-bold ${wl.color} hover:underline transition-colors flex items-center justify-center gap-1.5`}
                          >
                            {wl.label}
                            <svg className="w-3.5 h-3.5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {phases.map((phase) => (
                      <tr key={phase} className="hover:bg-raspberry/5 transition-colors">
                        <td className="px-5 py-3 text-sm font-semibold text-white">{phase}</td>
                        {workloads.map((wl) => {
                          const cell = matrix[phase][wl.key]
                          const config = roleConfig[cell.role]
                          const isSelected = selectedCell?.phase === phase && selectedCell?.workload === wl.key
                          return (
                            <td key={wl.key} className="px-3 py-2.5">
                              <button
                                onClick={() => setSelectedCell({ phase, workload: wl.key })}
                                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${config.bg} ${config.text} hover:shadow-lg hover:scale-[1.03] ${
                                  isSelected ? 'ring-2 ring-offset-2 ring-offset-[#0a0a0f] ring-white scale-105' : ''
                                }`}
                              >
                                {cell.short}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================= */}
        {/* MAIN VIEW: TIER HEATMAP                                       */}
        {/* ============================================================= */}
        {viewMode === 'tier-heatmap' && (
          <section className="mb-8">
            <div className="outta-card outta-table overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-white/[0.04] border-b border-white/10">
                      <th className="px-5 py-4 text-left text-sm font-bold text-white w-48">Phase</th>
                      {workloads.map((wl) => (
                        <th key={wl.key} className={`px-5 py-4 text-center text-sm font-bold ${wl.color}`}>
                          {wl.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {phases.map((phase) => (
                      <tr key={phase} className="hover:bg-raspberry/5 transition-colors">
                        <td className="px-5 py-3 text-sm font-semibold text-white">{phase}</td>
                        {workloads.map((wl) => {
                          const cell = matrix[phase][wl.key]
                          const tiers = Array.isArray(cell.tier) ? cell.tier : (cell.tier !== undefined && cell.role !== 'not-in-path' ? [cell.tier] : [])
                          return (
                            <td key={wl.key} className="px-3 py-2.5">
                              {tiers.length > 0 ? (
                                <div className="flex justify-center gap-1.5">
                                  {(tiers as Tier[]).map((t) => (
                                    <span
                                      key={t}
                                      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold text-white ${tierColors[t].bg}`}
                                    >
                                      T{t}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center text-xs text-gray-400">—</div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tier Summary Counts */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {workloads.map((wl) => {
                const tierCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }
                phases.forEach((phase) => {
                  const cell = matrix[phase][wl.key]
                  const tiers = Array.isArray(cell.tier) ? cell.tier : (cell.role !== 'not-in-path' && cell.tier !== undefined ? [cell.tier] : [])
                  ;(tiers as number[]).forEach((t) => tierCounts[t]++)
                })
                return (
                  <div key={wl.key} className="outta-card p-4">
                    <h4 className={`text-sm font-bold ${wl.color} mb-3`}>{wl.label}</h4>
                    <div className="space-y-1.5">
                      {[0, 1, 2, 3].map((t) => (
                        <div key={t} className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded text-[10px] font-bold text-white flex items-center justify-center ${tierColors[t].bg}`}>
                            T{t}
                          </span>
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${tierColors[t].bg}`}
                              style={{ width: `${(tierCounts[t] / phases.length) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-6 text-right">{tierCounts[t]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ============================================================= */}
        {/* MAIN VIEW: I/O PROFILE LIFECYCLE                              */}
        {/* ============================================================= */}
        {viewMode === 'lifecycle' && (
          <section className="mb-8 space-y-6">
            {workloads.map((wl) => (
              <div key={wl.key} className="outta-card outta-table overflow-hidden">
                <div className={`px-5 py-3 border-b border-white/10 bg-white/[0.04]`}>
                  <h3 className={`text-base font-bold ${wl.color}`}>{wl.label} — I/O Profile by Phase</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-white/10">
                        <th className="px-5 py-2.5">Phase</th>
                        <th className="px-5 py-2.5">I/O Pattern</th>
                        <th className="px-5 py-2.5">Volume</th>
                        <th className="px-5 py-2.5">S3 Path</th>
                        <th className="px-5 py-2.5">Tier</th>
                        <th className="px-5 py-2.5">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {phases.map((phase) => {
                        const cell = matrix[phase][wl.key]
                        const tiers = Array.isArray(cell.tier) ? cell.tier : (cell.role !== 'not-in-path' && cell.tier !== undefined ? [cell.tier] : [])
                        return (
                          <tr
                            key={phase}
                            className={`hover:bg-raspberry/5 transition-colors ${cell.role === 'not-in-path' ? 'opacity-50' : ''}`}
                          >
                            <td className="px-5 py-2.5 font-medium text-white whitespace-nowrap">{phase}</td>
                            <td className="px-5 py-2.5 text-gray-300">{cell.ioProfile}</td>
                            <td className="px-5 py-2.5 text-gray-300 whitespace-nowrap">{cell.volume}</td>
                            <td className="px-5 py-2.5">
                              <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-raspberry-light break-all">
                                {cell.s3Path}
                              </code>
                            </td>
                            <td className="px-5 py-2.5">
                              <div className="flex gap-1">
                                {(tiers as number[]).map((t) => (
                                  <span key={t} className={`w-6 h-6 rounded text-[10px] font-bold text-white flex items-center justify-center ${tierColors[t].bg}`}>
                                    T{t}
                                  </span>
                                ))}
                                {tiers.length === 0 && <span className="text-gray-400">—</span>}
                              </div>
                            </td>
                            <td className="px-5 py-2.5">
                              <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${roleConfig[cell.role].bg} ${roleConfig[cell.role].text}`}>
                                {roleConfig[cell.role].label}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ============================================================= */}
        {/* DETAIL PANEL (click any matrix/heatmap cell)                   */}
        {/* ============================================================= */}
        {selectedCell && selectedData ? (
          <section className="mb-8 animate-scale-in">
            <div className="outta-card border-2 border-raspberry/40 p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="font-bold text-white text-lg mb-1">
                    {selectedCell.phase} — {workloads.find(w => w.key === selectedCell.workload)?.label}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${roleConfig[selectedData.role].bg} ${roleConfig[selectedData.role].text}`}>
                      {roleConfig[selectedData.role].label}
                    </span>
                    {(Array.isArray(selectedData.tier) ? selectedData.tier : (selectedData.role !== 'not-in-path' && selectedData.tier !== undefined ? [selectedData.tier] : [])).map((t: number) => (
                      <span key={t} className={`inline-block px-2 py-1 text-xs font-bold rounded-full text-white ${tierColors[t].bg}`}>
                        Tier {t}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="flex-shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Description */}
              <p className="text-gray-300 leading-relaxed mb-5">{selectedData.detail}</p>

              {/* Detail Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                <div className="outta-inset p-4">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">I/O Pattern</div>
                  <div className="text-sm font-medium text-white">{selectedData.ioProfile}</div>
                </div>
                <div className="outta-inset p-4">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Data Volume</div>
                  <div className="text-sm font-medium text-white">{selectedData.volume}</div>
                </div>
                <div className="outta-inset p-4">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Key Apps</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedData.apps.length > 0 ? selectedData.apps.map((app) => (
                      <span key={app} className="px-2 py-0.5 text-xs bg-white/10 rounded-full text-gray-200 font-medium">{app}</span>
                    )) : <span className="text-sm text-gray-400">—</span>}
                  </div>
                </div>
              </div>

              {/* S3 Path */}
              <div className="outta-code rounded-xl p-4 mb-4">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">S3 Path</div>
                <code className="text-sm text-emerald-400 font-mono break-all">{selectedData.s3Path}</code>
              </div>

              {/* MinIO AIStor Feature */}
              {selectedData.minioFeature !== '—' && (
                <div className="bg-raspberry/5 border border-raspberry/20 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-raspberry uppercase tracking-wider">MinIO AIStor Feature</span>
                  </div>
                  <p className="text-sm text-gray-300">{selectedData.minioFeature}</p>
                </div>
              )}

              {/* Whitepaper Citation */}
              {selectedData.paperRef && (
                <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Whitepaper Reference</span>
                  </div>
                  <p className="text-xs text-blue-200 italic leading-relaxed">{selectedData.paperRef}</p>
                </div>
              )}
            </div>
          </section>
        ) : viewMode !== 'lifecycle' && (
          <section className="mb-8">
            <div className="outta-card p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-white/10 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <p className="text-gray-300 font-medium">Click any cell in the table to see full details — S3 paths, I/O profiles, apps, MinIO AIStor features, and whitepaper citations.</p>
            </div>
          </section>
        )}

        {/* ============================================================= */}
        {/* THE LIFECYCLE — How workloads connect                          */}
        {/* ============================================================= */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold gradient-text mb-6">The Model Lifecycle</h2>
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-white/10 p-8 shadow-2xl">
            <div className="max-w-4xl mx-auto">
              {/* Circular flow */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center mb-8">
                {[
                  { label: 'Training', sub: 'Build the base model', color: 'from-raspberry to-raspberry-dark', arrow: true },
                  { label: 'Fine-Tuning', sub: 'Adapt with LoRA', color: 'from-blue-500 to-blue-600', arrow: true },
                  { label: 'Inference', sub: 'Serve + MemKV G3.5 context memory', color: 'from-teal-500 to-cyan-600', arrow: true },
                  { label: 'RAG', sub: 'Augment with external data', color: 'from-amber-500 to-orange-500', arrow: false },
                ].map((step, i) => (
                  <div key={step.label} className="relative">
                    <div className={`bg-gradient-to-br ${step.color} rounded-xl p-4 text-white`}>
                      <div className="text-sm font-bold">{step.label}</div>
                      <div className="text-xs opacity-75 mt-1">{step.sub}</div>
                    </div>
                    {step.arrow && i < 3 && (
                      <div className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 text-gray-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Feedback loop callout */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">The Feedback Loop</h4>
                    <p className="text-sm text-gray-400">
                      Inference feedback (RLHF preference pairs at{' '}
                      <code className="text-emerald-400 text-xs">s3://feedback-data/rlhf/</code>) flows back to Fine-Tuning as training data.
                      New LoRA adapters are exported to{' '}
                      <code className="text-emerald-400 text-xs">s3://model-registry/.../adapters/</code> and hot-swapped into Inference.
                      <strong className="text-white"> MinIO AIStor is the bus connecting every stage — with active-active replication ensuring multi-site consistency.</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* KEY NUMBERS — The data that matters                           */}
        {/* ============================================================= */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold gradient-text mb-2">Key Numbers at a Glance</h2>
          <p className="text-sm text-gray-400 mb-6">Reference numbers from the 8-Node AIStor Reference Cluster (minio-core-v2 source of truth) — scaling linearly with node count</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { number: '~103.5 GB/s', label: 'Aggregate GET', sub: '8-node reference', color: 'text-raspberry' },
              { number: '~12.9 GB/s', label: 'Per-node GET', sub: '8-node reference', color: 'text-raspberry' },
              { number: '~34.4 GB/s', label: 'PUT throughput', sub: '8-node reference', color: 'text-raspberry' },
              { number: '4.4 PB', label: 'Usable capacity', sub: '8-node reference', color: 'text-amber-500' },
              { number: '400G', label: 'NIC per node', sub: 'ConnectX-7', color: 'text-amber-500' },
              { number: '500GB-1TB', label: 'Per checkpoint', sub: '70B model + optimizer', color: 'text-blue-500' },
              { number: '~100MB', label: 'LoRA adapter', sub: '5,000x smaller', color: 'text-blue-500' },
              { number: 'Single binary', label: 'MinIO MemKV', sub: 'ARM64-native in STX', color: 'text-emerald-500' },
            ].map((stat, i) => (
              <div key={i} className="outta-card p-3 text-center">
                <div className={`text-lg font-bold ${stat.color} mb-0.5`}>{stat.number}</div>
                <div className="text-[11px] font-semibold text-white mb-0.5">{stat.label}</div>
                <div className="text-[10px] text-gray-400">{stat.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================= */}
        {/* MinIO AIStor ENTERPRISE FEATURES                              */}
        {/* ============================================================= */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold gradient-text mb-2">MinIO AIStor Enterprise Features</h2>
          <p className="text-sm text-gray-400 mb-6">Features mapped to AI pipeline phases — from the whitepaper</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { feature: 'MinIO Cache', desc: 'Distributed shared DRAM cache for ultra-high-performance reads. Prevents GPU starvation during DataLoader streaming.', phases: ['Active Compute Loop', 'Model Registry'], icon: '⚡' },
              { feature: 'MinIO MemKV — G3.5 Context Memory', desc: 'A single ARM64-native binary that runs inside the NVIDIA STX rack. Moves KV cache GPU→NVMe over RDMA with no file system, no object protocol, and no CPU in the data path. 2–16 MB blocks; sustains 95%+ GPU utilization cluster-wide; ~100× scale for agentic/long-context.', phases: ['Inference (G3.5 layer)', 'Agentic AI'], icon: '🧠' },
              { feature: 'GPUDirect RDMA for S3', desc: 'Sub-millisecond S3 object access via GPUDirect RDMA. Zero-copy NVMe-to-GPU memory transfers over Spectrum-X 800 GbE and PCIe Gen6.', phases: ['G3.5 layer', 'Model Loading'], icon: '🔗' },
              { feature: 'MinIO Catalog', desc: 'GraphQL-based namespace and metadata search across billions of objects. Find any adapter, checkpoint, or dataset instantly.', phases: ['Model Registry', 'Experiment Tracking'], icon: '🔍' },
              { feature: 'MinIO Firewall', desc: 'S3-aware data-centric firewall handling TLS, load balancing, QoS. Secures the data path without sacrificing throughput.', phases: ['All network paths'], icon: '🛡' },
              { feature: 'Erasure Coding', desc: 'Per-object inline Reed-Solomon in assembly. 12-drive, 6-parity config tolerates up to 5 drive failures (~50% loss).', phases: ['Checkpointing', 'Data Ingestion'], icon: '🔒' },
              { feature: 'S3 Select', desc: 'SIMD-accelerated server-side filtering on CSV/JSON/Parquet. Reduces bandwidth 80%+ for ELT and analytics queries.', phases: ['Data Processing', 'Observability'], icon: '📊' },
              { feature: 'Object Lock / WORM', desc: 'SEC 17a-4(f), FINRA 4511(c) compliant. Immutable retention for model artifacts, audit logs, and feedback data.', phases: ['Model Registry', 'Logging', 'Feedback'], icon: '📋' },
              { feature: 'Bucket Notifications', desc: 'Event-driven triggers via Kafka, NATS, AMQP, MQTT, Webhooks, Elasticsearch, Redis, Postgres, MySQL.', phases: ['Data Ingestion', 'RAG Pipeline'], icon: '📡' },
              { feature: 'Active-Active Replication', desc: 'Near-synchronous multi-site replication. DR, geographic distribution, and multi-cluster model registry sync.', phases: ['Model Registry', 'Feedback Loop'], icon: '🔄' },
              { feature: 'BitRot Protection', desc: 'HighwayHash at >10 GB/s per core with SIMD. Verifies integrity on every read and write. Silent corruption impossible.', phases: ['Checkpointing', 'Model Registry'], icon: '✅' },
            ].map((item, i) => (
              <div key={i} className="outta-card p-5">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-xl">{item.icon}</span>
                  <h4 className="font-bold text-white text-sm">{item.feature}</h4>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed mb-3">{item.desc}</p>
                <div className="flex flex-wrap gap-1">
                  {item.phases.map((ph) => (
                    <span key={ph} className="px-2 py-0.5 text-[10px] bg-raspberry/15 text-raspberry-light rounded-full font-medium">{ph}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================= */}
        {/* STORAGE TIER USAGE ACROSS WORKLOADS                           */}
        {/* ============================================================= */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold gradient-text mb-6">Storage Tier Usage by Workload</h2>
          <div className="outta-card outta-table overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-white/[0.04] border-b border-white/10 text-left text-xs text-gray-400 uppercase tracking-wider">
                    <th className="px-5 py-3">Tier</th>
                    <th className="px-5 py-3">Spec</th>
                    <th className="px-5 py-3">MinIO AIStor?</th>
                    <th className="px-5 py-3 text-raspberry">Training</th>
                    <th className="px-5 py-3 text-amber-600">RAG</th>
                    <th className="px-5 py-3 text-blue-600">Fine-Tuning</th>
                    <th className="px-5 py-3 text-emerald-600">Inference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    {
                      tier: 0, label: 'NVMe Local Bus / Direct-Attach (DirectPV/K8s)', spec: '<100 us, Node-Local',
                      minio: 'MinIO DirectPV',
                      training: 'Spark shuffle, GPU HBM',
                      rag: 'Weaviate HNSW index',
                      fineTuning: 'GPU HBM (LoRA)',
                      inference: 'vLLM KV cache, GPU HBM',
                    },
                    {
                      tier: 1, label: 'RDMA → S3 to 100% NVMe', spec: '1-5ms, In-Cluster',
                      minio: 'MinIO AIStor',
                      training: 'DataLoader streaming, MLflow',
                      rag: 'Embeddings cache',
                      fineTuning: 'Base model load, adapters',
                      inference: 'Model load, adapter swaps',
                    },
                    {
                      tier: 'G3.5' as unknown as number, label: 'MinIO MemKV — G3.5 Context Memory (NVIDIA lens)', spec: 'microsecond RDMA, Spectrum-X 800 GbE',
                      minio: 'MinIO MemKV',
                      training: '—',
                      rag: '—',
                      fineTuning: '—',
                      inference: 'KV cache resident (agentic/long-context)',
                    },
                    {
                      tier: 2, label: 'Standard S3 (100G) to 100% NVMe', spec: '5-15ms, 100 GbE',
                      minio: 'MinIO AIStor',
                      training: 'Lakehouse, checkpoints, registry',
                      rag: 'Document store, corpus',
                      fineTuning: 'Datasets, checkpoints, registry',
                      inference: 'Model registry, logs, feedback',
                    },
                    {
                      tier: 3, label: 'Standard S3 (25G/100G) to SSD or hybrid SSD/HDD (cold)', spec: '15-50ms, SSD/HDD cold',
                      minio: 'MinIO AIStor',
                      training: 'Compliance archive',
                      rag: '—',
                      fineTuning: '—',
                      inference: 'Audit logs, TrustyAI',
                    },
                  ].map((row) => {
                    const tierColor = typeof row.tier === 'number' ? tierColors[row.tier]?.bg : 'bg-cyan-600'
                    const tierLabel = typeof row.tier === 'number' ? `T${row.tier}` : 'G3.5'
                    const isMinIO = row.minio !== 'NOT MinIO AIStor'
                    return (
                    <tr key={String(row.tier)} className="hover:bg-raspberry/5">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`w-7 h-7 rounded-lg text-xs font-bold text-white flex items-center justify-center ${tierColor}`}>
                            {tierLabel}
                          </span>
                          <span className="font-semibold text-white">{row.label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{row.spec}</td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${!isMinIO ? 'bg-white/10 text-gray-300' : 'bg-raspberry/15 text-raspberry-light'}`}>
                          {row.minio}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-300">{row.training}</td>
                      <td className="px-5 py-3 text-gray-300">{row.rag}</td>
                      <td className="px-5 py-3 text-gray-300">{row.fineTuning}</td>
                      <td className="px-5 py-3 text-gray-300">{row.inference}</td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* BENCHMARK COMPARISON                                          */}
        {/* ============================================================= */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold gradient-text mb-2">Benchmark Comparison</h2>
          <p className="text-sm text-gray-400 mb-6">Performance data from the MinIO whitepaper</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cluster benchmarks */}
            <div className="outta-card p-6">
              <h3 className="font-bold text-white mb-4">MinIO AIStor Reference Cluster</h3>
              <div className="space-y-4">
                {[
                  { cluster: '8-Node Reference (per node)', get: '~12.9 GB/s', put: '—', note: '400G ConnectX-7 per node' },
                  { cluster: '8-Node Reference (aggregate)', get: '~103.5 GB/s', put: '~34.4 GB/s', note: '4.4 PB usable; encryption negligible overhead' },
                  { cluster: 'Scale-out', get: 'Linear with nodes', put: 'Linear with nodes', note: 'Switch fabric supports growth (up to 32 nodes)' },
                ].map((row) => (
                  <div key={row.cluster} className="outta-inset p-4">
                    <div className="font-semibold text-white text-sm mb-2">{row.cluster}</div>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div>
                        <span className="text-xs text-gray-400">GET</span>
                        <div className="text-lg font-bold text-raspberry">{row.get}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">PUT</span>
                        <div className="text-lg font-bold text-amber-500">{row.put}</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 italic">{row.note}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* HDFS comparison */}
            <div className="outta-card p-6">
              <h3 className="font-bold text-white mb-4">MinIO vs HDFS (from whitepaper)</h3>
              <div className="space-y-4">
                {[
                  { test: 'Terasort', minio: '820s', hdfs: '1,005s', faster: '22.5%' },
                  { test: 'Sort', minio: '793s', hdfs: '1,573s', faster: '98.3%' },
                  { test: 'WordCount', minio: '787s', hdfs: '1,100s', faster: '39.7%' },
                ].map((row) => (
                  <div key={row.test} className="outta-inset p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white text-sm">{row.test}</span>
                      <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/15 text-emerald-300 rounded-full">
                        {row.faster} faster
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-gray-400">MinIO</span>
                        <div className="text-base font-bold text-raspberry">{row.minio}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">HDFS</span>
                        <div className="text-base font-bold text-gray-300">{row.hdfs}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 italic mt-4">Whitepaper: "MinIO offers HDFS compatibility... customers can simply redirect their applications"</p>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* KEY TAKEAWAYS                                                 */}
        {/* ============================================================= */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold gradient-text mb-6">Key Takeaways</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'Training: Storage Is the Critical Path',
                description: 'From PB-scale ingestion through Medallion ELT, high-throughput DataLoader streaming (~103.5 GB/s aggregate GET on an 8-node reference, scaling with nodes), TB-scale checkpoints with erasure coding, to model export with Object Lock — storage throughput directly impacts GPU utilization. Idle GPU time is expensive, so keeping the cluster fed is the whole game.',
                gradient: 'from-raspberry to-raspberry-dark',
                shadow: 'shadow-raspberry/20',
              },
              {
                title: 'RAG: Architecture Determines Storage\'s Role',
                description: 'Storage always owns the ingestion pipeline (chunking, embedding, corpus management). Whether it\'s in the query hot path depends on architecture: Weaviate on local NVMe (Tier 0) vs. inline S3 retrieval. Bucket notifications auto-trigger re-ingestion. MinIO Cache accelerates hot chunks.',
                gradient: 'from-amber-500 to-orange-500',
                shadow: 'shadow-amber-500/20',
              },
              {
                title: 'Fine-Tuning: Same Patterns, 5,000x Smaller',
                description: 'LoRA adapters are ~100MB vs 500GB full checkpoints. Same S3 patterns — datasets, registry, checkpoints — at dramatically smaller scale. An 8-node reference cluster (~103.5 GB/s aggregate GET) is far more than sufficient. The killer feature is adapter versioning via MinIO Catalog.',
                gradient: 'from-blue-500 to-blue-600',
                shadow: 'shadow-blue-500/20',
              },
              {
                title: 'Inference: Active Tier for Agentic AI',
                description: 'Short requests stay in GPU HBM. But for agentic and long-context workloads, the KV cache lives in the G3.5 context-memory layer — MinIO MemKV moves it GPU→NVMe over RDMA via Spectrum-X 800 GbE, with no file system, no object protocol, and no CPU in the data path, instead of evicting and recomputing. Plus model loading (high-throughput burst), adapter swaps (MinIO Cache), logging (ILM), and RLHF feedback (Object Lock). Storage spans the full inference lifecycle.',
                gradient: 'from-teal-500 to-cyan-600',
                shadow: 'shadow-cyan-500/20',
              },
            ].map((card, index) => (
              <div key={index} className="outta-card p-6">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center shadow-lg ${card.shadow}`}>
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-2">{card.title}</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">{card.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <BottomLine>
          Object storage is in every pipeline, at every phase, for every workload. With the G3.5 context-memory
          layer, MinIO MemKV is now inside the inference loop itself — keeping the KV cache resident for agentic
          and long-context workloads (GPU→NVMe over RDMA via Spectrum-X 800 GbE, no CPU in the data path).
          Reference numbers cross-referenced with the MinIO source of truth: ~103.5 GB/s aggregate GET on an
          8-node reference cluster (~12.9 GB/s/node, 4.4 PB usable), scaling linearly with node count.
          MinIO spans the G3.5 context-memory layer and the storage-agnostic ILM tiers (T0–T3) — the complete
          storage foundation for AI infrastructure.
        </BottomLine>
      </div>
    </div>
  )
}
