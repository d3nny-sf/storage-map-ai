# The AI Storage Map

**Where object storage actually lives in AI/ML pipelines.**

An interactive technical reference that maps storage across four AI workloads — training, RAG, fine-tuning, and inference — phase by phase, tier by tier, S3 path by S3 path. Updated for **GTC 2026** with the NVIDIA CMX context-memory extension, the 5-tier storage model, STX rack integration, and BlueField-4 / Spectrum-X 800 GbE.

All performance data is cross-referenced with the [MinIO High-Performance Object Storage for AI Data Infrastructure](https://resources.min.io/) whitepaper.

## Live Site

**https://d3nny-sf.github.io/storage-map-ai/**

## What's Inside

### Overview

Four pipeline cards (Training, RAG, Fine-Tuning, Inference) with storage-intensity badges — inference now rated **active** (~55 %) since MinIO AIStor is in the inference hot path via CMX. Each card deep-links to its Explorer view. Bottom Line CTA links to the Comparison Matrix.

### Interactive Explorer

The core of the app. Six views, one unified interface, with a color-coded guided path (green "START HERE" on Reference Architecture, green "FOLLOW" badges on subsequent views):

| View | What It Shows |
|------|---------------|
| **Reference Architecture** | Prescriptive 11-phase pipeline (incl. KV-cache overflow) — one stack, five tiers, CMX-aware |
| **Storage Tiers** | The 5-tier layout (T0 NVMe Block, **Tier G3.5 CMX KV Overflow**, T1 Hot S3, T2 S3 over RDMA, T3 Cold Archive) with Data Lake vs Lakehouse modal |
| **Training Pipeline** | Pre-training data flow with animated nodes and clickable phases |
| **RAG Pipeline** | Ingestion, chunking, embedding, vector search, generation |
| **Fine-Tuning** | LoRA/QLoRA adapter training — same patterns, dramatically smaller scale |
| **Inference** | Model serving — CMX G3.5 KV-cache overflow, continuous sub-ms RDMA I/O during generation |

Every node is clickable. Every node shows its S3 paths, I/O profile, tier placement, and MinIO AIStor feature.

### Cross-Pipeline Comparison

Side-by-side matrix of all four workloads across seven lifecycle phases. Each cell maps to a storage role, tier, apps in play, I/O pattern, data volume, and whitepaper-cited MinIO feature.

### S3 Path Reference

Complete namespace design for organizing AI/ML storage — 10 path groups with tier badges, I/O profiles, volume scales, and SDK examples.

### Glossary & Reference

Consolidated reference page with three sections:

- **Data Gravity** — logarithmic scale visualization comparing data volumes across AI workloads
- **Common Misconceptions** — five myths about AI storage, busted with technical reality (Myth #1 now qualified for CMX)
- **Glossary Terms** — 55+ terms across three categories (AI/ML, Storage Infrastructure, MinIO AIStor), searchable, filterable by category, with related-term navigation. Includes GTC 2026 terms: CMX, Tier G3.5, STX, BlueField-4, Spectrum-X 800 GbE, ConnectX-9, NIXL, Grove, Dynamo, Vera Rubin, GPUDirect RDMA for S3.

## The 5-Tier Storage Model (GTC 2026)

| Tier | Name | Access Method | Latency | MinIO? |
|------|------|---------------|---------|--------|
| **T0** | NVMe Local (Block) | PCIe / NVMe-oF / cuFile (GDS) | < 100 us | No |
| **G3.5** | **CMX KV-Cache Overflow** | GPUDirect RDMA for S3 (800 GbE Spectrum-X) | < 1 ms | **Yes** |
| **T1** | NVMe Local (PVC / S3) | S3 API via localhost / service mesh | 1-5 ms | Yes |
| **T2** | S3 over RDMA to NVMe | S3 over RDMA / RoCE v2 (800 GbE) | 5-15 ms | Yes |
| **T3** | S3 to NVMe/SSD (100 GbE) | S3 with Object Lock + ILM | 15-50 ms | Yes |

**Tier G3.5 is NEW (GTC 2026):** MinIO AIStor on BlueField-4 NVMe inside the NVIDIA STX rack. KV-cache overflows from GPU VRAM to this tier via NVIDIA CMX. 5× tokens/sec, 5× power efficiency vs KV eviction.

## Key Numbers (Whitepaper-Cited)

| Metric | Value | Context |
|--------|-------|---------|
| GET throughput | **325 GiB/s** | 32-node cluster |
| PUT throughput | **165 GiB/s** | 32-node cluster |
| Aggregate throughput | **2.5 TiB/s** | 300-server deployment |
| GET throughput (8-node) | **46.5 GB/s** | 8-node benchmark |
| PUT throughput (8-node) | **34.4 GB/s** | 8-node benchmark |
| Checkpoint size | **500 GB - 1 TB** | 70B model, full state |
| Cold start (140 GB model) | **~14 s** | At 10 GB/s transfer |
| HNSW vector lookup | **< 500 us** | Local NVMe, Tier 0 |
| BitRot verification | **> 10 GB/s per core** | HighwayHash |
| CMX inference boost | **5× tokens/sec** | vs KV eviction/recompute |
| CMX power efficiency | **5× power efficiency** | vs KV eviction/recompute |
| CMX KV overflow latency | **< 1 ms** | RDMA over 800 GbE |

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
    ReferenceArchitecture.tsx          # 11-phase prescriptive guide (5-tier, CMX-aware)
    StorageLayoutExplorer.tsx          # 5-tier storage visualization (incl. CMX G3.5)
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
