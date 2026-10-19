# Design Brief
## Project: Veritas — Private Local-First Semantic Search Engine
**Version:** 3.0.0  
**Direction:** Clean, minimalist search-engine page. High performance, zero AI-slop aesthetics.

---

## 1. Visual North Star

Veritas should feel like a private, refined version of a classic search engine homepage — not a dashboard, not a chat app, not a “productivity suite”.

- Dominant element: a large, centred search input.
- Results appear cleanly below with clear hierarchy and citations.
- Instant-answer cards (time, storage, calculator…) sit above the organic results when relevant.
- Chrome is minimal: thin header, almost no chrome on the search page itself.
- Dark mode is first-class; light mode is equally polished.

Inspiration (mood only): classic Google/Bing homepage restraint + modern privacy tools (no skeuomorphism, no gradients for decoration, no cartoon illustrations).

---

## 2. Layout Principles

1. **Search page is the product.** Everything else is secondary.
2. **One primary action per view.** Search, ingest, export, or verify — never competing CTAs.
3. **Information density is earned.** Results and citations are dense but scannable; empty states are calm.
4. **No decorative AI aesthetics.** No glowing orbs, no “thinking” animations that imply remote models, no generative noise.
5. **Performance is visible.** Instant local answers feel snappy; progress indicators only for truly async work (PDF/OCR).

---

## 3. Colour & Typography

- **Neutral base** with a single restrained accent (deep blue or cool slate) for focus rings and primary actions.
- Dark theme: near-black backgrounds, high-contrast text, subtle borders.
- Light theme: off-white / cool grey backgrounds, strong text contrast.
- System font stack or a single high-quality sans (Inter / system-ui) for speed and clarity.
- Monospace only for hashes, audit IDs, and code snippets.

Contrast must meet WCAG 2.1 AA in both themes.

---

## 4. Component Inventory

| Component | Notes |
|-----------|-------|
| SearchBar | Large, focused by default, subtle placeholder (“Search your private index…”), clear button, optional mode chips |
| ResultCard | Title, highlighted snippet, source badge (Local / Web), score or relative rank, citation affordance |
| InstantAnswerCard | Compact, high-signal, dismissible or auto-hide on new query |
| Header | Logo wordmark, role indicator, lock, theme toggle, view switcher (Search / Vault / Sync / Audit) |
| PassphraseModal | Centre modal, strong focus management, no password managers interference if possible |
| DropZone | Large, calm, clear file-type hints |
| AuditTimeline | Chronological, hash-linked entries, verify CTA |
| ExtensionInstallCard | Per-browser / OS cards with copyable instructions or direct links |
| Toast / InlineError | Non-blocking, local-only |

All interactive elements have visible focus states and adequate hit targets.

---

## 5. Motion & Feedback

- Prefer instant or near-instant transitions.
- Subtle opacity / translate for result appearance; no long spring animations.
- Loading states only for PDF extraction, OCR, or web fallback.
- Never show a “thinking…” state that implies a remote model.

---

## 6. Responsive Behaviour

- Desktop: classic centred search column (max-width ~720–800 px for results).
- Tablet / mobile: full-width search bar, stacked results, collapsible header actions.
- Extension popup (if used) stays extremely compact — primarily a launcher into the full SPA.

---

## 7. Accessibility Checklist
- Semantic HTML and ARIA where needed.
- Keyboard-only operable.
- Focus trap in modals.
- Live regions for dynamic result counts and verification outcomes.
- Reduced-motion preference respected.
- Colour is never the only signal (icons + text for source, status, role).

---

## 8. Brand Voice (UI copy)
- Direct, calm, precise.
- Prefer “Your private index” over marketing language.
- Errors explain what happened and what the user can do next.
- No hype about “AI” — emphasise privacy, locality, and control.

---

## 9. Anti-Patterns (explicitly forbidden)
- AI-generated illustrations or stock “neural network” imagery.
- Heavy glassmorphism or decorative gradients.
- Persistent sidebars that compete with the search bar.
- Telemetry consent banners (there is none).
- Fake progress or “model loading” theatre.
