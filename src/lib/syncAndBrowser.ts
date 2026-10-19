/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DocumentItem, SyncPayload, UserRole } from '../types';
import { storageEngine, assertCanWrite } from './storage';
import { encryptText, decryptText, computeSha256 } from './crypto';

/**
 * Generate complete Browser Extension (Manifest v3) files
 */
export function generateExtensionFiles() {
  const manifest = {
    manifest_version: 3,
    name: 'Veritas Private Search Interceptor',
    version: '1.0.0',
    description: 'Intercepts browser address bar queries and prioritizes local private semantic indexing before anonymous web fallback.',
    permissions: ['omnibox', 'storage'],
    background: {
      service_worker: 'background.js',
    },
    omnibox: {
      keyword: 'v',
    },
    action: {
      default_title: 'Veritas Local Engine',
    },
  };

  const backgroundJs = `
chrome.omnibox.onInputEntered.addListener((text) => {
  const url = chrome.runtime.getURL('index.html') + '?q=' + encodeURIComponent(text);
  chrome.tabs.create({ url });
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});
`;

  return { manifest, backgroundJs };
}

/**
 * Export complete encrypted sync payload for offline cross-platform sync
 */
export async function exportEncryptedSyncBundle(
  masterKey: CryptoKey,
  actorRole: UserRole = 'owner'
): Promise<string> {
  assertCanWrite(actorRole, 'export sync bundle');
  const docs = await storageEngine.getAllDocuments(masterKey);
  const audit = await storageEngine.getAuditLogs();

  const rawBundle = {
    exportedAt: Date.now(),
    version: '1.0.0',
    documents: docs,
    auditLogs: audit,
  };

  const jsonString = JSON.stringify(rawBundle);
  const encrypted = await encryptText(jsonString, masterKey);
  const checksum = await computeSha256(encrypted.cipherBuffer);

  const payload: SyncPayload = {
    version: '1.0.0',
    exportedAt: Date.now(),
    encryptedBlob: JSON.stringify(encrypted),
    checksum,
    deviceFingerprint: `device_${Math.random().toString(36).substring(2, 8)}`,
  };

  await storageEngine.recordAudit(
    'EXPORT',
    actorRole,
    `Exported encrypted sync payload with ${docs.length} documents (SHA-256: ${checksum.slice(0, 8)}...)`
  );

  return JSON.stringify(payload, null, 2);
}

/**
 * Import and merge an encrypted sync payload
 */
export async function importEncryptedSyncBundle(
  bundleJson: string,
  masterKey: CryptoKey,
  actorRole: UserRole = 'owner'
): Promise<{ importedCount: number; status: string }> {
  assertCanWrite(actorRole, 'import sync bundle');
  const payload: SyncPayload = JSON.parse(bundleJson);

  const encryptedData = JSON.parse(payload.encryptedBlob);
  const expectedChecksum = await computeSha256(encryptedData.cipherBuffer);
  if (expectedChecksum !== payload.checksum) {
    throw new Error('Sync bundle checksum mismatch. File may be corrupted or modified in transit.');
  }

  const decryptedJson = await decryptText(encryptedData, masterKey);
  const bundle = JSON.parse(decryptedJson);

  const incomingDocs: DocumentItem[] = bundle.documents || [];
  let importedCount = 0;

  for (const doc of incomingDocs) {
    await storageEngine.saveDocument(
      {
        id: doc.id,
        title: doc.title,
        category: doc.category,
        content: doc.content,
        tags: doc.tags,
      },
      masterKey,
      actorRole
    );
    importedCount++;
  }

  await storageEngine.recordAudit(
    'SYNC',
    actorRole,
    `Successfully merged ${importedCount} documents from encrypted sync payload`
  );

  return {
    importedCount,
    status: 'Merged successfully',
  };
}
