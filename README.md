# The AI Storage Map

**Where object storage actually lives in AI/ML pipelines.**

An interactive technical reference that maps storage across four AI workloads — training, RAG, fine-tuning, and inference — phase by phase, tier by tier, S3 path by S3 path.

All performance data is cross-referenced with the [MinIO High-Performance Object Storage for AI Data Infrastructure](https://resources.min.io/) whitepaper.

## Live Site

**https://d3nny-sf.github.io/storage-map-ai/**

## What's Inside

### Interactive Explorer

The core of the app. Six views, one unified interface:

| View | What It Shows |
|------|---------------|
| **Reference Architecture** | Prescriptive 10-phase pipeline — one stack, clear tiers, step-by-step |
| **Storage Tiers** | The 4-tier layout (T0 NVMe Block, T1 Hot S3, T2 S3 over RDMA, T3 Cold Archive) |
| **Training Pipeline** | Pre-training data flow with animated nodes and clickable phases |
| **RAG Pipeline** | Ingestion, chunking, embedding, vector search, generation |
| **Fine-Tuning** | LoRA/QLoRA adapter training — same patterns, dramatically smaller scale |
| **Inference** | Model serving — storage at the bookends, not in the forward pass |

Every node is clickable. Every node shows its S3 paths, I/O profile, tier placement, and MinIO AIStor feature.

### Cross-Pipeline Comparison

Side-by-side matrix of all four workloads across seven lifecycle phases. Each cell maps to a storage role, tier, apps in play, I/O pattern, data volume, and whitepaper-cited MinIO feature.

### S3 Path Reference

Complete namespace design for organizing AI/ML storage — 10 path groups with tier badges, I/O profiles, volume scales, and SDK examples.

### Glossary

43 terms across three categories (AI/ML, Storage Infrastructure, MinIO AIStor) — all sourced from the whitepaper and real-world usage.

## The 4-Tier Storage Model

| Tier | Name | Access Method | Latency | MinIO? |
|------|------|---------------|---------|--------|
| **T0** | NVMe Local (Block) | PCIe / NVMe-oF / cuFile (GDS) | < 100 us | No |
| **T1** | NVMe Local (PVC / S3) | S3 API via localhost / service mesh | 1-5 ms | Yes |
| **T2** | S3 over RDMA to NVMe | S3 over RDMA / RoCE v2 (400 GbE) | 5-15 ms | Yes |
| **T3** | S3 to NVMe/SSD (100 GbE) | S3 with Object Lock + ILM | 15-50 ms | Yes |

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
    ReferenceArchitecture.tsx          # 10-phase prescriptive guide
    StorageLayoutExplorer.tsx          # 4-tier storage visualization
    DataGravityChart.tsx               # Logarithmic data scale comparison
    PipelineDiagram.tsx                # Shared layout primitives
    Layout.tsx                         # App shell, nav, footer
  pages/
    Home.tsx                           # Landing page + pipeline cards
    Explorer.tsx                       # Unified explorer (6 views)
    Compare.tsx                        # Cross-pipeline comparison matrix
    Paths.tsx                          # S3 namespace reference
    Glossary.tsx                       # 43-term glossary
```

## Storage Examples

All examples reference [MinIO AIStor](https://min.io/product/aistor) as the S3-compatible object store. The patterns apply to any enterprise object storage deployment built on the S3 API.

## License

MIT
