const DEFAULT_ORIGIN = 'http://localhost:3000';
const STORAGE_KEY = 'veritas_spa_origin';
const api = typeof browser !== 'undefined' ? browser : chrome;

function getSpaOrigin() {
  return api.storage.local.get(STORAGE_KEY).then(function (data) {
    var origin = data[STORAGE_KEY];
    if (typeof origin === 'string' && /^https?:\/\//i.test(origin)) {
      return origin.replace(/\/$/, '');
    }
    return DEFAULT_ORIGIN;
  }).catch(function () {
    return DEFAULT_ORIGIN;
  });
}

function buildSearchUrl(origin, query) {
  return origin + '/?q=' + encodeURIComponent(String(query || '').trim());
}

function openSearch(query, inCurrentTab) {
  return getSpaOrigin().then(function (origin) {
    var url = buildSearchUrl(origin, query);
    if (inCurrentTab) {
      return api.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
        if (tabs[0] && tabs[0].id != null) {
          return api.tabs.update(tabs[0].id, { url: url });
        }
        return api.tabs.create({ url: url });
      });
    }
    return api.tabs.create({ url: url });
  });
}

try {
  api.omnibox.setDefaultSuggestion({
    description: 'Search Veritas local index: %s',
  });
} catch (e) {}

api.omnibox.onInputChanged.addListener(function (text, suggest) {
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

api.omnibox.onInputEntered.addListener(function (text, disposition) {
  openSearch(text, disposition === 'currentTab');
});

api.runtime.onInstalled.addListener(function () {
  api.storage.local.get(STORAGE_KEY).then(function (data) {
    if (!data[STORAGE_KEY]) {
      return api.storage.local.set({ veritas_spa_origin: DEFAULT_ORIGIN });
    }
  });
});
