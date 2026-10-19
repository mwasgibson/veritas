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
- [x] Dark/light mode polish (dark-first minimal chrome)
- [x] Accessibility basics (focus, aria-label, keyboard)
- [ ] Confirm SearchView.tsx on GitHub main

## Phase 3–9
- See docs/06-implementation-plan.md
