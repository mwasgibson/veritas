# Veritas Implementation Todo

## Phase 0 — Preparation
- [x] Planning docs v3.0 written and approved
- [x] Clone / sync repo into artifacts/veritas
- [x] Remove all Gemini / @google/genai references (package.json, metadata.json)
- [x] Remove unnecessary server deps (express, dotenv) if not used
- [x] Confirm zero network paths that send document content or keys (src clean)
- [x] Clean package.json name/version/scripts; add test script baseline
- [ ] Verify install + typecheck after cleanup (npm install flaky in sandbox FS — re-run locally)

## Phase 1 — Crypto & Privacy Hardening
- [ ] Audit crypto module (already strong: PBKDF2 100k, AES-256-GCM, non-extractable)
- [ ] Ensure all writes encrypted
- [ ] Strengthen audit chain + verification
- [ ] RBAC gates

## Phase 2 — Search Engine Page UI
- [ ] Redesign default view as clean search-engine page
- [ ] ResultCard, InstantAnswerCard, source badges
- [ ] Dark/light mode polish
- [ ] Accessibility basics

## Phase 3 — Hybrid Search & Conversational
- [ ] Improve / verify embedding + BM25 + fusion
- [ ] Extractive answers with citations
- [ ] Multi-turn session context
- [ ] Instant-answer coverage

## Phase 4 — Ingestion Expansion
- [ ] PDF text extraction (client-side)
- [ ] Image OCR + metadata
- [ ] Chunking + progress UI

## Phase 5 — Dual-Layer Web Fallback
- [ ] Anonymous privacy-friendly APIs + local re-rank
- [ ] Optional page text fetch
- [ ] Strict CSP / headers

## Phase 6 — Browser Extensions
- [ ] Chromium MV3
- [ ] Firefox
- [ ] Safari scaffolding + OS detection

## Phase 7 — Sync, OpenSearch, Polish
- [ ] Bundle export/import + vector clocks
- [ ] OpenSearch descriptor
- [ ] Settings for thresholds / weights

## Phase 8 — Tests, CI, Docs
- [ ] Unit tests for every core module
- [ ] CI pipeline with vuln scan
- [ ] README + docs sync

## Phase 9 — Release
- [ ] Tag, final audit, ship
