/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'owner' | 'auditor' | 'guest';

export interface DocumentItem {
  id: string;
  title: string;
  category: 'finance' | 'medical' | 'legal' | 'notes' | 'code' | 'personal';
  content: string; // Plaintext when decrypted in memory
  encryptedPayload?: EncryptedPayload;
  tokensCount: number;
  tags: string[];
  filePath?: string;
  fileSize?: number;
  fileExtension?: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface ConnectedFolder {
  name: string;
  filesCount: number;
  lastScannedAt: number;
}

export interface EncryptedPayload {
  cipherBuffer: string; // Base64 encoded ciphertext
  iv: string; // Base64 encoded 12-byte IV
  salt: string; // Base64 encoded PBKDF2 salt
  authTag?: string;
}

export interface VectorChunk {
  docId: string;
  chunkIndex: number;
  snippet: string;
  vector: number[]; // 64-dimensional float vector
  keywords: string[];
}

export interface StorageDetails {
  usedBytes: number;
  quotaBytes: number;
  usedFormatted: string;
  quotaFormatted: string;
  freeFormatted: string;
  percentUsed: number;
  persisted: boolean;
  vaultDocsCount: number;
  vaultVectorsCount: number;
  vaultSizeBytes: number;
  vaultSizeFormatted: string;
  connectedFolder?: string | null;
}

export interface SystemDetails {
  os: string;
  browser: string;
  cpuCores: number;
  deviceMemoryGb?: string;
  screenResolution: string;
  pixelRatio: number;
  colorDepth: number;
  isOnline: boolean;
  connectionType?: string;
  storage: StorageDetails;
}

export interface ActivityChangeItem {
  id: string;
  timestamp: number;
  relativeTime: string;
  action: string;
  actorRole: string;
  details: string;
  hashShort: string;
}

export interface ActivityDetails {
  totalEvents: number;
  ingestCount: number;
  queryCount: number;
  purgeCount: number;
  syncCount: number;
  recentChanges: ActivityChangeItem[];
  lastActionSummary?: string;
}

export interface DateCalendarDetails {
  weekday: string;
  formattedDate: string;
  dayOfYear: number;
  totalDaysInYear: number;
  percentOfYear: number;
  weekNumber: number;
  daysRemainingInYear: number;
  isLeapYear: boolean;
  isoString: string;
  unixSeconds: number;
  timeZone: string;
}

export interface InstantWidget {
  type: 'time' | 'date' | 'storage' | 'system' | 'activity' | 'calculator' | 'definition' | 'direct_answer';
  title: string;
  primaryValue: string;
  secondaryValue?: string;
  details?: string;
  source?: string;
  sourceUrl?: string;
  timezone?: string;
  storageData?: StorageDetails;
  systemData?: SystemDetails;
  activityData?: ActivityDetails;
  dateData?: DateCalendarDetails;
}

export interface SearchResultItem {
  docId: string;
  title: string;
  category: string;
  snippet: string;
  highlightWords: string[];
  vectorScore: number; // 0.0 - 1.0
  bm25Score: number; // Normalized 0.0 - 1.0
  hybridScore: number; // Combined ranking score
  latencyMs: number;
  source: 'local' | 'web';
  encrypted: boolean;
  filePath?: string;
  fileExtension?: string;
  sourceUrl?: string;
}

export interface ConversationalAnswer {
  query: string;
  synthesizedAnswer: string;
  citations: {
    docId: string;
    title: string;
    passage: string;
    relevance: number;
  }[];
  confidence: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: 'QUERY' | 'INGEST' | 'DECRYPT' | 'EXPORT' | 'SYNC' | 'KEY_DERIVE' | 'PURGE';
  actorRole: UserRole;
  details: string;
  hash: string;
  prevHash: string;
}

export interface SyncPayload {
  version: string;
  exportedAt: number;
  encryptedBlob: string; // AES-GCM encrypted package of all documents & vectors
  checksum: string;
  deviceFingerprint: string;
}

export interface SearchSettings {
  searchMode: 'hybrid' | 'semantic' | 'exact' | 'conversational';
  hybridWeight: number; // 0.0 (pure BM25) to 1.0 (pure Vector), default 0.65
  enableWebFallback: boolean;
  minLocalConfidenceThreshold: number; // 0.35
  anonymousProxyDomain: string;
}
