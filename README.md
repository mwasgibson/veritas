# Veritas Private Semantic Engine

> **A sovereign, local-first semantic search engine and encrypted personal knowledge vault with zero telemetry, client-side vector embeddings, AES-256-GCM encryption, and anonymous web fallback.**

Veritas understands *what you mean*, not just what you type. All indexing, embedding, ranking, and encryption happen on-device. Your documents never leave your machine.

## Core Capabilities

- **Local-first semantic search** — 64-dim concept clusters + subword 3-gram hashing + Okapi BM25 + Reciprocal Rank Fusion
- **Mandatory encryption** — PBKDF2-HMAC-SHA-256 (100k iterations) → AES-256-GCM; non-extractable keys
- **Redacted vector store** — snippets are never stored in plaintext when the vault is locked
- **RBAC at the storage boundary** — owner / auditor / guest enforced on every mutate path
- **Tamper-evident audit chain** — SHA-256 linked entries
- **Instant machine answers** — time, storage, calculator, activity, specs
- **Anonymous web fallback** — DuckDuckGo / Wikipedia OpenSearch when local confidence is low (headers stripped)
- **Browser extension** — Chromium MV3 omnibox interceptor (Firefox/Safari compatible patterns)
- **Encrypted sync bundles** — offline export/import with vector clocks and checksums
- **Search-engine page UI** — centered empty state, ResultCard, InstantCard, dark mode, responsive

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Unlock the vault with a passphrase, ingest documents, and search.

No API keys. No cloud AI. No analytics.

## Architecture (high level)

1. **Ingest** → chunk → embed (client-side) → encrypt → IndexedDB
2. **Query** → hybrid semantic + BM25 → RRF → live snippet rebuild from decrypted docs
3. **Low confidence** → anonymous web → local re-rank
4. **UI** → SearchView (search-engine layout) + Vault / Sync / Audit / Docs tabs

## Security & Privacy

1. **Zero Cloud Leaks** — documents, vectors, queries, and telemetry stay on-device.
2. **Key Derivation** — 100,000 rounds of PBKDF2-HMAC-SHA-256 with random salts.
3. **Authenticated Encryption** — AES-256-GCM with 96-bit IVs.
4. **Append-Only Audit Chain** — `Hash_n = SHA256(Hash_{n-1} + Data_n)`.

## License

Apache 2.0
