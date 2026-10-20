# Veritas browser extension (Phase 6)

Local-first search interception. **Only the query string** is handed to your Veritas SPA via `/?q=…`. Vault documents and keys stay in the SPA origin.

## Packages

| Folder | Target |
|--------|--------|
| `chromium/` | Chrome, Edge, Brave, Arc (Manifest V3) |
| `firefox/` | Firefox 109+ (Manifest V3) |
| `safari/` | Packaging notes for Safari Web Extension |

## Install — Chromium

1. Run Veritas: `npm run dev` (default `http://localhost:3000`).
2. Open `chrome://extensions` (or `edge://extensions` / Brave equivalents).
3. Enable **Developer mode**.
4. **Load unpacked** → select `extension/chromium`.
5. Pin the extension. Click it and set **Veritas app URL** if not localhost:3000.
6. In the address bar type `v` then **Space**, then your query, then Enter.

## Install — Firefox

1. `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on** → pick `extension/firefox/manifest.json`
3. Same omnibox keyword: `v` + Space + query.

## Privacy

- No telemetry
- No cloud AI
- Permissions: `omnibox`, `storage`, `tabs` only
- No host access to arbitrary sites
