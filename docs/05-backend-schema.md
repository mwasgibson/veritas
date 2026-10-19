# Backend / Storage Schema & API Surface
## Project: Veritas — Private Local-First Semantic Search Engine
**Version:** 3.0.0  

There is **no traditional server backend**. All persistent state lives in the browser’s IndexedDB. The “API” is the set of typed TypeScript modules that other parts of the SPA and the browser extension call.

---

## 1. IndexedDB Database

- **Name:** `Veritas_Private_Storage_v2`
- **Version:** 2 (bump from existing v1 for schema additions)
- **Engine:** Native IndexedDB with explicit transactions

### Object Stores

#### 1.1 `documents`
| Field | Type | Notes |
|-------|------|-------|
| `id` | string (UUID) | Primary key |
| `title` | string | Display title |
| `mimeType` | string | e.g. text/markdown, application/pdf |
| `tags` | string[] | User tags |
| `createdAt` | number (epoch ms) | |
| `updatedAt` | number | |
| `chunkCount` | number | |
| `tokenEstimate` | number | Approximate |
| `encryptedPayload` | EncryptedPayload | AES-256-GCM ciphertext of original text / extracted text |
| `integrityHash` | string | SHA-256 of plaintext (for verification after decrypt) |
| `sourcePath` | string? | Optional original path / filename |

`EncryptedPayload` shape:
```ts
interface EncryptedPayload {
  cipher: string;   // base64 (ciphertext + auth tag)
  iv: string;       // base64 12-byte IV
  salt: string;     // base64 16-byte salt (or reference if global)
}
```

#### 1.2 `vectors`
| Field | Type | Notes |
|-------|------|-------|
| `id` | string (UUID) | Primary key |
| `docId` | string | Index → documents |
| `chunkIndex` | number | Order within document |
| `snippet` | string | Short plaintext snippet for display (or encrypted if preferred) |
| `embedding` | Float32Array or base64 | Normalised vector (encrypted at rest if stored as binary) |
| `keywords` | string[] | Optional BM25 support terms |
| `tokenCount` | number | |

In practice embeddings may be stored encrypted or derived on the fly under the session key; the schema must support either.

#### 1.3 `audit_logs`
| Field | Type | Notes |
|-------|------|-------|
| `id` | string (UUID) | Primary key |
| `prevHash` | string | SHA-256 of previous entry |
| `hash` | string | SHA-256(this entry) |
| `action` | string | QUERY \| INGEST \| DECRYPT \| EXPORT \| IMPORT \| PURGE \| LOCK \| UNLOCK \| ROLE_CHANGE \| VERIFY |
| `role` | string | Owner \| Auditor \| Guest |
| `details` | string | Human-readable or structured summary |
| `timestamp` | number | epoch ms |

#### 1.4 `settings`
| Field | Type | Notes |
|-------|------|-------|
| `key` | string | Primary key |
| `value` | any (JSON) | Non-sensitive only |

Example keys: `theme`, `searchAlpha`, `confidenceThreshold`, `webFallbackEnabled`, `lastRole`.

#### 1.5 `conversation` (optional for multi-turn)
| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Session or thread id |
| `encryptedTurns` | EncryptedPayload | Array of {role, content, citations} |
| `updatedAt` | number | |

---

## 2. In-Memory Session State (never persisted)

- Derived `CryptoKey` (non-extractable)
- Current role
- Active conversation context (if not written to `conversation` store)
- Query result cache (short-lived)

---

## 3. Module-Level “API” (TypeScript surface)

These are the contracts that components and the extension talk to. All are pure client-side.

### Crypto (`src/lib/crypto.ts`)
- `deriveKey(passphrase: string, salt?: Uint8Array): Promise<CryptoKey>`
- `encrypt(plaintext: string | ArrayBuffer, key: CryptoKey): Promise<EncryptedPayload>`
- `decrypt(payload: EncryptedPayload, key: CryptoKey): Promise<string | ArrayBuffer>`
- `sha256(data: string | ArrayBuffer): Promise<string>`

### Storage (`src/lib/storage.ts`)
- `openDB(): Promise<IDBDatabase>`
- `putDocument(doc: DocumentRecord, key: CryptoKey): Promise<void>`
- `getDocument(id: string, key: CryptoKey): Promise<DecryptedDocument | null>`
- `listDocuments(): Promise<DocumentMeta[]>`
- `deleteDocument(id: string): Promise<void>`
- `putVectors(vectors: VectorRecord[]): Promise<void>`
- `queryVectors(...): Promise<VectorRecord[]>`
- `appendAudit(entry: Omit<AuditEntry, 'hash'>): Promise<void>`
- `verifyAuditChain(): Promise<{ok: boolean; brokenAt?: string}>`
- `exportBundle(key: CryptoKey): Promise<Blob>`
- `importBundle(blob: Blob, key: CryptoKey): Promise<MergeReport>`

### Semantic Engine (`src/lib/semanticEngine.ts`)
- `embed(text: string): Float32Array`
- `bm25Score(query: string, docTokens: string[]): number`
- `hybridRank(query: string, candidates: Candidate[]): RankedResult[]`
- `extractAnswer(query: string, ranked: RankedResult[]): ExtractiveAnswer`

### Search Router (`src/lib/searchRouter.ts`)
- `executeQuery(query: string, options: SearchOptions): Promise<SearchResponse>`
  - Handles instant answers, local hybrid, confidence check, anonymous web fallback, local re-rank.

### File System / Ingestion (`src/lib/fileSystem.ts`)
- `ingestFiles(files: FileList | File[], key: CryptoKey, onProgress): Promise<IngestReport>`
- Supports text, MD, JSON, CSV, code, PDF (pdf.js), images (OCR).

### Sync & Browser (`src/lib/syncAndBrowser.ts`)
- Bundle export/import (vector clocks).
- OpenSearch descriptor helpers.
- Extension messaging bridge (if needed).

### Instant Answers (`src/lib/instantAnswers.ts`)
- Pattern matchers for time, date, storage, system, calculator, activity.

---

## 4. Browser Extension Messaging (high-level)

- Extension background → SPA: `{ type: 'SEARCH', query: string }`
- SPA → Extension: readiness / unlock status (no secrets).
- Extension never receives plaintext documents or the CryptoKey.

---

## 5. External Endpoints (strictly limited)

Only used when web fallback is enabled and local confidence is low:

- Privacy-friendly Instant Answer / search APIs (DuckDuckGo, Brave Search, etc.) — no identifying headers.
- Optional raw HTML/text of a result page for local re-embedding.

All responses are processed in memory and discarded unless the user explicitly saves a result into the vault.

---

## 6. Migration Notes

- Existing v1 databases must be detected and either migrated (re-encrypt under new schema) or require a clean re-ingest.
- Document the migration path in the implementation plan.
