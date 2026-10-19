# App Flow
## Project: Veritas — Private Local-First Semantic Search Engine
**Version:** 3.0.0  

---

## 1. High-Level User Journeys

### 1.1 First Launch / Empty Vault
1. User opens Veritas SPA (or lands via extension).
2. Passphrase modal appears (create new or unlock existing).
3. After unlock → empty search-engine page (large centred search bar, subtle prompts, theme toggle).
4. User is guided to “Add documents” (Vault view) or can start typing queries (local answers still work).

### 1.2 Unlock Existing Vault
1. App opens → detects existing IndexedDB → shows passphrase modal.
2. Correct passphrase → derive key → unlock → restore last view or search page.
3. Incorrect → clear error, stay locked. No lockout counter in MVP (rate-limit later if needed).

### 1.3 Search from Browser Omnibox / Default Search
1. User types in browser address bar (Veritas set as default or keyword `v`).
2. Extension intercepts → opens / focuses Veritas with `?q=…` (or posts message to SPA).
3. SPA auto-executes the query against local index first.
4. Results (and optional extractive answer) appear on the search-engine page.
5. If local confidence low and web fallback enabled → anonymous external fetch + local re-rank → additional web results section.

### 1.4 In-App Search (Search Engine Page)
1. Large search input focused by default.
2. User types natural language or keywords.
3. Live or submit-triggered hybrid search.
4. Results list: title, snippet with highlights, score, source (local / web), citation controls.
5. Optional “Conversational” mode: follow-up questions refine or expand the previous context (session memory or encrypted history).
6. Instant-answer widgets (time, storage, calculator, system info) appear above results when pattern-matched.

### 1.5 Document Ingestion
1. User opens Vault view.
2. Drag-and-drop files / folders or file picker.
3. Supported types processed:
   - Text / MD / JSON / CSV / code → direct.
   - PDF → client-side text extraction per page / chunk.
   - Image → OCR + metadata.
4. Chunking with overlap → vector generation → AES-256-GCM encrypt → write to IndexedDB.
5. Progress UI; audit log entry created.
6. User can tag, rename, or purge individual documents.

### 1.6 Sync / Portability
1. Owner opens Sync / Browser view.
2. Export → encrypt full vault → download `.veritas.enc`.
3. On another device: Import → unlock with same passphrase → vector-clock merge → conflict report if any.
4. OpenSearch / extension install instructions also live here.

### 1.7 Audit & Roles
1. Owner switches role (Owner / Auditor / Guest) via header control.
2. Auditor can only open Audit view and run chain verification.
3. Guest can search but cannot ingest, export, or change settings.
4. Every sensitive action appends a linked audit record.

### 1.8 Lock / Session End
1. User clicks Lock (or idle timeout if enabled).
2. CryptoKey discarded from memory.
3. UI returns to locked state; IndexedDB remains encrypted.

---

## 2. Screen Inventory

| Screen / View | Primary Purpose | Key Elements |
|---------------|-----------------|--------------|
| **Search** (default) | Search-engine experience | Large search bar, results list, citations, instant-answer cards, mode toggles (hybrid / semantic / keyword) |
| **Vault** | Document management | Drop zone, file list, tags, status, purge |
| **Sync & Browser** | Portability + extension setup | Export / import, OpenSearch link, extension install cards per browser/OS |
| **Audit** | Security verification | Chain timeline, verify button, role indicator |
| **Docs / Help** | In-app documentation | Architecture, privacy guarantees, keyboard shortcuts |
| **Passphrase Modal** | Unlock / create vault | Passphrase input, strength hint, confirm |
| **Settings (inline or drawer)** | Preferences | Theme, confidence threshold, α / RRF weights, web-fallback toggle |

Navigation is a minimal header (logo, role badge, lock, theme, view switcher). No heavy sidebars.

---

## 3. Key State Machines

### Vault Lock State
```
Locked ──(correct passphrase)──► Unlocked
Unlocked ──(lock / timeout)──► Locked
```

### Query Execution
```
Idle → Parsing → Local Hybrid Search → Ranked Results
                ↘ (low confidence + fallback on) → Anonymous Web Fetch → Local Re-rank → Merged Results
```

### Ingestion Pipeline
```
File Selected → Type Detect → Extract (text / PDF / OCR) → Chunk → Embed → Encrypt → Persist → Audit
```

---

## 4. Error & Edge Flows
- Wrong passphrase → clear message, stay locked.
- Unsupported file → skip with toast, continue batch.
- Network unavailable during web fallback → show local-only results + offline notice.
- Corrupt audit chain → verification fails loudly; user can still search but is warned.
- Storage quota exceeded → block new ingestion with clear recovery path (export / purge).

---

## 5. Accessibility & Keyboard
- Search bar is the default focus.
- Full keyboard navigation for results, vault list, and modal.
- Escape closes modals; Enter submits search.
- Screen-reader live regions for result counts and verification status.
