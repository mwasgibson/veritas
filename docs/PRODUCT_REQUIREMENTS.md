# Product Requirements Document (PRD)
## Project: Veritas Sovereign Search Engine
**Document Version:** 2.4.0  
**Status:** Approved for Implementation  
**Data Privacy Classification:** Strictly Confidential / Sovereign Local-First  

---

## 1. Executive Overview & Problem Statement

### 1.1 The Privacy & Semantic Dilemma
Modern knowledge workers and privacy-conscious professionals accumulate thousands of pages of deeply confidential, unstructured personal data:
- Financial ledger reconciliations, 1099/W-2 tax statements, investment portfolios, and deduction worksheets.
- Medical diagnostic reports, comprehensive metabolic lab results, vitals, prescriptions, and physician notes.
- Legal agreements, residential lease contracts, nondisclosure agreements, and IP licensing clauses.
- Intellectual property notes, engineering blueprints, distributed architecture designs, and private keys.

To search and retrieve knowledge from these archives today, users face an unacceptable dilemma:
1. **Traditional Local Keyword Search (grep, standard OS spotlight, legacy file search):** Extremely brittle. It demands exact verbatim keyword recollection. If a user queries *"how much did I spend on business deductions"*, standard lexical search fails completely if the file text only mentions *"Schedule C workspace depreciation and Section 179 computer expenses"*.
2. **Cloud AI / Centralized Semantic Search Engines:** Highly capable of contextual understanding, but fundamentally incompatible with data sovereignty. Transmitting unencrypted personal medical records, financial tax write-offs, or proprietary architectural specifications to third-party cloud servers exposes users to data breaches, training-data extraction, model telemetry leaks, and non-compliance with privacy standards.

### 1.2 The Veritas Solution
**Veritas Sovereign Search** is an offline-first, client-side semantic search engine designed to run as the user's primary browser search engine. Veritas unites:
- **Client-Side High-Dimensional Vector Embeddings**: In-memory and IndexedDB-backed semantic concept clustering enabling conceptual discovery without keyword overlap.
- **BM25 Lexical Precision**: Fast term-frequency matching for exact serial numbers, IDs, and verbatim names.
- **Reciprocal Rank Fusion (RRF)**: Dynamically calibrated hybrid scoring balancing semantic intent with lexical accuracy.
- **Zero-Cloud Extractive Conversational Synthesis**: Multi-passage context extraction and citation synthesis performed purely in client memory.
- **End-to-End Encryption (E2EE)**: AES-256-GCM encryption with PBKDF2 (100,000 SHA-256 iterations) derived from a zero-knowledge master passphrase.
- **Universal Browser Omnibox Interception**: Native OpenSearch 1.1 protocol support and Manifest v3 extension hooks allowing users to replace Google or Bing in Chrome, Brave, Firefox, Edge, and Safari.
- **Dual-Layer Privacy Routing**: Local records are searched in sub-10ms; when queries target external public facts, an anonymous web fallback queries scrubbed public knowledge endpoints with zero cookies, user agents, or tracking beacons.
- **Offline-First Synchronization**: Encrypted export/import bundles and peer-to-peer sync protocols that keep mobile, tablet, and laptop indices in sync without centralized cloud dependencies.

---

## 2. User Personas & Use Case Scenarios

### 2.1 Persona A: Dr. Elena Rostova — Medical Specialist & Researcher
- **Profile:** Physician holding sensitive clinical records, patient de-identified case studies, and research drafts.
- **Pain Point:** Cannot upload clinical drafts to cloud search engines due to medical confidentiality regulations; struggles to locate prior patient cases based on symptom descriptions rather than patient ID numbers.
- **Veritas Solution:** Elena types *"cardiovascular markers with high HDL and normal fasting glucose"*. Veritas immediately retrieves her metabolic panel documents via cosine vector similarity, displaying highlighted biomarker excerpts within 0.8ms.

### 2.2 Persona B: Marcus Vance — Independent Systems Architect & Consultant
- **Profile:** Technology consultant managing 1099 tax records, hardware invoices, NDA agreements, and client architectural diagrams.
- **Pain Point:** Frequently forgets specific filing codes or supplier invoice names; needs to replace his browser's default search engine so typing `@a` or direct queries into the Chrome omnibox searches his local notes first before querying the web.
- **Veritas Solution:** Marcus configures Veritas as his browser's default search engine. When he types *"travel expense receipts for Lisbon conference"* into the URL bar, Veritas intercepts the query locally, reveals his travel reservation documents, and only queries the public web if local confidence is low.

