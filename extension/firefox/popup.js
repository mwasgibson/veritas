(function () {
  var api = typeof browser !== 'undefined' ? browser : chrome;
  var STORAGE_KEY = 'veritas_spa_origin';
  var DEFAULT_ORIGIN = 'http://localhost:3000';
  var originInput = document.getElementById('origin');
  var statusEl = document.getElementById('status');

  function setStatus(msg, isErr) {
    statusEl.textContent = msg || '';
    statusEl.className = isErr ? 'err' : '';
  }

  api.storage.local.get(STORAGE_KEY).then(function (data) {
    originInput.value = data[STORAGE_KEY] || DEFAULT_ORIGIN;
  });

  document.getElementById('save').addEventListener('click', function () {
    var origin = (originInput.value || '').trim().replace(/\/$/, '');
    if (!/^https?:\/\//i.test(origin)) {
      setStatus('Must start with http:// or https://', true);
      return;
    }
    api.storage.local.set({ veritas_spa_origin: origin }).then(function () {
      setStatus('Saved. Omnibox will use this origin.');
    }).catch(function (e) {
      setStatus(String(e), true);
    });
  });

  document.getElementById('open').addEventListener('click', function () {
    var origin = (originInput.value || DEFAULT_ORIGIN).trim().replace(/\/$/, '');
    api.tabs.create({ url: origin });
  });

  originInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('save').click();
  });
})();
