(function () {
  var STORAGE_KEY = 'veritas_spa_origin';
  var DEFAULT_ORIGIN = 'http://localhost:3000';
  var originInput = document.getElementById('origin');
  var statusEl = document.getElementById('status');

  function setStatus(msg, isErr) {
    statusEl.textContent = msg || '';
    statusEl.className = isErr ? 'err' : '';
  }

  chrome.storage.local.get([STORAGE_KEY], function (data) {
    originInput.value = data[STORAGE_KEY] || DEFAULT_ORIGIN;
  });

  document.getElementById('save').addEventListener('click', function () {
    var origin = (originInput.value || '').trim().replace(/\/$/, '');
    if (!/^https?:\/\//i.test(origin)) {
      setStatus('Must start with http:// or https://', true);
      return;
    }
    chrome.storage.local.set({ veritas_spa_origin: origin }, function () {
      if (chrome.runtime.lastError) {
        setStatus(chrome.runtime.lastError.message, true);
        return;
      }
      setStatus('Saved. Omnibox will use this origin.');
    });
  });

  document.getElementById('open').addEventListener('click', function () {
    var origin = (originInput.value || DEFAULT_ORIGIN).trim().replace(/\/$/, '');
    chrome.tabs.create({ url: origin });
  });

  originInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('save').click();
  });
})();
