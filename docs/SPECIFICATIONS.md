# Aegis Private Semantic Search Engine
## Comprehensive Specification & Architecture Blueprint

---

## 1. Product Requirements Document (PRD)

### 1.1 Executive Summary
Aegis is a sovereign, local-first semantic search engine engineered to replace external search engines for personal information retrieval. It indexes private unstructured files, notes, documents, and records directly on the user's client machine. By marrying high-dimensional vector embeddings with BM25 lexical ranking, Aegis comprehends user intent—finding concepts, conceptual synonyms, and contextual matches even when the query terms never appear verbatim in the source documents. All sensitive data is protected via client-side AES-256-GCM encryption before persistence in IndexedDB. When a query exceeds the scope of local documents, Aegis provides a zero-identifier, privacy-preserving external search fallback, ensuring private user identifiers and search histories never touch any remote server.

### 1.2 Target User Personas
- **The Privacy Sovereign**: Executives, researchers, medical personnel, and legal practitioners holding sensitive private records who cannot risk uploading confidential files to third-party cloud LLMs.
- **The Power Researcher**: Knowledge workers with extensive unstructured markdown notes, PDFs, statements, and code snippets who need instant semantic retrieval ("what did we budget for cloud migrations in Q3?") without relying on exact filename or keyword memory.
- **The Everyday Browser User**: Individuals who want a single search bar in Chrome/Brave/Firefox/Safari that checks local personal archives first in sub-10ms and only queries the public web anonymously when necessary.

### 1.3 Key Functional Requirements
- **Semantic Vector & Lexical Hybrid Search**: Compute client-side embeddings and BM25 index on ingestion; execute cosine similarity ranking paired with keyword frequency boosts.
- **Natural Language Conversational Q&A**: Synthesize context passages across multiple matching documents with highlighted evidence spans.
- **Complete Local Sovereignty**: Zero cloud AI processing. Zero telemetry. Zero analytics hooks. Zero remote indexing.
- **End-to-End Encryption (E2EE)**: User-provided master passphrase derives a 256-bit AES-GCM key via PBKDF2 (100,000 rounds of SHA-256 with cryptographically random salt). Raw document texts and vector caches are stored encrypted in IndexedDB.
- **Browser Default Search Engine Integration**: Compliant OpenSearch 1.1 XML specification (`/opensearch.xml`) and URL parameter search handler (`/?q={searchTerms}`) to enable seamless browser address bar search.
- **Dual-Layer Privacy Search**: Automatic fallback to anonymous external web queries (scrubbed of user headers, cookies, and local identifiers) when local confidence falls below configurable thresholds or when explicit web search is requested.
- **Offline-First Synchronization**: Cryptographically signed, encrypted export/import sync payloads with vector clock revision tracking for cross-device synchronization without centralized servers.
- **Role-Based Access Control (RBAC) & Audit Logging**: Owner, Auditor, and Guest access tiers with tamper-evident cryptographic audit logs for every query, ingestion, decryption, and sync operation.

---

## 2. Technical Requirements

### 2.1 Core Technology Stack
- **Frontend Framework**: React 19 with strict TypeScript (`ES2022`, `moduleResolution: bundler`).
- **Styling Architecture**: Tailwind CSS v4 with bespoke geometric typography (`Plus Jakarta Sans` display & `JetBrains Mono` tabular data).
- **Client Storage Engine**: Native browser `IndexedDB` with custom transactional wrapper supporting atomic multi-store updates.
- **Cryptographic Engine**: Web Crypto API (`window.crypto.subtle`) executing PBKDF2 key derivation and AES-GCM-256 authenticated encryption.
- **Vector & Semantic Pipeline**:
  - High-dimensional term-frequency inverse-document semantic vectors with subword n-gram hashing and stopword normalization.
  - Vector cosine similarity engine with SIMD-style TypedArray (`Float32Array`) dot products.
  - BM25 Okapi lexical scoring ($k_1=1.5, b=0.75$) with reciprocal rank fusion (RRF) combining vector and keyword scores.
