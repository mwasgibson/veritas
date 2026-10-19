/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DocumentItem, VectorChunk, AuditLogEntry, UserRole } from '../types';
import { computeSha256, encryptText, decryptText } from './crypto';
import { chunkDocument } from './semanticEngine';

const DB_NAME = 'Veritas_Private_Storage_v1';
const DB_VERSION = 1;

/** Roles that may mutate vault content (ingest, purge, sync). */
const WRITE_ROLES: UserRole[] = ['owner'];
/** Roles that may change settings or re-key. */
const ADMIN_ROLES: UserRole[] = ['owner'];

/**
 * Enforce RBAC at the storage boundary. UI checks are not sufficient.
 */
export function assertCanWrite(role: UserRole, action = 'write'): void {
  if (!WRITE_ROLES.includes(role)) {
    throw new Error(`RBAC: role "${role}" is not permitted to ${action}`);
  }
}

export function assertCanAdmin(role: UserRole, action = 'admin'): void {
  if (!ADMIN_ROLES.includes(role)) {
    throw new Error(`RBAC: role "${role}" is not permitted to ${action}`);
  }
}

/**
 * Native IndexedDB Wrapper for Veritas Sovereign Engine
 */
export class StorageEngine {
  private db: IDBDatabase | null = null;
  private lastAuditHash = '0000000000000000000000000000000000000000000000000000000000000000';

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('vectors')) {
          const vectorStore = db.createObjectStore('vectors', { autoIncrement: true });
          vectorStore.createIndex('docId', 'docId', { unique: false });
        }

        if (!db.objectStoreNames.contains('audit_logs')) {
          const auditStore = db.createObjectStore('audit_logs', { keyPath: 'id' });
          auditStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = async () => {
        this.db = request.result;
        await this.loadLastAuditHash();
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private async loadLastAuditHash(): Promise<void> {
    const logs = await this.getAuditLogs();
    if (logs.length > 0) {
      this.lastAuditHash = logs[logs.length - 1].hash;
    }
  }

  async recordAudit(
    action: AuditLogEntry['action'],
    actorRole: UserRole,
    details: string
  ): Promise<AuditLogEntry> {
    await this.init();
    const timestamp = Date.now();
    const id = `audit_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;
    const prevHash = this.lastAuditHash;
    const hash = await computeSha256(`${prevHash}:${action}:${actorRole}:${details}:${timestamp}`);
    this.lastAuditHash = hash;

    const entry: AuditLogEntry = {
      id,
      timestamp,
      action,
      actorRole,
      details,
      hash,
      prevHash,
    };

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const tx = this.db.transaction('audit_logs', 'readwrite');
      const store = tx.objectStore('audit_logs');
      const request = store.add(entry);
      request.onsuccess = () => resolve(entry);
      request.onerror = () => reject(request.error);
    });
  }

  async saveDocument(
    doc: {
      id?: string;
      title: string;
      category: DocumentItem['category'];
      content: string;
      tags?: string[];
      filePath?: string;
      fileSize?: number;
      fileExtension?: string;
    },
    masterKey?: CryptoKey | null,
    actorRole: UserRole = 'owner'
  ): Promise<DocumentItem> {
    assertCanWrite(actorRole, 'ingest documents');
    await this.init();

    if (!masterKey) {
      throw new Error(
        'Vault is locked or no master key is available. Unlock with your passphrase before ingesting.'
      );
    }

    const id = doc.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = Date.now();
    const tags = doc.tags || [];
    const tokensCount = doc.content.split(/\s+/).length;

    const encryptedPayload = await encryptText(doc.content, masterKey);

    const documentItem: DocumentItem = {
      id,
      title: doc.title,
      category: doc.category,
      content: doc.content,
      encryptedPayload,
      tokensCount,
      tags,
      filePath: doc.filePath,
      fileSize: doc.fileSize,
      fileExtension: doc.fileExtension,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    await new Promise<void>((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const tx = this.db.transaction('documents', 'readwrite');
      const store = tx.objectStore('documents');
      const recordToStore = { ...documentItem, content: '' };
      const req = store.put(recordToStore);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    const chunks = chunkDocument(id, doc.content, 300, 50, true);
    await new Promise<void>((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const tx = this.db.transaction('vectors', 'readwrite');
      const store = tx.objectStore('vectors');

      const index = store.index('docId');
      const keyReq = index.getAllKeys(id);
      keyReq.onsuccess = () => {
        for (const k of keyReq.result) {
          store.delete(k);
        }
        for (const chunk of chunks) {
          store.add(chunk);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    await this.recordAudit(
      'INGEST',
      actorRole,
      `Indexed document "${doc.title}" (${tokensCount} tokens, ${chunks.length} vector chunks, encrypted)`
    );

    return documentItem;
  }

  async getAllDocuments(masterKey?: CryptoKey | null): Promise<DocumentItem[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const tx = this.db.transaction('documents', 'readonly');
      const store = tx.objectStore('documents');
      const req = store.getAll();

      req.onsuccess = async () => {
        const rawDocs: DocumentItem[] = req.result || [];
        const decryptedDocs: DocumentItem[] = [];

        for (const doc of rawDocs) {
          if (doc.encryptedPayload && masterKey) {
            try {
              const decryptedContent = await decryptText(doc.encryptedPayload, masterKey);
              decryptedDocs.push({
                ...doc,
                content: decryptedContent,
              });
            } catch {
              decryptedDocs.push(doc);
            }
          } else {
            decryptedDocs.push(doc);
          }
        }
        resolve(decryptedDocs);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getAllVectors(): Promise<VectorChunk[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const tx = this.db.transaction('vectors', 'readonly');
      const store = tx.objectStore('vectors');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteDocument(id: string, actorRole: UserRole = 'owner'): Promise<void> {
    assertCanWrite(actorRole, 'delete documents');
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const tx = this.db.transaction(['documents', 'vectors'], 'readwrite');
      const docStore = tx.objectStore('documents');
      const vectorStore = tx.objectStore('vectors');

      docStore.delete(id);

      const index = vectorStore.index('docId');
      const keyReq = index.getAllKeys(id);
      keyReq.onsuccess = () => {
        for (const k of keyReq.result) {
          vectorStore.delete(k);
        }
      };

      tx.oncomplete = async () => {
        await this.recordAudit('PURGE', actorRole, `Deleted document ID ${id}`);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAll(actorRole: UserRole = 'owner'): Promise<void> {
    assertCanWrite(actorRole, 'wipe vault');
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const tx = this.db.transaction(['documents', 'vectors'], 'readwrite');
      tx.objectStore('documents').clear();
      tx.objectStore('vectors').clear();
      tx.oncomplete = async () => {
        await this.recordAudit('PURGE', actorRole, 'Wiped all documents and vectors from storage vault');
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async purgeLegacyMockData(actorRole: UserRole = 'owner'): Promise<number> {
    assertCanWrite(actorRole, 'purge legacy data');
    await this.init();
    const docs = await this.getAllDocuments(null);
    let purgedCount = 0;

    for (const doc of docs) {
      const isLegacyMock =
        !doc.filePath ||
        doc.id.startsWith('doc_') ||
        doc.title.includes('Financial Statement') ||
        doc.title.includes('Cardiovascular') ||
        doc.title.includes('Lease Agreement') ||
        doc.title.includes('Vacation Itinerary') ||
        doc.title.includes('Distributed Systems') ||
        doc.title.includes('Cryptographic Key Derivation') ||
        doc.title.includes('Unit Test Document Ingestion');

      if (isLegacyMock) {
        await this.deleteDocument(doc.id, actorRole);
        purgedCount++;
      }
    }

    if (typeof indexedDB !== 'undefined' && 'databases' in indexedDB) {
      try {
        const dbs = await indexedDB.databases();
        for (const dbInfo of dbs) {
          if (dbInfo.name && dbInfo.name.startsWith('Aegis_')) {
            indexedDB.deleteDatabase(dbInfo.name);
          }
        }
      } catch {
        // Silently continue
      }
    }

    return purgedCount;
  }

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const tx = this.db.transaction('audit_logs', 'readonly');
      const store = tx.objectStore('audit_logs');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getSetting<T>(key: string): Promise<T | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const tx = this.db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(req.result ? (req.result.value as T) : null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async setSetting(key: string, value: any): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const tx = this.db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const req = store.put({ key, value });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export const storageEngine = new StorageEngine();
