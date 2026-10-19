# Product Requirements Document
## Project: Veritas — Private Local-First Semantic Search Engine
**Version:** 3.0.0  
**Status:** Draft for Review  
**Classification:** Sovereign / Local-First / Zero-Cloud AI  

---

## 1. Problem & Goal

Knowledge workers and privacy-conscious users accumulate large volumes of unstructured personal documents (financial records, medical notes, contracts, code, research). Existing solutions force an unacceptable trade-off:

- Classic keyword search fails when the user cannot remember exact wording.
- Cloud semantic search / LLM tools require sending sensitive data off-device.

**Goal:** Build a browser-native, local-first semantic search engine that understands *intent*, indexes personal files entirely on-device, prioritises local results, and can be set as the default search engine. All sensitive processing stays on the user’s device. Zero cloud AI, zero telemetry.

Success looks like: a user types a natural-language question in the browser omnibox or the Veritas page, receives highly relevant local results (even when exact keywords are absent), can continue the conversation, and only falls back to anonymous web results when local confidence is low—without ever leaking personal data.

---

## 2. Users & Roles

| Role | Description | Capabilities |
|------|-------------|--------------|
| **Owner** | Primary user / device owner | Full access: ingest, search, decrypt, re-key, purge, export/import, manage settings, switch roles |
| **Auditor** | Read-only compliance / verification | View and verify cryptographic audit chain only |
| **Guest** | Restricted query mode | Search unlocked content; no access to master keys, settings, or administrative actions |

Single-user first; roles are local and enforced client-side.

---

## 3. Core Features (MVP — all required)

### 3.1 Local Semantic + Lexical Search
- Client-side vector embeddings (subword / conceptual) + Okapi BM25.
- Reciprocal Rank Fusion (RRF) or configurable hybrid scoring.
- Surfaces relevant results even when the query shares no exact keywords with the document.
- Extractive conversational answers with verifiable citations (document title + passage + score).
- Natural-language and multi-turn conversational queries against the local index.

### 3.2 Document Vault & Ingestion
- Drag-and-drop / file-picker / folder ingestion.
- Supported formats (v1): plain text, Markdown, JSON, CSV, code/logs, PDF (client-side text extraction), images (OCR + metadata).
- Automatic chunking with overlap.
- All content encrypted at rest with AES-256-GCM before IndexedDB write.
- Tags, titles, timestamps, and integrity hashes.

### 3.3 Browser Search Engine Integration
- OpenSearch 1.1 descriptor so the SPA can be added as a custom search engine.
- Full browser extension that intercepts searches (omnibox / default search) for:
  - Chromium family (Chrome, Edge, Brave — Manifest V3)
  - Firefox
  - Safari
- Extension detects OS/browser and offers the appropriate install path.
- Queries land first on the local index; only low-confidence or explicit web requests leave the device (anonymously).

### 3.4 Dual-Layer Privacy Search
- Always try local index first.
- Configurable confidence threshold.
- When local results are insufficient:
  - Anonymous fetch from privacy-friendly sources (DuckDuckGo Instant Answer, Brave Search, etc.).
  - Optional raw page text fetch.
  - Local re-ranking with the same vector engine + extractive synthesis on-device.
- No user identifiers, cookies, referrers, or tracking headers on external requests.
- Zero remote LLMs / Gemini / OpenAI / Anthropic.

### 3.5 Instant Local Answers
- Time, date, calendar, world clocks.
- Browser storage quota & vault statistics.
- Machine / system info (OS, cores, screen, network status).
- Activity / audit summary (“what I have done”).
- Calculator and unit conversions.
- All computed entirely client-side.

### 3.6 Offline-First Sync & Portability
- Export / import of encrypted `.veritas.enc` bundles (documents + vectors + audit log).
- Vector-clock conflict resolution for multi-device merges.
- Works without persistent internet; sync is explicit and user-initiated.

### 3.7 Security, Audit & Access Control
- Passphrase → PBKDF2 (100k iterations, SHA-256) → non-extractable AES-256-GCM key held only in memory.
- Tamper-evident Merkle-style audit chain (SHA-256 linked) for every significant action.
- One-click chain verification.
- Role-based access control as defined above.
- No telemetry, analytics, or error-reporting hooks that send data off-device.

### 3.8 Quality & Engineering Non-Functionals
- Modular, scalable TypeScript codebase ready for future local-only features.
- Comprehensive unit tests for every functional module.
- Minimal production bundle size.
- Responsive design, dark mode, accessibility (WCAG 2.1 AA target).
- Thorough developer documentation.
- Secure CI/CD with automated vulnerability scanning.
- Performance budgets enforced throughout development.
- Clear code quality and high test coverage.
- Robust local logging (never leaves the device) and real-time error surfaces in the UI.
- End-to-end encryption for all sensitive stored data.

---

## 4. Out of Scope for MVP (later)
- Cloud or peer-to-peer always-on sync transport (WebRTC, shared folder, etc.).
- Remote multi-user collaboration.
- Server-side components of any kind.
- Training or fine-tuning of embedding models in the cloud.
- Payment, accounts, or identity providers.

---

## 5. Success Metrics (local / qualitative)
- Query latency (hybrid local search) p95 < 15 ms on a typical laptop with 1 000–5 000 chunks.
- User can set Veritas as default search and receive local-first results from the omnibox.
- Zero network requests containing document content or derived keys.
- Audit chain verifies cleanly after normal use.
- Extension installs and intercepts searches on the three major browser families.

---

## 6. Open Questions
- Exact set of privacy-friendly web endpoints to whitelist in CSP / extension permissions (DuckDuckGo, Brave, etc.).
- Preferred OCR library for images (Tesseract.js or lighter alternative) and performance trade-offs on mobile.
- Whether multi-turn conversation history is stored encrypted in IndexedDB or kept only in session memory.

---

## 7. Decisions Log
- Stack fixed: React + TypeScript, IndexedDB, Web Crypto, client-side embeddings + BM25.
- Zero cloud AI is non-negotiable.
- Full browser-extension interception is in scope for v1.
- External search = anonymous API + optional page text → local re-rank & extract.
- Design direction = clean search-engine page, minimalist, high-performance, dark mode.