- **Browser Protocols**: OpenSearch 1.1 standard, browser Extension Manifest v3 query-interception blueprint.

### 2.2 Performance & Bundle Optimization
- **Index Latency**: Sub-10ms query execution across 1,000+ document chunks using precomputed Float32Array vector buffers.
- **Memory Footprint**: Lazy loading of document content; vector indices kept in compact Float32Array blocks.
- **Bundle Discipline**: Zero bulky cloud SDKs; zero external analytics; zero telemetry trackers.

### 2.3 Security Guarantees
- **Zero Remote Telemetry**: Strict verification that no network requests leak user queries, document metadata, or IP addresses.
- **Zero-Knowledge Key Storage**: Master passphrase is never persisted to disk; derived CryptoKey is kept in ephemeral React memory state.
- **Sanitized Fallbacks**: External web queries pass through query scrubbing (removing localized tokens, dates, and personal identifiers).

---

## 3. Application Flow

### 3.1 Initial Setup & Key Derivation Flow
```
[User Launches Aegis]
       │
       ▼
[IndexedDB Initialization & Schema Migration]
       │
       ▼
[Passphrase Prompt / Unlock State]
       │
       ├─► [User Inputs Passphrase]
       │         │
       │         ▼
       │   [PBKDF2-SHA256 Derivation (100k rounds)]
       │         │
       │         ▼
       │   [AES-GCM-256 Master Key Instantiated in Memory]
       │         │
       │         ▼
       │   [Decrypt Inverted Index & Document Metas]
       │
       └─► [Passphrase Unlocked: Search Ready]
```

### 3.2 Ingestion & Semantic Indexing Flow
```
[File Upload / Paste / Sample Corpus]
       │
       ▼
[Text Extraction & Chunking (Sliding Window 256 tokens)]
       │
       ▼
[Subword Tokenization & Semantic Vector Generation (Float32Array)]
       │
       ▼
[BM25 Term Frequency & Document Frequency Indexing]
       │
       ▼
[WebCrypto AES-GCM Encryption of Document Payload]
       │
       ▼
[Atomic Transaction Commit to IndexedDB: `documents` + `vectors`]
       │
       ▼
[Cryptographic Audit Log Recorded: EVENT_DOC_INDEXED]
```

### 3.3 Query Execution & Dual-Layer Search Flow
```
[User Types Query in UI or Browser Address Bar `/?q=...`]
       │
       ├─► [1. Generate Query Vector Embedding]
       ├─► [2. Compute Vector Cosine Similarity against all Chunks]
       └─► [3. Compute BM25 Lexical Score for Terms]
                     │
                     ▼
       [Hybrid Fusion: Score = (0.65 * VectorSim) + (0.35 * BM25)]
                     │
                     ▼
         [Local Matches Above Threshold?]
               │                    │
              YES                   NO / Low Confidence
               │                    │
               ▼                    ▼
     [Decrypt Local Results]   [Anonymous Web Search Fallback]
               │                    │
               ▼                    ▼
     [Synthesize Passage Q&A]  [Scrub Query & Query Public API]
               │                    │
               └──────────┬─────────┘
                          │
                          ▼
            [Unified Ranked Results View]
```

---

## 4. Design Brief

### 4.1 Aesthetic Philosophy
- **Anti-AI Slop Mandate**: No generic purple glowing gradients, no floating pills, no decorative pulsing status dots, and no fake telemetry scoreboards.
- **High-Craft Minimalist Utility**: Deep neutral canvas (`neutral-950`), refined hairline borders (`neutral-800`), crisp tabular typography (`JetBrains Mono`), and high-legibility display headers (`Plus Jakarta Sans`).
- **Tactile Feedback**: Keyboard-first control with `/` or `Cmd+K` focus, intuitive arrow navigation, and real-time computation timers (exact microsecond measurement via `performance.now()`).

