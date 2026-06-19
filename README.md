# The AI Storage Map

**Where object storage actually lives in AI/ML pipelines.**

An interactive technical reference that maps storage across four AI workloads — training, RAG, fine-tuning, and inference — phase by phase, tier by tier, S3 path by S3 path. Updated for **GTC 2026** with [MinIO MemKV](https://www.min.io/product/memkv) — the G3.5 context-memory layer — plus STX rack integration and Spectrum-X 800 GbE.

It presents **two distinct tiering lenses** and is careful not to conflate them:

- **NVIDIA memory-hierarchy lens** — *G3 = GPU HBM · G3.5 = MinIO MemKV (context memory) · G4 = networked object storage (S3/RDMA).* Used for MemKV, DPU/BlueField, RDMA-over-S3, and context-memory discussions.
- **Storage-agnostic ILM lens** — *T0 NVMe local bus / Direct-Attach (MinIO DirectPV/K8s) · T1 RDMA → S3 to 100% NVMe · T2 Standard S3 (100G) to 100% NVMe · T3 Standard S3 (25G/100G) to SSD or hybrid SSD/HDD (cold).* Used for AIStor lifecycle (ILM) discussions.

Performance numbers are anchored to MinIO's verified sources: the [AIStor docs](https://docs.min.io/aistor/), the [AIStor Tables docs](https://docs.min.io/aistor/administration/aistor-tables/), and the public [MemKV product page](https://www.min.io/product/memkv).

## Live Site

**https://d3nny-sf.github.io/storage-map-ai/**

## What's Inside

### Overview

Four pipeline cards (Training, RAG, Fine-Tuning, Inference) with storage-intensity badges — inference now rated **active** (~55 %) since MinIO MemKV is in the inference hot path at the G3.5 context-memory layer. Each card deep-links to its Explorer view. Bottom Line CTA links to the Comparison Matrix.

### Interactive Explorer

The core of the app. Six views, one unified interface, with a color-coded guided path (green "START HERE" on Reference Architecture, green "FOLLOW" badges on subsequent views):

| View | What It Shows |
|------|---------------|
| **Reference Architecture** | Prescriptive pipeline — one stack, two tiering lenses, MemKV-aware (G3.5 context memory) |
| **Storage Tiers** | The storage-agnostic ILM tiers (T0–T3) shown alongside the NVIDIA-lens **G3.5 layer (MinIO MemKV)**, with a Data Lake vs Lakehouse modal |
| **Training Pipeline** | Pre-training data flow with animated nodes and clickable phases |
| **RAG Pipeline** | Ingestion, chunking, embedding, vector search, generation |
| **Fine-Tuning** | LoRA/QLoRA adapter training — same patterns, dramatically smaller scale |
| **Inference** | Model serving — KV cache resident in the G3.5 layer (MinIO MemKV), GPU→NVMe over RDMA during generation |

Every node is clickable. Every node shows its S3 paths, I/O profile, tier placement, and MinIO feature.

### Cross-Pipeline Comparison

Side-by-side matrix of all four workloads across seven lifecycle phases. Each cell maps to a storage role, tier, apps in play, I/O pattern, data volume, and the relevant MinIO feature.

### S3 Path Reference

Complete namespace design for organizing AI/ML storage — 10 path groups with tier badges, I/O profiles, volume scales, and SDK examples.

### Glossary & Reference

Consolidated reference page with three sections:

- **Data Gravity** — logarithmic scale visualization comparing data volumes across AI workloads
- **Common Misconceptions** — five myths about AI storage, busted with technical reality (Myth #1 covers the G3.5 context-memory layer)
- **Glossary Terms** — 55+ terms across three categories (AI/ML, Storage Infrastructure, MinIO AIStor), searchable, filterable by category, with related-term navigation. Includes GTC 2026 terms: MinIO MemKV (Context Memory), the G3.5 layer, STX, BlueField-4, Spectrum-X 800 GbE, ConnectX-9, NIXL, Dynamo, Vera Rubin, GPUDirect RDMA for S3.

## Two Tiering Lenses

### NVIDIA memory-hierarchy lens

| Layer | Name | Access Method | Notes |
|-------|------|---------------|-------|
| **G3** | GPU HBM | On-package | Hottest, smallest |
| **G3.5** | **MinIO MemKV — Context Memory** | GPUDirect RDMA over Spectrum-X 800 GbE + PCIe Gen6 (NIXL plugin) | KV cache GPU→NVMe over RDMA — no file system, no object protocol, no CPU in the data path |
| **G4** | Networked object storage | S3 over RDMA / standard S3 | Petascale, durable |

**The G3.5 layer (MinIO MemKV) is NEW (GTC 2026):** a single ARM64-native binary inside the NVIDIA STX rack. When context length exceeds GPU HBM, the KV cache lives here — resident, not evicted and recomputed — using 2–16 MB blocks and sustaining **95%+ GPU utilization cluster-wide** for agentic and long-context workloads.

### Storage-agnostic ILM lens

| Tier | Name | Access Method | Latency |
|------|------|---------------|---------|
| **T0** | NVMe Local Bus / Direct-Attach | MinIO DirectPV / K8s local NVMe (PCIe / cuFile) | < 100 us |
| **T1** | RDMA → S3 to 100% NVMe | S3 over RDMA / RoCE v2 (in-cluster) | 1-5 ms |
| **T2** | Standard S3 (100G) to 100% NVMe | Standard S3 over 100 GbE | 5-15 ms |
| **T3** | Standard S3 (25G/100G) to SSD or hybrid SSD/HDD (cold) | Standard S3 + Object Lock + ILM | 15-50 ms |

## Key Numbers

Anchored to the **8-Node AIStor Reference Cluster** (minio-core-v2 source of truth). Throughput scales linearly as nodes are added.

| Metric | Value | Context |
|--------|-------|---------|
| Aggregate GET throughput | **~103.5 GB/s** | 8-node reference cluster |
| Per-node GET throughput | **~12.9 GB/s** | 8-node reference cluster |
| PUT throughput | **~34.4 GB/s** | 8-node reference cluster |
| Usable capacity | **4.4 PB** | 8-node reference cluster |
| NIC per node | **400G** | ConnectX-7 |
| Checkpoint size | **500 GB - 1 TB** | 70B model, full state |
| Cold start (140 GB model) | **~14 s** | At 10 GB/s transfer |
| HNSW vector lookup | **< 500 us** | Local NVMe (T0) |
| BitRot verification | **> 10 GB/s per core** | HighwayHash |
| GPU utilization (MemKV) | **95%+** | Cluster-wide, agentic/long-context |

## Tech Stack

- **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Vite 7**
- **React Router 7**
- GitHub Pages deployment via Actions

## Development

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # Production build
npm run preview   # Preview production build
```

## Project Structure

```
src/
  components/
    InteractiveTrainingExplorer.tsx    # Training pipeline animation
    InteractiveRAGExplorer.tsx         # RAG pipeline animation
    InteractiveFineTuningExplorer.tsx  # Fine-tuning pipeline animation
    InteractiveInferenceExplorer.tsx   # Inference pipeline animation
    ReferenceArchitecture.tsx          # prescriptive guide (two tiering lenses, MemKV-aware)
    StorageLayoutExplorer.tsx          # storage visualization (ILM tiers + the G3.5 MemKV layer)
    DataGravityChart.tsx               # Logarithmic data scale comparison
    PipelineDiagram.tsx                # PageHeader + BottomLine shared components
    Layout.tsx                         # App shell, nav, footer
  pages/
    Home.tsx                           # Landing page + pipeline cards
    Explorer.tsx                       # Unified explorer (6 views)
    Compare.tsx                        # Cross-pipeline comparison matrix
    Paths.tsx                          # S3 namespace reference
    Glossary.tsx                       # Data Gravity, Misconceptions, 55+ term glossary
```

## Storage Examples

All examples reference [MinIO AIStor](https://min.io/product/aistor) as the S3-compatible object store. The patterns apply to any enterprise object storage deployment built on the S3 API.

## License

MIT
