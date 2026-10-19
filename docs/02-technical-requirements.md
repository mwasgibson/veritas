# Technical Requirements Document
## Project: Veritas — Private Local-First Semantic Search Engine
**Version:** 3.0.0  
**Target:** Modern browsers (Chrome/Edge/Brave 115+, Firefox 115+, Safari 17+) + companion browser extensions  

---

## 1. Architecture Overview

- **Primary runtime:** Client-side Single Page Application (React 19 + TypeScript).
- **Storage:** Native IndexedDB (encrypted payloads only).
- **Crypto:** Web Crypto API only (`window.crypto.subtle`).
- **Search core:** Client-side vector embeddings + Okapi BM25 + Reciprocal Rank Fusion (or configurable hybrid).
- **Extension layer:** Separate Manifest V3 (Chromium), WebExtension (Firefox), and Safari Web Extension that intercept search and route to the local SPA / local index.
- **No server, no cloud AI, no telemetry endpoints.**

All sensitive data processing (embedding, ranking, decryption, OCR, PDF text extraction) occurs exclusively on the user’s device.

---

## 2. Technology Stack (locked)

| Layer | Choice | Reason |
|-------|--------|--------|
| UI framework | React 19 + TypeScript (strict) | Existing codebase, component modularity, type safety |
| Build | Vite | Fast HMR, minimal production bundles |
| Styling | Tailwind CSS v4 | Utility-first, dark-mode friendly, small CSS |
| Icons | Lucide React | Lightweight, consistent |
| Local DB | IndexedDB via thin typed wrapper | Native, transactional, no external DB |
| Crypto | Web Crypto (PBKDF2 + AES-256-GCM) | Browser-native, audited primitives |
| Vector engine | Custom Float32Array / subword TF-IDF style embeddings (upgrade path to local ONNX later) | Zero external model download required for MVP |
| Lexical | Okapi BM25 (k₁ = 1.5, b = 0.75) | Proven keyword ranking |
| Fusion | Reciprocal Rank Fusion or weighted hybrid | Combines semantic + lexical signals |
| PDF text | pdf.js (or equivalent client-side) | Runs in browser, no server |
| Image OCR | Tesseract.js (or lighter WASM alternative) | Fully local |
| Testing | Vitest + React Testing Library | Unit + component coverage |
| Extension | Manifest V3 + WebExtensions API | Standard for modern browsers |

Forbidden dependencies: any `@google/genai`, OpenAI, Anthropic, remote embedding SDKs, analytics SDKs, Sentry, or similar.

---

## 3. Cryptographic Requirements

- **KDF:** PBKDF2-HMAC-SHA-256, ≥ 100 000 iterations, 16-byte random salt.
- **Symmetric cipher:** AES-256-GCM, unique 12-byte IV per encryption, 128-bit auth tag.
- **Key handling:** Derived `CryptoKey` is non-extractable and lives only in memory. Locking the vault clears it.
- **Audit chain:** Append-only log where each entry’s hash is `SHA-256(prevHash || action || role || details || timestamp)`.
- **Bundle export:** Entire vault (docs + vectors + audit) encrypted under the same key material and shipped as a single `.veritas.enc` file with integrity checksum.

---

## 4. Storage Schema (see also 05-backend-schema.md)

Database name: `Veritas_Private_Storage_v2` (version bump for new schema).

Object stores:
- `documents` — metadata + encrypted payload
- `vectors` — chunk embeddings + snippets (encrypted or derived under same key)
- `audit_logs` — immutable chain
- `settings` — non-sensitive preferences (search weights, thresholds, theme)
- `conversation` (optional) — encrypted multi-turn history if persisted

All document text and vector data must be ciphertext at rest.

---

## 5. Search Pipeline

1. Parse query (detect instant-answer patterns, conversational vs keyword).
2. Generate query vector on-device.
3. Retrieve candidate chunks from IndexedDB (pre-filter by tags / time if present).
4. Score with cosine similarity + BM25.
5. Fuse ranks (RRF or α-hybrid).
6. If top local score < threshold → trigger anonymous web fallback:
   - Privacy-friendly Instant Answer / search API (no identifying headers).
   - Optional fetch of top result page text.
   - Local re-embedding + re-ranking + extractive synthesis.
7. Return ranked results + extractive answer + citations.

Latency targets (laptop, 2 000–5 000 chunks):
- Vector generation: < 2 ms
- Full hybrid query: p95 < 15 ms
- PDF page extract (first page): < 300 ms
- Single image OCR (small): < 2 s (async, non-blocking)

---

## 6. Browser Extension Requirements

- **Chromium (Chrome / Edge / Brave):** Manifest V3, `chrome.omnibox` + `chrome.search` / declarativeNetRequest or equivalent interception where possible; background service worker routes query to Veritas SPA or local index.
- **Firefox:** WebExtensions equivalent of the above.
- **Safari:** Safari Web Extension; detect macOS / iOS and guide user through App Store / Xcode packaging if needed.
- Extension must detect host OS and browser and present the correct install instructions / package.
- Permissions kept to the minimum required for search interception and local storage access.
- Extension never sends document content or derived keys off-device.

---

## 7. Network & Privacy Boundary

- Default: zero outbound network for search.
- Allowed only for explicit / low-confidence web fallback:
  - Strict CSP `connect-src` whitelist of privacy-friendly endpoints.
  - No cookies, no Authorization, no Referer, no custom tracking headers.
  - Responses processed only in memory; never stored unless user explicitly saves a result.
- No analytics, no crash reporters, no phone-home.

---

## 8. Non-Functional Requirements

- **Performance:** Enforce the latency budgets above; bundle size goal < 400 kB gzipped for the core SPA (extensions separate).
- **Accessibility:** WCAG 2.1 AA — keyboard navigation, focus management, sufficient contrast, screen-reader labels.
- **Responsive:** Mobile and desktop layouts; search-engine-style page works on both.
- **Dark / light mode:** System preference + manual toggle; persisted in settings.
- **Testing:** Unit tests for crypto, vector, BM25, storage, search router, sync, and critical UI components. Coverage target ≥ 80 % on core modules.
- **CI/CD:** Automated build, type-check, unit tests, dependency vulnerability scan (e.g. npm audit / Snyk / GitHub Dependabot), no secrets in repo.
- **Logging:** Structured local-only logs (IndexedDB or console in dev); never transmitted.
- **Code quality:** Modular packages under `src/lib/`, strict TypeScript, no any, clear public APIs for each module.

---

## 9. Constraints & Invariants

- No Gemini, no remote LLMs, no server-side processing of user content.
- Master passphrase never written to disk or network.
- All future features must remain local-first; any optional network path must be explicitly user-triggered and anonymous.
- IndexedDB is the only persistent store for vault data.

---

## 10. Open Technical Questions
- Final choice of PDF and OCR libraries and their WASM size impact.
- Exact Manifest V3 / WebExtension permission set that satisfies all three browser families while staying minimal.
- Whether to keep the current 64-dim custom embedding or introduce a small local ONNX model in a later phase (still on-device).
