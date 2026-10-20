# Veritas — Safari Web Extension

Safari requires packaging through Xcode (Safari Web Extension App).

1. Install Xcode on macOS.
2. File → New → Project → Safari Extension App.
3. Adapt `extension/chromium` sources with the `browser.*` API.
4. Set SPA origin to your Veritas URL.
5. Prefer OpenSearch from the SPA when extension packaging is blocked.

The extension only opens `{origin}/?q={query}`. It does not access vault data.