### 2.3 Persona C: Julian Chen — Cryptographic Security Auditor
- **Profile:** Security researcher auditing source code, security audit reports, and key derivation standards.
- **Pain Point:** Zero tolerance for telemetry, tracking pixels, third-party analytics, or unencrypted persistent storage.
- **Veritas Solution:** Julian inspects the Veritas Merkle-linked audit log, verifies the SHA-256 hash chain, validates that zero outbound telemetry network requests are made, and inspects the raw AES-256-GCM ciphertext in IndexedDB.

---

## 3. Functional Requirements

### 3.1 Document Ingestion & Storage
- **FR-1.1**: The system must support ingesting unstructured text, Markdown (`.md`), JSON, CSV, plain text (`.txt`), and rich text extracts.
- **FR-1.2**: Ingested content must be automatically split into overlapping sliding-window chunks (256–300 tokens with 50-token overlap) to preserve contextual boundaries.
- **FR-1.3**: All raw document texts must be encrypted using client-side AES-256-GCM before writing to the IndexedDB `documents` store.
- **FR-1.4**: Users must have the ability to inspect preloaded demo corpora (Finance, Medical, Legal, Systems Architecture, Travel, Cryptography) for immediate testing.

### 3.2 Semantic Vector & Hybrid Search Engine
- **FR-2.1**: The system must compute 64-dimensional semantic concept embeddings directly on the client without invoking remote APIs.
- **FR-2.2**: Vector similarity must be calculated via SIMD-optimized `Float32Array` cosine dot product routines.
- **FR-2.3**: Lexical relevance must be scored via the Okapi BM25 algorithm ($k_1=1.5, b=0.75$).
- **FR-2.4**: The system must support four operational search modes:
  1. *Hybrid Semantic*: Weighted combination ($\alpha \cdot \text{Vector} + (1-\alpha) \cdot \text{BM25}$).
  2. *Semantic Vector Only*: Pure cosine distance ranking.
  3. *Exact BM25*: Pure lexical term frequency ranking.
  4. *Conversational Q&A*: Multi-document extractive sentence synthesis with exact citations.
- **FR-2.5**: The hybrid weighting parameter $\alpha$ and the minimum confidence threshold must be dynamically configurable via the UI.

### 3.3 Extractive Conversational Q&A
- **FR-3.1**: When a natural language question (e.g., query ending in `?` or starting with `what`, `how`, `when`, `where`, `can`) is submitted, the engine must extract candidate evidence sentences.
- **FR-3.2**: Candidate sentences must be ranked by semantic relevance to the query vector.
- **FR-3.3**: The synthesized answer must cite document titles, snippet passages, and individual relevance scores.

### 3.4 Browser Omnibox & Default Search Engine Integration
- **FR-4.1**: The application must serve an OpenSearch 1.1 XML specification at `/opensearch.xml`.
- **FR-4.2**: The application must parse URL search query parameters (`/?q={searchTerms}`) to enable instant omnibox query execution from browser address bars.
- **FR-4.3**: The system must provide copyable Manifest v3 extension files (`manifest.json` and `background.js`) for omnibox query interception in Chromium-based browsers.

### 3.5 Dual-Layer Privacy Search & Anonymous Web Fallback
- **FR-5.1**: Queries must prioritize local IndexedDB records first.
- **FR-5.2**: If the highest local similarity score falls below the configured threshold (default: 0.60) and web fallback is enabled, an anonymous external query is dispatched.
- **FR-5.3**: All external requests must be sanitized: personal identifiers, cookies, referrers, and tracking headers must be strictly stripped.

### 3.6 Offline-First Synchronization & Cryptographic Auditing
- **FR-6.1**: The system must export encrypted `.veritas.enc` bundles containing AES-256-GCM ciphertext and SHA-256 integrity checksums.
- **FR-6.2**: The system must import and merge sync bundles with conflict-free version tracking.
- **FR-6.3**: Every operation (QUERY, INGEST, DECRYPT, EXPORT, SYNC, PURGE) must be logged in a Merkle-linked audit log where $H_n = \text{SHA256}(H_{n-1} + \text{action} + \text{role} + \text{details} + \text{timestamp})$.
- **FR-6.4**: Users must have access to a one-click cryptographic verification tool that recomputes all block hashes to prove zero tampering.
