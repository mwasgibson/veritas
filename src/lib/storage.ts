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

        // Documents Store
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'id' });
        }

        // Vectors Store
        if (!db.objectStoreNames.contains('vectors')) {
          const vectorStore = db.createObjectStore('vectors', { autoIncrement: true });
          vectorStore.createIndex('docId', 'docId', { unique: false });
        }

        // Audit Logs Store
        if (!db.objectStoreNames.contains('audit_logs')) {
          const auditStore = db.createObjectStore('audit_logs', { keyPath: 'id' });
          auditStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Settings Store
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

  /**
   * Record a tamper-evident audit log entry
   */
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

  /**
   * Save a document, chunk it, generate vector embeddings, and encrypt if masterKey is supplied
   */
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

    // Privacy invariant: once a vault key exists, plaintext must never be written to IndexedDB.
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
      content: '', // never store plaintext when encrypted
      encryptedContent: encryptedPayload,
      tags,
      createdAt: now,
      updatedAt: now,
      tokensCount,
      filePath: doc.filePath,
      fileSize: doc.fileSize,
      fileExtension: doc.fileExtension,
    };

    // Chunk + embed with redacted snippets (privacy)
    const chunks = chunkDocument(id, doc.content, { redactSnippets: true });

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const tx = this.db.transaction(['documents', 'vectors'], 'readwrite');
      const docStore = tx.objectStore('documents');
      const vectorStore = tx.objectStore('vectors');

      // Clear old vectors for this doc if re-indexing
      const index = vectorStore.index('docId');
      const clearReq = index.openCursor(IDBKeyRange.only(id));
      clearReq.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      docStore.put(documentItem);

      for (const chunk of chunks) {
        vectorStore.add(chunk);
      }

      tx.oncomplete = async () => {
        await this.recordAudit('ingest', actorRole, `Document ${id}: ${doc.title}`);
        resolve(documentItem);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async getDocument(id: string, masterKey?: CryptoKey | null): Promise<DocumentItem | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const tx = this.db.transaction('documents', 'readonly');
      const store = tx.objectStore('documents');
      const req = store.get(id);
      req.onsuccess = async () => {
        const item = req.result as DocumentItem | undefined;
        if (!item) return resolve(null);
        if (item.encryptedContent && masterKey) {
          try {
            item.content = await decryptText(item.encryptedContent, masterKey);
          } catch {
            item.content = '[decryption failed]';
          }
        }
        resolve(item);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getAllDocuments(masterKey?: CryptoKey | null): Promise<DocumentItem[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const tx = this.db.transaction('documents', 'readonly');
      const store = tx.objectStore('documents');
      const req = store.getAll();
      req.onsuccess = async () => {
        const items = (req.result as DocumentItem[]) || [];
        if (masterKey) {
          for (const item of items) {
            if (item.encryptedContent) {
              try {
                item.content = await decryptText(item.encryptedContent, masterKey);
              } catch {
                item.content = '[decryption failed]';
              }
            }
          }
        }
        resolve(items);
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
      req.onsuccess = () => resolve((req.result as VectorChunk[]) || []);
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
      const clearReq = index.openCursor(IDBKeyRange.only(id));
      clearReq.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = async () => {
        await this.recordAudit('delete', actorRole, `Document ${id}`);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAll(actorRole: UserRole = 'owner'): Promise<void> {
    assertCanWrite(actorRole, 'clear vault');
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const tx = this.db.transaction(['documents', 'vectors', 'audit_logs'], 'readwrite');
      tx.objectStore('documents').clear();
      tx.objectStore('vectors').clear();
      // Keep audit trail
      tx.oncomplete = async () => {
        await this.recordAudit('purge', actorRole, 'Cleared all documents and vectors');
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const tx = this.db.transaction('audit_logs', 'readonly');
      const store = tx.objectStore('audit_logs');
      const req = store.getAll();
      req.onsuccess = () => {
        const logs = (req.result as AuditLogEntry[]) || [];
        logs.sort((a, b) => a.timestamp - b.timestamp);
        resolve(logs);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getSetting<T = unknown>(key: string): Promise<T | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const tx = this.db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? (req.result as { key: string; value: T }).value : null);
      req.onerror = () => reject(req.error);
    });
  }

  async setSetting(key: string, value: unknown, actorRole: UserRole = 'owner'): Promise<void> {
    assertCanAdmin(actorRole, 'change settings');
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
