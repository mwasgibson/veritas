# Background Data Schema & Storage Architecture
## Project: Veritas Sovereign Search Engine
**Document Version:** 2.4.0  
**Database Technology:** Client-Side IndexedDB (`Veritas_Private_Storage_v1`)  
**Cryptographic Envelopes:** AES-256-GCM / PBKDF2-HMAC-SHA-256 / SHA-256 Merkle Chain  

---

## 1. Database Overview & Transactional Design

Veritas utilizes a high-performance, purely client-side IndexedDB database. All operations that mutate documents or vector chunk tables execute inside atomic multi-store readwrite transactions (`['documents', 'vectors', 'audit_logs']`), guaranteeing consistency without partial writes.

```
+----------------------------------------------------------------------------------+
|                   IndexedDB: Veritas_Private_Storage_v1                         |
+---------------------+-------------------+-------------------+--------------------+
|  Store: documents   |  Store: vectors   | Store: audit_logs |  Store: settings   |
|  Key: id (UUID)     |  Key: autoInc     | Key: id           |  Key: key          |
|  Payload: Encrypted |  Idx: docId       | Idx: timestamp    |  Config & Weights  |
+---------------------+-------------------+-------------------+--------------------+
```

---

## 2. Store Specifications

### 2.1 Object Store: `documents`
Stores user documents. When an active master key is present, the plaintext content is stripped before disk persistence, and only the authenticated ciphertext envelope is written.

```typescript
interface DocumentRecord {
  /** Unique document identifier (UUIDv4) */
  id: string;

  /** Human-readable document title */
  title: string;

  /** Domain category for filtered indexing */
  category: 'finance' | 'medical' | 'legal' | 'notes' | 'code' | 'personal';

  /** 
   * Plaintext content string. 
   * CRITICAL INVARIANT: Present in memory while unlocked; 
   * stored as empty string on disk when encryptedPayload is present.
   */
  content: string;

  /** Authenticated ciphertext envelope */
  encryptedPayload?: {
    /** Base64 encoded AES-256-GCM ciphertext + 128-bit authentication tag */
    cipherBuffer: string;

    /** Base64 encoded 12-byte initialization vector (never reused) */
    iv: string;

    /** Base64 encoded 16-byte PBKDF2 salt */
    salt: string;
  };

  /** Word/token count */
  tokensCount: number;

  /** Array of normalized tags */
  tags: string[];

  /** Timestamp in epoch milliseconds */
  createdAt: number;

  /** Timestamp in epoch milliseconds */
  updatedAt: number;

  /** CRDT monotonic sequence version for multi-device sync conflict resolution */
  version: number;
}
```

### 2.2 Object Store: `vectors`
Stores precomputed, unit-normalized float embeddings and chunk metadata. Allows sub-10ms similarity calculations without re-tokenizing raw documents during search queries.

```typescript
interface VectorRecord {
  /** Auto-incrementing primary key */
  id?: number;

  /** Foreign key pointing to parent DocumentRecord.id */
  docId: string;

  /** Zero-indexed sequence number of the chunk within the document */
  chunkIndex: number;

  /** Unencrypted passage preview snippet (max 400 chars) */
  snippet: string;

  /** 
   * 64-dimensional float vector normalized to unit Euclidean length.
   * Stored as an Array of numbers, mapped into Float32Array in memory.
   */
  vector: number[];

  /** Top TF-IDF extracted keyword stems for hybrid BM25 index boosting */
  keywords: string[];
}
```

### 2.3 Object Store: `audit_logs`
An append-only, tamper-evident cryptographic log tracking every state mutation and query. Each record includes a cryptographic hash linking to the prior record, forming a local Merkle chain.

```typescript
interface AuditRecord {
  /** Unique audit entry identifier (`audit_${timestamp}_${rand}`) */
  id: string;

  /** Timestamp in epoch milliseconds */
  timestamp: number;

  /** Action classification */
  action: 'QUERY' | 'INGEST' | 'DECRYPT' | 'EXPORT' | 'SYNC' | 'KEY_DERIVE' | 'PURGE';

  /** Role of the active user during action execution */
  actorRole: 'owner' | 'auditor' | 'guest';

  /** Descriptive event metadata */
  details: string;

  /** 
   * SHA-256 hash of this record combined with the prior hash:
   * hash = SHA256(`${prevHash}:${action}:${actorRole}:${details}:${timestamp}`)
   */
  hash: string;

  /** Hash of the immediate preceding block (Genesis block: 64 zeros) */
  prevHash: string;
}
```

### 2.4 Object Store: `settings`
Stores user search preferences and security parameters.

```typescript
interface SettingsRecord {
  /** Unique key name */
  key: string;

  /** Value payload */
  value: any;
}
```

---

## 3. Encrypted Cross-Platform Sync Package Schema (`.veritas.enc`)

When an offline-first backup or peer-to-peer sync payload is exported, Veritas packages all documents and audit records into an encrypted envelope.

```json
{
  "version": "2.4.0",
  "exportedAt": 1742083200000,
  "encryptedBlob": "{\"cipherBuffer\":\"...base64...\",\"iv\":\"...base64...\",\"salt\":\"...base64...\"}",
  "checksum": "a8f5c2d3e4b1...64-char-sha256-of-cipherBuffer...",
  "deviceFingerprint": "device_9f82ab"
}
```

### Integrity Verification Protocol:
1. Recipient reads `encryptedBlob.cipherBuffer`.
2. Computes `expectedChecksum = SHA256(cipherBuffer)`.
3. If `expectedChecksum !== checksum`, aborts import immediately with a tamper warning.
4. If valid, decrypts payload using the shared master passphrase and applies Last-Write-Wins (LWW) CRDT merge based on document `version` and `updatedAt` timestamps.
