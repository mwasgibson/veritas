# Veritas Implementation Todo

## Phase 0 — Preparation
- [x] Planning docs v3.0 written and approved
- [x] Clone / sync repo into artifacts/veritas
- [x] Remove all Gemini / @google/genai references
- [x] Remove unnecessary server deps (express, dotenv)
- [x] Confirm zero network paths that send document content or keys
- [x] Clean package.json name/version/scripts
- [x] All six planning docs pushed to GitHub main

## Phase 1 — Crypto & Privacy Hardening
- [x] Audit crypto module (PBKDF2 100k, AES-256-GCM, non-extractable)
- [x] Require masterKey for all document writes
- [x] Redact vector snippets at rest when vault is encrypted
- [x] Rebuild display snippets from decrypted docs at query time
- [x] RBAC gates at storage boundary (assertCanWrite / assertCanAdmin)
- [x] RBAC on delete, clearAll, purge, export, import
- [x] Push Phase 1 code to GitHub

## Phase 2 — Search Engine Page UI
- [x] Redesign default view as clean search-engine page
- [x] ResultCard, InstantAnswerCard, source badges
- [x] Dark/light mode polish
- [x] Accessibility basics
- [x] Fix white-screen (restore App-compatible SearchView + executeSearch + semanticEngine)

## Phase 3 — Hybrid Search & Conversational Extract
- [x] Reciprocal Rank Fusion (RRF) + weighted hybrid scoring
- [x] Improved extractive answer synthesis with citations + dedupe
- [x] In-memory multi-turn session context (follow-up query expansion)
- [x] Instant-answer path remains primary for time/storage/system/calc
- [x] Respect enableWebFallback for anonymous web results

## Phase 4 — Ingestion Expansion
- [x] Client-side extractors (text / PDF / image)
- [x] Lightweight PDF parser + optional pdfjs-dist
- [x] Optional tesseract.js OCR (filename fallback)
- [x] Per-file error isolation, yield-to-main, failedCount
- [x] Batch folder + single multi-file picker in Vault UI
- [x] optionalDependencies: pdfjs-dist, tesseract.js

## Phase 5 — Dual-Layer Web Fallback
- [x] Confidence threshold gate (skip web when local is strong)
- [x] Anonymous multi-source: Wikipedia OpenSearch + DuckDuckGo Instant Answer
- [x] Local re-embed + BM25 re-rank of web hits
- [x] Optional raw-page excerpts (off by default)
- [x] credentials omit, no-referrer, minimal headers
- [x] CSP connect-src whitelist + Referrer-Policy / nosniff headers

## Phase 6–9
- See docs/06-implementation-plan.md
  - Phase 6: Browser extension + OpenSearch
  - Phase 7–9: Tests, CI, release
