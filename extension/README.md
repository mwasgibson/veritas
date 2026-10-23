# Veritas browser extension

Route address-bar searches to your local Veritas SPA. **Only the query string** is passed via `/?q=…`.

## Packages

| Folder | Target | Manifest |
| -------- | -------- | ---------- |
| `chromium/` | Chrome, Edge, Brave, Arc | MV3 |
| `firefox/` | Firefox | MV2 (reliable omnibox + temporary load) |
| `safari/` | Safari | Xcode notes only |

## Chromium install

1. Run the app: `npm run dev` → `http://localhost:3000`
2. Open `chrome://extensions` (or `edge://extensions` / `brave://extensions`)
3. Enable **Developer mode**
4. **Load unpacked** → select this folder: `extension/chromium`
5. If the service worker shows an error, click **Reload** on the extension card
6. Click the puzzle icon → Veritas → confirm **App URL** is `http://localhost:3000` → **Save**

### How to search

- **Omnibox:** type `v`, press **Tab** or **Space**, type your query, press Enter
- **Site search:** type `veritas` then Tab, then query (registered via `chrome_settings_overrides`)

### If nothing happens

- Service worker must be active (extensions page → Veritas → “service worker” link should open without errors)
- App must be running on the saved origin
- Omnibox requires the keyword first (`v`), not a plain Google-style search until you add Veritas under chrome://settings/searchEngines

## Firefox install

1. `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on…** → choose `extension/firefox/manifest.json`
3. Type `v` then Space/Tab, query, Enter
4. Temporary add-ons are removed when Firefox restarts

## Privacy

Permissions: `omnibox`, `storage`, `tabs` only. No host access, no telemetry, no vault reads.
