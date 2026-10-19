# Veritas Private Semantic Engine

> **A sovereign, local-first semantic search engine and encrypted personal knowledge vault with zero telemetry, client-side vector embeddings, AES-256-GCM encryption, and local machine intelligence.**

---

## Overview

**Veritas Private Semantic Engine** is an offline-capable, privacy-first personal search engine designed to run entirely in your web browser. It indexes confidential documents, notes, code snippets, financial records, and medical files directly on your machine.

Unlike traditional cloud search systems and LLM integrations that transmit sensitive data to external servers, Veritas operates **100% locally**:

- **Zero Telemetry**: No tracking scripts, analytics, or remote API calls. Your queries and documents never leave your device.
- **Client-Side Vector & Lexical Hybrid Search**: Combines high-dimensional subword TF-IDF embeddings with Okapi BM25 ranking via Reciprocal Rank Fusion (RRF) for sub-10ms query execution.
- **End-to-End Cryptography**: All stored documents, metadata, and vector representations are encrypted client-side using **AES-256-GCM** derived via **PBKDF2** (100,000 iterations of SHA-256).
- **Direct Machine & System Telemetry**: Query your computer's local date, time, storage capacity, system hardware specs, and user activity logs using natural language.
- **Browser Address Bar Search**: Standard OpenSearch 1.1 compliant integration allows you to set Veritas as your primary browser search engine.

---

## Key Features

### 1. Hybrid Semantic & Lexical Search

- **High-Dimensional Vector Engine**: Generates subword and conceptual semantic vectors directly on `Float32Array` buffers using cosine similarity.
- **Okapi BM25 Keyword Matching**: Fast lexical scoring ($k_1=1.5, b=0.75$) captures exact terminology, IDs, error codes, and verbatim phrases.
- **Reciprocal Rank Fusion (RRF)**: Merges vector similarity with keyword frequency scores to deliver precise, context-aware results.
- **Conversational Synthesis & Snippets**: Automatically extracts the most relevant passages across matching documents with highlighted evidence spans.

### 2. Real-Time Instant Answers & Local Machine Intelligence

Ask everyday questions in natural language and receive rich, interactive utility cards instantly:

- **Precision Time & Clock**: Current local time, UTC, epoch timestamp, timezone, and international world clocks (New York, London, Tokyo, Sydney).
- **Date & Calendar**: Full calendar date, ISO week number, day of the year with visual progress bar, days remaining in the year, and leap year calculation.
- **Storage Capacity**: Real-time browser storage metrics via `navigator.storage.estimate()` (used bytes, total quota, free space, percentage used, persistent storage status, and vault document/vector counts).
- **Machine & System Specs**: Host OS detection (macOS, Windows, Linux), logical CPU core count (`navigator.hardwareConcurrency`), RAM estimate, screen resolution, device pixel ratio, browser engine, and network status.
- **What I Have Done / Changed**: Live audit summary showing actions recorded on your machine (files ingested, queries run, purges, syncs), last modified timestamp, and SHA-256 tamper-evident integrity status.
- **Calculator & Conversions**: Instant arithmetic evaluation (e.g. `25 * 4`, `sqrt(144)`, `15% of 850`).
- **Privacy-Preserving Web Fallback**: When local confidence is insufficient or when explicitly requested, queries external web sources with zero user tracking tokens or headers.

### 3. Encrypted Document Vault

- **AES-256-GCM Encryption**: Document text, vectors, and metadata are encrypted before writing to browser `IndexedDB`.
- **Zero-Knowledge Key Storage**: The master passphrase is never written to disk or sent across the network. Derived keys live only in ephemeral session memory.
- **Multi-Format Ingestion**: Drag-and-drop or upload Markdown (`.md`), plain text (`.txt`), JSON (`.json`), CSV (`.csv`), HTML, logs, and code files.
- **Intelligent Chunking**: Automatic document chunking with overlap preserves context for long articles and technical documentation.
- **Sample Vault Records**: Preloaded with realistic confidential enterprise scenarios (financial audits, medical histories, cloud infrastructure runbooks).

### 4. Cryptographic Audit Trail & RBAC

- **Tamper-Evident Hash Chain**: Every user action (document ingestion, decryption, query, purge, sync) is recorded with a cryptographic SHA-256 hash linked to the previous block.
- **Chain Verification**: One-click verification scans the entire audit history to prove no logs were altered, truncated, or injected.
- **Role-Based Access Control (RBAC)**:
  - **Owner**: Full access to ingest, search, decrypt, rekey, and purge.
  - **Auditor**: Read-only access to tamper-evident logs and verification status.
  - **Guest**: Restricted query mode without access to master keys or administrative settings.

### 5. Browser Integration & Cross-Device Sync

- **OpenSearch 1.1 Support**: Direct integration with Chrome, Brave, Firefox, Safari, and Edge. Add `/?q=%s` as a custom search engine to search your personal vault straight from the browser URL bar.
- **Encrypted Sync Packages**: Export complete encrypted bundles containing documents, vectors, and audit logs.
- **Vector Clock Conflict Resolution**: Import bundles with revision tracking to reconcile changes across offline machines without a centralized server.

---

## Technology Stack

