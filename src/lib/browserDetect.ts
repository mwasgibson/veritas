/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BrowserKind =
  | 'chrome'
  | 'edge'
  | 'brave'
  | 'firefox'
  | 'safari'
  | 'arc'
  | 'opera'
  | 'unknown';

export type OsKind = 'macos' | 'windows' | 'linux' | 'ios' | 'android' | 'unknown';

export interface ClientEnvironment {
  browser: BrowserKind;
  os: OsKind;
  extensionFolder: 'chromium' | 'firefox' | 'safari' | null;
  installSteps: string[];
  omniboxKeyword: string | null;
  supportsOpenSearch: boolean;
}

export function detectClientEnvironment(
  ua = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  vendor = typeof navigator !== 'undefined' ? navigator.vendor : ''
): ClientEnvironment {
  const u = ua.toLowerCase();
  const os = detectOs(u);
  const browser = detectBrowser(u, vendor.toLowerCase());
  const omniboxKeyword = browser === 'safari' || browser === 'unknown' ? null : 'v';

  let extensionFolder: ClientEnvironment['extensionFolder'] = null;
  let installSteps: string[] = [];
  let supportsOpenSearch = true;

  switch (browser) {
    case 'chrome':
    case 'edge':
    case 'brave':
    case 'arc':
    case 'opera':
      extensionFolder = 'chromium';
      installSteps = [
        'Open chrome://extensions (or edge://extensions / brave://extensions).',
        'Enable Developer mode.',
        'Load unpacked → select the extension/chromium folder from this repo.',
        'Pin Veritas. Type v then Space in the address bar to search.',
        'Optional: set the SPA origin in the extension popup (default http://localhost:3000).',
      ];
      break;
    case 'firefox':
      extensionFolder = 'firefox';
      installSteps = [
        'Open about:debugging#/runtime/this-firefox.',
        'Load Temporary Add-on → choose extension/firefox/manifest.json.',
        'Type v then Space in the address bar to search.',
        'Note: temporary add-ons unload when Firefox restarts.',
      ];
      break;
    case 'safari':
      extensionFolder = 'safari';
      supportsOpenSearch = true;
      installSteps = [
        'Safari needs a Web Extension packaged via Xcode (see extension/safari/README.md).',
        'Meanwhile: open Veritas and add it as a search engine via OpenSearch if offered.',
        'Or bookmark the SPA and search with ?q= in the URL.',
      ];
      break;
    default:
      installSteps = [
        'Use OpenSearch: open Veritas in the browser and add it as a search engine if available.',
        'Or open http://localhost:3000/?q=your+query after running npm run dev.',
      ];
  }

  if (os === 'ios' || os === 'android') {
    installSteps = [
      'Mobile browsers rarely support custom omnibox extensions.',
      'Open the Veritas SPA in the mobile browser and search there, or add to home screen.',
      'Use encrypted export/import under Sync to move an index between devices.',
    ];
    extensionFolder = null;
  }

  return {
    browser,
    os,
    extensionFolder,
    installSteps,
    omniboxKeyword,
    supportsOpenSearch,
  };
}

function detectOs(u: string): OsKind {
  if (/iphone|ipad|ipod/.test(u)) return 'ios';
  if (/android/.test(u)) return 'android';
  if (/mac os x|macintosh/.test(u)) return 'macos';
  if (/windows/.test(u)) return 'windows';
  if (/linux|cros/.test(u)) return 'linux';
  return 'unknown';
}

function detectBrowser(u: string, vendor: string): BrowserKind {
  if (/edg\//.test(u)) return 'edge';
  if (/brave/i.test(u) || (typeof navigator !== 'undefined' && (navigator as { brave?: unknown }).brave)) {
    return 'brave';
  }
  if (/firefox|fxios/.test(u)) return 'firefox';
  if (/safari/.test(u) && /apple/.test(vendor) && !/chrome|crios|chromium/.test(u)) {
    return 'safari';
  }
  if (/opr\/|opera/.test(u)) return 'opera';
  if (/chrome|crios|chromium/.test(u)) return 'chrome';
  return 'unknown';
}
