/**
 * Veritas Chromium service worker (MV3)
 * Hand-off only: omnibox / action → SPA with ?q=
 */

const DEFAULT_ORIGIN = 'http://localhost:3000';
const STORAGE_KEY = 'veritas_spa_origin';

async function getSpaOrigin() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const origin = data[STORAGE_KEY];
    if (origin && typeof origin === 'string' && origin.startsWith('http')) {
      return origin.replace(/\/$/, '');
    }
  } catch {}
  return DEFAULT_ORIGIN;
}

function searchUrl(origin, query) {
  const q = encodeURIComponent((query || '').trim());
  return `${origin}/?q=${q}`;
}

async function openSearch(query, disposition) {
  const origin = await getSpaOrigin();
  const url = searchUrl(origin, query);
  if (disposition === 'currentTab') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id != null) {
      await chrome.tabs.update(tab.id, { url });
      return;
    }
  }
  await chrome.tabs.create({ url });
}

chrome.omnibox.setDefaultSuggestion({
  description: 'Search your local Veritas index (then anonymous web if enabled)',
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const t = (text || '').trim();
  if (!t) {
    suggest([]);
    return;
  }
  suggest([
    {
      content: t,
      description: `<match>${escapeXml(t)}</match> — local Veritas index first`,
    },
  ]);
});

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  openSearch(text, disposition === 'currentTab' ? 'currentTab' : 'newForegroundTab');
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(STORAGE_KEY, data => {
    if (!data[STORAGE_KEY]) {
      chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_ORIGIN });
    }
  });
});

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
