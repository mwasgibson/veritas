const DEFAULT_ORIGIN = 'http://localhost:3000';
const STORAGE_KEY = 'veritas_spa_origin';
const api = typeof browser !== 'undefined' ? browser : chrome;

async function getSpaOrigin() {
  try {
    const data = await api.storage.local.get(STORAGE_KEY);
    const origin = data[STORAGE_KEY];
    if (origin && typeof origin === 'string' && origin.startsWith('http')) {
      return origin.replace(/\/$/, '');
    }
  } catch (_) {}
  return DEFAULT_ORIGIN;
}

function searchUrl(origin, query) {
  return `${origin}/?q=${encodeURIComponent((query || '').trim())}`;
}

async function openSearch(query, disposition) {
  const origin = await getSpaOrigin();
  const url = searchUrl(origin, query);
  if (disposition === 'currentTab') {
    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id != null) {
      await api.tabs.update(tabs[0].id, { url });
      return;
    }
  }
  await api.tabs.create({ url });
}

api.omnibox.setDefaultSuggestion({
  description: 'Search your local Veritas index (then anonymous web if enabled)',
});

api.omnibox.onInputChanged.addListener((text, suggest) => {
  const t = (text || '').trim();
  if (!t) return suggest([]);
  suggest([{ content: t, description: t + ' — local Veritas index first' }]);
});

api.omnibox.onInputEntered.addListener((text, disposition) => {
  openSearch(text, disposition === 'currentTab' ? 'currentTab' : 'newForegroundTab');
});

api.runtime.onInstalled.addListener(() => {
  api.storage.local.get(STORAGE_KEY).then(data => {
    if (!data[STORAGE_KEY]) {
      api.storage.local.set({ [STORAGE_KEY]: DEFAULT_ORIGIN });
    }
  });
});
