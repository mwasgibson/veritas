# Technical Requirements Document (TRD)
## Project: Veritas Sovereign Search Engine
**Document Version:** 2.4.0  
**Target Environment:** Modern Web Browsers (Chrome 115+, Brave 1.50+, Firefox 115+, Safari 17+, Edge 115+)  
**Runtime:** Client-Side Single Page Application (React 19 / TypeScript 5.8+ / Web Crypto API / IndexedDB)  

---

## 1. Cryptographic Architecture & Security Standards

### 1.1 Key Derivation Function (KDF)
- **Algorithm:** PBKDF2 (Password-Based Key Derivation Function 2) as defined in RFC 8018 / NIST SP 800-132.
- **Pseudo-Random Function (PRF):** HMAC-SHA-256.
- **Iteration Count:** 100,000 iterations.
- **Salt Generation:** 16 bytes (128 bits) generated via `window.crypto.getRandomValues(new Uint8Array(16))`.
- **Derived Key Specification:** AES-GCM key with a 256-bit key length (`{ name: 'AES-GCM', length: 256 }`).
- **Memory Invariant (Zero-Knowledge):**
  - Master passphrase string is never written to disk, `localStorage`, `sessionStorage`, cookies, or IndexedDB.
  - The derived `CryptoKey` object is marked non-extractable (`extractable: false`) and held exclusively in React volatile state.
  - Locking the vault dereferences the `CryptoKey` from memory, requiring user passphrase re-entry for subsequent decryptions.

### 1.2 Symmetric Authenticated Encryption (AES-GCM-256)
- **Algorithm:** AES (Advanced Encryption Standard) in Galois/Counter Mode (GCM) as specified in NIST SP 800-38D.
- **Key Size:** 256 bits.
- **Initialization Vector (IV):** Unique 12-byte (96-bit) cryptographically random nonce generated per encryption via `window.crypto.getRandomValues(new Uint8Array(12))`. Nonces are NEVER reused across payloads.
- **Authentication Tag:** 128-bit authentication tag automatically appended by AES-GCM to guarantee ciphertext integrity and authenticity.
- **Encrypted Payload Schema:**
  ```typescript
  interface EncryptedPayload {
    cipherBuffer: string; // Base64 encoded ciphertext + auth tag
    iv: string;           // Base64 encoded 12-byte initialization vector
    salt: string;         // Base64 encoded 16-byte PBKDF2 salt
  }
  ```

---

## 2. High-Dimensional Vector Embedding & Semantic Engine

### 2.1 64-Dimensional Semantic Space Projection
The client embedding model maps unstructured natural language into a dense 64-dimensional normalized float vector (`Float32Array(64)`). The embedding algorithm integrates two complementary strategies:

1. **Semantic Concept Cluster Anchors:**
   The 64 dimensions are partitioned into 8 thematic clusters representing primary domains of private personal knowledge:
   - Dimensions 00–07: Financial, Banking, Taxes, Deductions, Balances, Invoices.
   - Dimensions 08–15: Health, Clinical Diagnostics, Biomarkers, Cardiology, Prescriptions.
   - Dimensions 16–23: Systems Architecture, Software, APIs, Microservices, Databases.
   - Dimensions 24–31: Legal, Real Estate Leases, Contracts, Indemnity, Tenancy.
   - Dimensions 32–39: Travel, Itineraries, Airlines, Hotels, Packing, Passports.
   - Dimensions 40–47: Cryptography, Key Management, Encryption, Sovereignty, Vaults.
   - Dimensions 48–55: Project Management, OKRs, Timelines, Milestones, Sprints.
   - Dimensions 56–63: Scientific, Research Papers, Algorithms, Statistical Metrics.

2. **Subword 3-Gram Hashing Trick:**
   For every token, character 3-grams are hashed via an optimized FNV-1a 32-bit hash routine:
   $$\text{hash} = \text{hash} \oplus c_i \times 16777619$$
   The hash determines dimension assignment: $\text{dim} = \text{hash} \pmod{64}$.
   The sign bit determines positive or negative activation: $\text{sign} = (\text{hash} \ \& \ 0x80000000) == 0 \ ? \ +1.0 : -1.0$.

