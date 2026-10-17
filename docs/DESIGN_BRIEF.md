# Design Brief & Frontend Constitution
## Project: Veritas Sovereign Search Engine
**Document Version:** 2.4.0  
**Design Philosophy:** Minimalist Sovereign Utility / Anti-AI Slop Discipline  

---

## 1. Aesthetic Direction & Core Principles

### 1.1 The Anti-AI Slop Mandate
Generic AI-generated interfaces are plagued by purple neon gradients, rounded floating pill badges, fake execution scorecards ("94% INNOVATION SCORE"), decorative pulsing status lights, and crowded card-within-card sandwiches. 

Veritas rejects this entirely. The design philosophy of Veritas is rooted in **Swiss International Style, modern terminal rigor, and quiet editorial restraint**:
- High-contrast, monochromatic neutral backgrounds (`neutral-950` canvas).
- Clean hairline borders (`border-neutral-800`).
- Unboxed typography with understated separators (`·`).
- Monospace numerical precision (`JetBrains Mono` with `tabular-nums`).
- Zero decorative fake widgets; every pixel serves a functional purpose.

### 1.2 The 60-30-10 Color Architecture
- **60% Dominant Neutral Canvas:** Pure deep obsidian (`#0a0a0a` / `neutral-950`). Provides maximum visual comfort for extended search sessions.
- **30% Structural Surfaces & Typography:** Elevated dark slate panels (`neutral-900`), hairline dividers (`neutral-800`), muted metadata text (`neutral-400`), and crisp high-contrast body text (`neutral-100`).
- **10% High-Intent Accents:**
  - Crisp monochromatic White/Black CTAs (`bg-neutral-100 text-neutral-900`).
  - Strict semantic data markers:
    - Emerald (`#34d399`): AES-256 encrypted verification, 100% local operation, test pass.
    - Blue (`#60a5fa`): Anonymous web fallback notice.
    - Amber (`#fbbf24`): Conversational synthesis indicator.
    - Crimson (`#f87171`): Cryptographic hash mismatch, audit alert, destructive wipe.

---

## 2. Zero-Pill & Metadata Discipline

### 2.1 The Rule Against Static Pill Badges
Informational metadata (categories, timestamps, scores, encryption statuses, token counts) must NEVER be enclosed inside rounded capsule borders or colored pill boxes. 

```tsx
// ❌ REJECTED (AI Slop Clutter):
<div className="flex gap-2">
  <span className="bg-purple-900 border border-purple-500 rounded-full px-2 py-0.5 text-xs">Medical</span>
  <span className="bg-emerald-900 text-emerald-300 rounded-full px-2 py-0.5 text-xs">92% Match</span>
</div>

// ✅ ADOPTED (Veritas Sovereign Clean Typography):
<div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
  <span className="uppercase font-semibold text-neutral-300">Medical</span>
  <span aria-hidden="true" className="text-neutral-600">·</span>
  <span className="text-emerald-400 flex items-center gap-1">
    <Lock className="w-2.5 h-2.5" />
    AES-256-GCM Encrypted
  </span>
  <span aria-hidden="true" className="text-neutral-600">·</span>
  <span>Match Score: <strong className="text-neutral-200 tabular-nums">92%</strong></span>
</div>
```

### 2.2 Interactive Filter Controls vs Static Metadata
Interactive filter buttons (e.g. `Hybrid Semantic`, `Semantic Vector`, `Exact BM25`, `Conversational Q&A`) are functional `<button>` elements styled within a segmented container (`bg-neutral-900 border border-neutral-800 rounded-lg p-1`), providing clear active/inactive visual feedback.

---

## 3. Typographic Hierarchy & The 2+1 Font System

Veritas enforces a strict dual-font pairing plus one monospace specialist:

1. **Display & Header Face: Plus Jakarta Sans**
   - Clean, geometric neo-grotesque sans with refined proportions and open counters.
   - Weights: Regular 400, Medium 500, SemiBold 600, Bold 700.
   - Application: Brand mark, section headlines, card titles, interactive modal headers.
   - Restraint: `text-wrap: balance` applied to display headlines to prevent lonely orphan words.

2. **Body & Prose Face: Plus Jakarta Sans / System Fallback**
   - Optimized for scannability at 12px–15px with generous line height (1.5–1.7).
   - Application: Search result snippets, document body previews, technical documentation prose.

3. **Data, Metrics & Cryptographic Outlier: JetBrains Mono**
   - Monospace font with tabular numerals (`tabular-nums`).
   - Application: Microsecond latency readouts (`0.8ms`), SHA-256 hashes, vector dimension values, token counts, timestamps.

---

## 4. Top Bar Contract & Viewport Integrity

### 4.1 Strict 3-Zone Contract
```
[Zone 1: Brand Wordmark]  ----  [Zone 2: 5 Concise Nav Links]  ----  [Zone 3: 1 Primary Action]
```
- **Zone 1:** Single text element wordmark: `Veritas Sovereign` with a minimal `∇` monogram.
- **Zone 2:** Concise, single-line navigation links with subtle hover underlines:
  - `Search`
  - `Vault`
  - `Browser & Sync`
  - `Audit & RBAC`
  - `Architecture & Specs`
- **Zone 3:** Exactly one primary status and action: `Vault Unlocked` / `Unlock Vault` button accompanied by unboxed `100% Local` status indicator.

### 4.2 Single-Elevation Spatial Layout
- No nested cards inside larger bordered cards.
- High-density tabular layouts with subtle 1px border dividers (`border-neutral-800`).
- Global keyboard shortcut `/` or `Cmd+K` focuses the primary search input from anywhere in the app.
