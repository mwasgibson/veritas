# Application Flow & Architecture Workflows
## Project: Veritas Sovereign Search Engine
**Document Version:** 2.4.0  
**Coverage:** System Sequences, State Machines & Process Diagrams  

---

## 1. Cryptographic Initialization & Session Lifecycle Flow

```
                  +-----------------------------------+
                  |   User Launches Veritas Engine    |
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |     Open IndexedDB Connection     |
                  |  (Veritas_Private_Storage_v1)    |
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |  Check URL Parameters (?q=...)    |
                  +-----------------------------------+
                                    |
                     +--------------+--------------+
                     |                             |
             [?q= Param Present]         [No ?q= Param Present]
                     |                             |
                     v                             v
           +--------------------+        +--------------------+
           | Set Search Input & |        | Render Idle Search |
           | Execute Auto-Query |        | Canvas with Prompts|
           +--------------------+        +--------------------+
                     |                             |
                     +--------------+--------------+
                                    |
                                    v
                  +-----------------------------------+
                  |    Check Master Key in Memory     |
                  +-----------------------------------+
                                    |
                     +--------------+--------------+
                     |                             |
            [Key Exists in RAM]            [No Key / Locked]
                     |                             |
                     v                             v
           +--------------------+        +--------------------+
           | Vault Unlocked:    |        | Prompt Passphrase  |
           | Plaintext Read     |        | Modal for Unlock   |
           +--------------------+        +--------------------+
                                                   |
                                                   v
                                         +--------------------+
                                         | User Enters Master |
                                         | Passphrase         |
                                         +--------------------+
                                                   |
                                                   v
                                         +--------------------+
                                         | PBKDF2 Derivation  |
                                         | (100k SHA-256)     |
                                         +--------------------+
                                                   |
                                                   v
                                         +--------------------+
                                         | Derive AES-256 Key |
                                         | Store in React RAM |
                                         +--------------------+
```

---

## 2. Ingestion & Semantic Vector Indexing Pipeline

```
 [Raw File / Paste Input]
           |
           v
 [Text Normalization & Tokenization] (Strip non-alphanumeric, lowercase, stopword removal)
           |
           v
 [Sliding Window Chunking] (Chunk size: 300 words, Overlap: 50 words)
           |
           +--------------------------------+--------------------------------+
           |                                                                 |
           v                                                                 v
 [Compute 64-Dim Vector Embeddings]                               [AES-256-GCM Encryption]
 - Subword 3-gram FNV-1a hashing                                  - Generate 12-byte random IV
 - Semantic concept cluster activations                           - Encrypt chunk/doc payload
 - L2 Unit Normalization (sum of squares = 1.0)                  - Produce Base64 ciphertext + tag
           |                                                                 |
           +--------------------------------+--------------------------------+
                                            |
                                            v
           +-----------------------------------------------------------------+
           | Atomic IndexedDB Commit (Transaction: 'documents' + 'vectors')  |
           +-----------------------------------------------------------------+
                                            |
                                            v
           +-----------------------------------------------------------------+
           | Append Cryptographic Merkle Audit Block (H_n = SHA256(H_n-1...)) |
           +-----------------------------------------------------------------+
```

---

## 3. Dual-Layer Search Execution & Ranking Flow

```
                      +-----------------------------+
                      | User Inputs Query 'q' in UI |
                      | or Browser Omnibox (?q=...) |
                      +-----------------------------+
                                     |
                                     v
                      +-----------------------------+
                      | Generate Query Embedding q  |
                      | & Tokenize Query Terms      |
                      +-----------------------------+
                                     |
                                     v
          +--------------------------+--------------------------+
          |                                                     |
          v                                                     v
[Parallel Cosine Dot Product]                         [Okapi BM25 Lexical Score]
Across all Float32Array vector                        Term frequency saturation
chunks in memory (sub-10ms)                           and document length normal.
          |                                                     |
          +--------------------------+--------------------------+
                                     |
                                     v
                      +-----------------------------+
                      | Compute Hybrid Fusion Score |
                      | Score = α·Vec + (1-α)·BM25  |
                      +-----------------------------+
                                     |
                                     v
                      +-----------------------------+
                      | Filter & Rank Local Matches |
                      +-----------------------------+
                                     |
                  +------------------+------------------+
                  |                                     |
     [Top Local Score >= Threshold]        [Top Local Score < Threshold]
                  |                                     |
                  v                                     v
     +--------------------------+          +--------------------------+
     | Decrypt Top Local Match  |          | Trigger Anonymous Web    |
     | Passages via AES-256 Key |          | Fallback (If Enabled)    |
     +--------------------------+          +--------------------------+
                  |                                     |
                  v                                     v
     +--------------------------+          +--------------------------+
     | Natural Language Query?  |          | Strip User Identifiers & |
     | Run Conversational Q&A   |          | Query Public Knowledge   |
     +--------------------------+          +--------------------------+
                  |                                     |
                  +------------------+------------------+
                                     |
                                     v
                      +-----------------------------+
                      | Render Ranked Unified View  |
                      | With Match Latency Metrics  |
                      +-----------------------------+
```

---

## 4. Extractive Conversational Synthesis Workflow

When a conversational query or question (`what`, `how`, `when`, `where`, `is`, `can`, `?`) is evaluated:
1. Top $k$ local matching documents are selected.
2. Documents are parsed into candidate sentence units.
3. Each candidate sentence is vector-embedded into the 64-dimensional semantic space.
4. Sentences are scored based on:
   $$\text{Relevance} = 0.70 \cdot \text{CosineSimilarity}(\mathbf{q}, \mathbf{s}) + 0.30 \cdot \frac{|\text{Overlap}(\mathbf{q}_{\text{tokens}}, \mathbf{s}_{\text{tokens}})|}{|\mathbf{q}_{\text{tokens}}|}$$
5. Top 3 candidate evidence sentences are extracted.
6. A coherent contextual synthesis is composed and presented with direct title links, text snippets, and numerical confidence scores.

---

## 5. Offline-First Cross-Device Sync Protocol

```
[Device A: Laptop]                                  [Device B: Mobile]
        |                                                   |
        | 1. Export Encrypted Vault Bundle                  |
        |    (AES-256-GCM + SHA-256 Checksum)               |
        v                                                   |
 [.veritas.enc File Generated]                              |
        |                                                   |
        +-----> Transfer via AirDrop / Local LAN / USB ---->+
                                                            |
                                                            v
                                            2. Select File to Merge
                                                            |
                                                            v
                                            3. Verify SHA-256 Checksum
                                               Against Payload Header
                                                            |
                                                            v
                                            4. Decrypt via Shared Passphrase
                                                            |
                                                            v
                                            5. Vector Clock Conflict
                                               Resolution (LWW Merge)
                                                            |
                                                            v
                                            6. Commit to Mobile IndexedDB
                                                            |
                                                            v
                                            7. Audit Record Appended
```
