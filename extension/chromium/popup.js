const STORAGE_KEY = 'veritas_spa_origin';
const DEFAULT_ORIGIN = 'http://localhost:3000';
const originInput = document.getElementById('origin');
const statusEl = document.getElementById('status');
chrome.storage.local.get(STORAGE_KEY, data => {
  originInput.value = data[STORAGE_KEY] || DEFAULT_ORIGIN;
});
document.getElementById('save').addEventListener('click', () => {
  let origin = (originInput.value || '').trim().replace(/\/$/, '');
  if (!origin.startsWith('http')) {
    statusEl.textContent = 'URL must start with http:// or https://';
    return;
  }
  chrome.storage.local.set({ [STORAGE_KEY]: origin }, () => {
    statusEl.textContent = 'Saved';
  });
});
document.getElementById('open').addEventListener('click', () => {
  const origin = (originInput.value || DEFAULT_ORIGIN).replace(/\/$/, '');
  chrome.tabs.create({ url: origin });
});