3. **L2 Unit Normalization:**
   Vectors are normalized to unit Euclidean length:
   $$\mathbf{v}_{\text{norm}} = \frac{\mathbf{v}}{\|\mathbf{v}\|_2} = \frac{\mathbf{v}}{\sqrt{\sum_{i=0}^{63} v_i^2}}$$

### 2.2 Cosine Similarity Computation
Because all chunk vectors and query vectors are strictly unit-normalized, the cosine similarity simplifies to an inner dot product:
$$\text{CosineSimilarity}(\mathbf{q}, \mathbf{d}) = \mathbf{q} \cdot \mathbf{d} = \sum_{i=0}^{63} q_i \cdot d_i$$
To maximize query throughput across thousands of chunks, the dot product executes across contiguous typed memory buffers (`Float32Array`), completing in $<0.01\text{ms}$ per chunk.

### 2.3 Okapi BM25 Lexical Scoring
To ensure high precision for exact identifiers, part numbers, and verbatim names, BM25 scoring is calculated:
$$\text{BM25}(D, Q) = \sum_{i=1}^{n} \text{IDF}(q_i) \cdot \frac{f(q_i, D) \cdot (k_1 + 1)}{f(q_i, D) + k_1 \cdot \left(1 - b + b \cdot \frac{|D|}{\text{avgdl}}\right)}$$
Where $k_1 = 1.5, b = 0.75, \text{avgdl} = 150$.

### 2.4 Hybrid Reciprocal Rank Fusion
$$\text{HybridScore} = \alpha \cdot \text{VectorScore} + (1 - \alpha) \cdot \text{BM25Score}$$
Where $\alpha \in [0.1, 0.9]$ (default: $0.65$).

---

## 3. Storage Layer: IndexedDB Transactional Architecture

### 3.1 Database Specification
- **Database Name:** `Veritas_Private_Storage_v1`
- **Schema Version:** 1
- **Engine:** Native browser IndexedDB API with transactional integrity.

### 3.2 Object Store Topology
1. **`documents` (KeyPath: `id`)**:
   Stores document metadata, tokens count, tags, timestamps, and AES-256-GCM encrypted payloads. Plaintext is only present in ephemeral memory when decrypted.
2. **`vectors` (KeyPath: auto-increment, Index: `docId`)**:
   Stores precomputed normalized float vectors, chunk snippets, and extracted keywords.
3. **`audit_logs` (KeyPath: `id`, Index: `timestamp`)**:
   Stores immutable Merkle-linked audit records.
4. **`settings` (KeyPath: `key`)**:
   Stores client configuration (search mode, weights, thresholds).

---

## 4. Latency Budgets & Performance SLAs

| Operation | Target Budget (p50) | SLA Threshold (p95) | Worst Case (p99) |
| :--- | :--- | :--- | :--- |
| Query Vector Generation | 0.2 ms | 0.8 ms | 1.5 ms |
| 1,000-Chunk Cosine Dot Product | 1.2 ms | 4.5 ms | 8.0 ms |
| BM25 Lexical Scoring | 0.5 ms | 2.1 ms | 4.0 ms |
| End-to-End Hybrid Query Execution | 2.5 ms | 7.8 ms | 12.0 ms |
| AES-256-GCM Decryption (Single Doc) | 0.4 ms | 1.1 ms | 2.0 ms |
| PBKDF2 Key Derivation (100k rounds) | 120 ms | 180 ms | 250 ms |

---

## 5. Browser Integration & OpenSearch Protocol

- **OpenSearch 1.1 XML Descriptor:** Available at `/opensearch.xml` with MIME type `application/opensearchdescription+xml`.
- **Query Parameter Interception:** `/?q={searchTerms}` parsed via `URLSearchParams` on app initialization.
- **Manifest v3 Omnibox Hook:** Listens to `chrome.omnibox.onInputEntered` with keyword `v` or `@v`.

---

## 6. Zero-Telemetry & Network Boundary Rules

- **Zero Remote Logging:** No analytics beacons (`google-analytics.com`, `segment.io`, `mixpanel.com`), Sentry telemetry, or error trackers.
- **Sanitized Web Fallback:** External fallback queries execute via stateless CORS proxies without cookies, authorization headers, or IP tracking tokens.
- **Content Security Policy (CSP):** Strict script-src `self`, connect-src `self` + configured public Wikipedia/OpenSearch fallback endpoints.