### 4.2 Layout Architecture
- **Header**: 3-Zone contract:
  - Zone 1: Single brand wordmark (`AEGIS // Sovereign Search`).
  - Zone 2: Navigation views (`Search`, `Vault & Index`, `Browser & Sync`, `Security & Audit`, `Architecture Docs`).
  - Zone 3: Primary Action (`Unlock / Lock Vault` or `Index Document`).
- **Search Canvas**: Centered, balanced query box with instant mode switching (`Hybrid Semantic`, `Strict Exact`, `Conversational Synthesizer`).
- **Results Viewport**: Clear 2-column or split pane displaying prioritized local encrypted matches with similarity scores, matched conceptual keywords, and expandable document preview pane.

---

## 5. Background Schema & Data Model

### 5.1 IndexedDB Database: `AegisPrivateEngine_v1`

#### Store: `documents`
- `id` (string, primary key, UUIDv4)
- `title` (string, document name/title)
- `category` (string: `finance`, `medical`, `legal`, `notes`, `code`, `personal`)
- `encryptedData` (ArrayBuffer: AES-GCM ciphertext)
- `iv` (Uint8Array: 12-byte initialization vector)
- `tag` (ArrayBuffer: authentication tag)
- `tokensCount` (number)
- `createdAt` (number timestamp)
- `updatedAt` (number timestamp)
- `version` (number: CRDT vector sequence)

#### Store: `vectors`
- `docId` (string, primary key)
- `chunkIndex` (number)
- `vector` (Array<number>: 64-dimensional float vector normalized to unit length)
- `keywords` (Array<string>: top TF-IDF extracted stems)
- `snippet` (string: unencrypted search preview snippet or salt-hashed)

#### Store: `audit_logs`
- `id` (string, primary key)
- `timestamp` (number)
- `action` (string: `QUERY`, `INGEST`, `DECRYPT`, `EXPORT`, `KEY_DERIVATION`, `PURGE`)
- `actorRole` (string: `owner`, `auditor`, `guest`)
- `details` (string)
- `hash` (string: SHA-256 chain hash for tamper evidence)

#### Store: `sync_deltas`
- `sequenceId` (number, auto-increment)
- `docId` (string)
- `operation` (string: `INSERT`, `UPDATE`, `DELETE`)
- `payload` (ArrayBuffer: encrypted delta)
- `timestamp` (number)

---

## 6. Implementation Plan

- **Step 1: Cryptographic & Key Derivation Core (`src/lib/crypto.ts`)**
  - Implement WebCrypto PBKDF2 derivation and AES-GCM encryption/decryption with zero-knowledge passphrase management.
- **Step 2: Vector Embedding & Hybrid BM25 Engine (`src/lib/semanticEngine.ts`)**
  - High-performance n-gram subword hashing, vector cosine similarity dot products, BM25 tokenizer, and query expansion.
- **Step 3: IndexedDB Storage & Transaction Layer (`src/lib/storage.ts`)**
  - Resilient IndexedDB schema initialization, CRUD operations, encrypted storage, and seed datasets.
- **Step 4: Dual-Layer & Anonymous Fallback Engine (`src/lib/searchRouter.ts`)**
  - Orchestrate local vector scoring, context synthesis for conversational queries, and anonymous web query fallback.
- **Step 5: Browser Integration & Offline Sync Engine (`src/lib/syncAndBrowser.ts`)**
  - OpenSearch XML generator, browser extension background interceptor template, and encrypted P2P sync payload export/import.
- **Step 6: UI Shell, Search Interface & Documentation Hub (`src/App.tsx` & components)**
  - Responsive minimalist search engine UI, live document viewer, vault management, audit trail inspector, and comprehensive documentation view.
- **Step 7: Verification & Build Compilation**
  - Unit tests for crypto, vector math, and storage; run `compile_applet`.
