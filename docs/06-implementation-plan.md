# Implementation Plan
## Project: Veritas — Private Local-First Semantic Search Engine
**Version:** 3.0.0  
**Approach:** Evolve the existing public repo (strip Gemini, harden privacy, add full extension + PDF/OCR + search-engine UI). No green-field rewrite.

---

## Phase 0 — Preparation (1 short session)
- [x] Clone / sync current `mwasgibson/veritas` into the working tree.
- [x] Remove all Gemini / `@google/genai` references (`package.json`, `metadata.json`, any residual imports or comments).
- [x] Confirm zero network calls that transmit document content or keys.
- [ ] Set up clean TypeScript + Vitest baseline if missing (Vitest deferred to Phase 8).
- [x] Create / update this `docs/` set (done in current session).
- **Acceptance:** `npm install` succeeds with no Google AI packages; `grep -ri gemini` returns nothing material. (package/metadata cleaned; re-run install locally if sandbox FS is flaky)

---

## Phase 1 — Core Privacy & Crypto Hardening
- [ ] Audit and freeze crypto module (PBKDF2 100k, AES-256-GCM, non-extractable keys).
- [ ] Ensure every document and vector write goes through encryption.
- [ ] Strengthen audit-chain implementation and verification UI.
- [ ] Add / verify RBAC gates on sensitive actions.
- **Acceptance:** Unit tests for encrypt/decrypt round-trip, key derivation determinism, and audit-chain integrity all pass; locked vault yields no plaintext in memory or IndexedDB.

---

## Phase 2 — Search Engine Page UI
- [ ] Redesign the default view as a clean search-engine page (large centred bar, minimal header).
- [ ] Implement ResultCard, InstantAnswerCard, source badges, citation display.
- [ ] Dark / light mode with system preference + toggle.
- [ ] Responsive layout and basic accessibility (focus, ARIA, keyboard).
- **Acceptance:** Empty state and populated result state match the Design Brief; Lighthouse accessibility score ≥ 90 on the search page.

---

## Phase 3 — Hybrid Search & Conversational Extract
- [ ] Keep / improve client-side embedding + BM25 + RRF / hybrid ranking.
- [ ] Extractive answer synthesis with citations.
- [ ] Multi-turn session context (in-memory first; optional encrypted persistence later).
- [ ] Instant-answer routers (time, storage, system, calculator, activity).
- **Acceptance:** Semantic queries return relevant local hits without exact keywords; extractive answers cite correct passages; unit tests cover ranking and fusion.

---

## Phase 4 — Ingestion Expansion
- [ ] Client-side PDF text extraction (pdf.js or equivalent).
- [ ] Image OCR + metadata (Tesseract.js or lighter WASM).
- [ ] Robust chunking, progress UI, error isolation per file.
- [ ] Batch ingest of folders.
- **Acceptance:** PDFs and images appear in the vault with searchable text; large batches do not freeze the UI.

---

## Phase 5 — Dual-Layer Web Fallback (Zero Cloud AI)
- [ ] Confidence threshold + anonymous fetch to privacy-friendly APIs (DuckDuckGo Instant Answer, Brave Search, etc.).
- [ ] Optional raw-page text retrieval.
- [ ] Local re-embedding and re-ranking of web results.
- [ ] Strict CSP and extension permissions; strip all identifying headers.
- **Acceptance:** When local confidence is low, web results appear, are re-ranked locally, and no document content or user identifiers leave the device. Network tab shows only the whitelisted endpoints.

---

## Phase 6 — Full Browser Extension
- [ ] Manifest V3 extension for Chromium (Chrome / Edge / Brave) with omnibox / search interception.
- [ ] Firefox WebExtension equivalent.
- [ ] Safari Web Extension scaffolding + OS detection for install guidance.
- [ ] Extension ↔ SPA messaging (query hand-off only).
- [ ] In-app install cards that detect OS/browser and show the correct path.
- **Acceptance:** Setting Veritas as default search (or using the keyword) routes queries into the local index first on at least Chromium and Firefox; Safari path is documented and functional where packaging allows.

---

## Phase 7 — Sync, OpenSearch & Polish
- [ ] Harden encrypted bundle export/import + vector-clock merge.
- [ ] OpenSearch 1.1 descriptor and “Add as search engine” flow.
- [ ] Settings for α / threshold / web-fallback toggle.
- [ ] Performance pass (bundle size, query latency budgets).
- **Acceptance:** Export → import on a second browser profile restores searchable content; OpenSearch works; core SPA gzipped size stays under the agreed budget.

---

## Phase 8 — Testing, CI, Documentation & Hardening
- [ ] Comprehensive unit tests for every functional module (crypto, storage, semantic, router, ingestion, sync).
- [ ] CI pipeline: install, type-check, unit tests, vulnerability scan, build.
- [ ] Developer documentation (README + this docs set kept in sync).
- [ ] Final privacy audit (no telemetry, no residual Gemini, CSP correct).
- [ ] Performance benchmarks recorded.
- **Acceptance:** CI green; test coverage ≥ 80 % on core modules; README clearly states local-first guarantees and how to install the extension.

---

## Phase 9 — Release Readiness
- [ ] Tag v1.0.0 (or next appropriate version).
- [ ] Publish extension packages / store listings as far as each browser allows.
- [ ] Final review of all six planning docs against shipped code.
- **Acceptance:** User can install SPA + extension, set as search engine, ingest mixed file types, search semantically offline, and fall back anonymously to the web when needed—all without any cloud AI or telemetry.

---

## Ordering Rationale
Privacy and crypto first (nothing sensitive is written incorrectly). UI second so the search-engine experience is concrete. Search quality and file types next. Web fallback only after local path is solid. Extension after the SPA can already answer queries. Testing and CI continuous but finalised before release.

---

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Extension store review delays / restrictions | Ship SPA + OpenSearch first; extension as progressive enhancement |
| OCR / PDF WASM size | Lazy-load; offer “text-only” ingest path |
| Safari packaging complexity | Detect + clear guidance; do not block Chromium/Firefox |
| Custom embedding quality | Keep hybrid with BM25; document upgrade path to local ONNX later |

---

## Definition of Done (overall)
- All Gemini references gone.
- All six docs accurate and reflected in code.
- Full feature set listed in the PRD is present and tested.
- Zero cloud AI, zero telemetry, data never leaves the device except for the explicit anonymous web fallback.
- User can use Veritas as their primary browser search engine with local-first results.
