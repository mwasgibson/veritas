const DEFAULT_ORIGIN = 'http://localhost:3000';
const STORAGE_KEY = 'veritas_spa_origin';

async function getSpaOrigin() {
  try {
    const data = await chrome.storage.local.get([STORAGE_KEY]);
    const origin = data[STORAGE_KEY];
    if (typeof origin === 'string' && /^https?:\/\//i.test(origin)) {
      return origin.replace(/\/$/, '');
    }
  } catch (e) {
    console.warn('Veritas: storage read failed', e);
  }
  return DEFAULT_ORIGIN;
}

function buildSearchUrl(origin, query) {
  return origin + '/?q=' + encodeURIComponent(String(query || '').trim());
}

async function openSearch(query, inCurrentTab) {
  const origin = await getSpaOrigin();
  const url = buildSearchUrl(origin, query);
  try {
    if (inCurrentTab) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && tabs[0].id != null) {
        await chrome.tabs.update(tabs[0].id, { url: url });
        return;
      }
    }
    await chrome.tabs.create({ url: url });
  } catch (e) {
    console.error('Veritas: openSearch failed', e);
    await chrome.tabs.create({ url: url });
  }
}

try {
  chrome.omnibox.setDefaultSuggestion({
    description: 'Search Veritas local index: %s',
  });
} catch (e) {
  console.warn('Veritas: setDefaultSuggestion', e);
}

chrome.omnibox.onInputChanged.addListener(function (text, suggest) {
  var t = String(text || '').trim();
  if (!t) {
    suggest([]);
    return;
  }
  suggest([
    {
      content: t,
      description: 'Search local index for "' + t.replace(/"/g, '') + '"',
    },
  ]);
});

chrome.omnibox.onInputEntered.addListener(function (text, disposition) {
  openSearch(text, disposition === 'currentTab');
});

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.get([STORAGE_KEY], function (data) {
    if (!data[STORAGE_KEY]) {
      chrome.storage.local.set({ veritas_spa_origin: DEFAULT_ORIGIN });
    }
  });
});