| Layer | Technology |
| --- | --- |
| **Frontend Framework** | React 19, TypeScript (ES2022, bundler module resolution) |
| **Styling & UI** | Tailwind CSS v4, Lucide React icons, Motion animations |
| **Local Database** | Native browser `IndexedDB` with atomic transactional wrappers |
| **Cryptographic Primitives** | Web Crypto API (`window.crypto.subtle`): PBKDF2 (100k iterations) & AES-256-GCM |
| **Vector Engine** | Subword n-gram TF-IDF vectorizer on `Float32Array` SIMD buffers |
| **Lexical Engine** | Okapi BM25 scoring with Reciprocal Rank Fusion (RRF) |
| **Browser Protocols** | OpenSearch 1.1 specification, W3C Storage API, Navigator Hardware API |

---

## Project Structure

```table
├── docs/                       # Architecture specifications & design blueprints
│   ├── APP_FLOW.md             # Key lifecycle & execution paths
│   ├── BACKGROUND_SCHEMA.md    # IndexedDB database structure
│   ├── DESIGN_BRIEF.md         # UI/UX design specifications
│   ├── IMPLEMENTATION_PLAN.md  # Engineering execution steps
│   ├── PRODUCT_REQUIREMENTS.md # Functional requirements & user stories
│   ├── SPECIFICATIONS.md       # Comprehensive system architecture
│   └── TECHNICAL_REQUIREMENTS.md
├── public/                     # Static assets and OpenSearch descriptors
│   └── opensearch.xml          # OpenSearch 1.1 browser autodiscovery definition
├── src/
│   ├── components/             # React interface components
│   │   ├── AuditView.tsx       # Cryptographic audit logs & RBAC switcher
│   │   ├── BrowserSyncView.tsx # OpenSearch setup, portable export/import
│   │   ├── DocsView.tsx        # In-app architecture & technical documentation
│   │   ├── Header.tsx          # Navigation header, lock/unlock & role indicator
│   │   ├── PassphraseModal.tsx # PBKDF2 passphrase entry & key derivation
│   │   ├── SearchView.tsx      # Omnisearch bar, widgets, citations & results
│   │   └── VaultView.tsx       # Document management, file dropzone & tags
│   ├── lib/                    # Core business logic & algorithms
│   │   ├── crypto.ts           # Web Crypto PBKDF2 & AES-256-GCM engine
│   │   ├── fileSystem.ts       # Text file reading & chunking pipeline
│   │   ├── instantAnswers.ts   # Natural language instant answer resolver
│   │   ├── machineTelemetry.ts # Local machine date, storage, system, & activity info
│   │   ├── searchRouter.ts     # Query classification & hybrid search execution
│   │   ├── semanticEngine.ts   # Vector embeddings, BM25 & RRF fusion
│   │   ├── storage.ts          # IndexedDB wrapper & cryptographic audit log
│   │   ├── syncAndBrowser.ts   # Export/import bundles & vector clocks
│   │   └── tests.ts            # Built-in end-to-end self-test verification suite
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces & domain models
│   ├── App.tsx                 # Root application state & navigation router
│   ├── index.css               # Global styles & Tailwind CSS v4 imports
│   └── main.tsx                # Application entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ or **Bun** installed on your system.

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd react-example

# Install dependencies
npm install
```

### Running the Development Server

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

### Building for Production

```bash
# Check TypeScript types
npm run lint

# Compile optimized bundle
npm run build

# Preview production build locally
npm run preview
```

---

## Example Queries to Try

Once the app is running, try typing any of the following queries into the search bar:

### 1. Local Machine & System Information

- `date` or `today` or `calendar` - View full calendar date, ISO week, and year progress percentage.
- `storage capacity` or `storage` - View browser disk space used, total quota, and vault count.
- `what i have done` or `activity` - View recent file additions, searches, and cryptographic hash verification.
- `specs` or `machine info` - View detected OS, CPU cores, screen dimensions, and network status.
- `time` or `world clock` - Real-time ticking clock with UTC and global timezones.

### 2. Semantic Document Queries

- `"Q3 budget cloud migration"` - Finds documents referencing infrastructure costs even without exact keyword matches.
- `"patient cardiac history"` - Locates medical case studies and clinical records.
- `"API auth keys rotation policy"` - Retrieves security policies and runbooks.

### 3. Math & Quick Utilities

- `42 * 18` or `sqrt(256)` - Built-in local math parser.
- `define cryptography` - Quick knowledge lookup.

---

## Security & Privacy Architecture

1. **Zero Cloud Leaks**: Documents, vectors, search queries, and telemetry are strictly retained on the user's local device.
2. **Key Derivation (PBKDF2)**: 100,000 rounds of HMAC-SHA-256 with cryptographically random salts prevent brute-force dictionary attacks.
3. **Authenticated Encryption (AES-GCM)**: 256-bit AES encryption with 96-bit initialization vectors ensures both confidentiality and tamper protection.
4. **Append-Only Audit Chain**: Action records form a cryptographic Merkle-like chain using SHA-256 hashes ($Hash_n = \text{SHA256}(Hash_{n-1} + Data_n)$).

---

## License

This project is licensed under the Apache 2.0 License. See the LICENSE file for details.
