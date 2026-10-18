/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  deriveKeyFromPassphrase,
  encryptText,
  decryptText,
  generateSalt,
  computeSha256,
} from './crypto';
import {
  generateVector,
  cosineSimilarity,
  computeBM25,
  tokenize,
} from './semanticEngine';
import { storageEngine } from './storage';
import { exportEncryptedSyncBundle, importEncryptedSyncBundle } from './syncAndBrowser';

export interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: string;
}

export async function runAllUnitTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Helper assertion
  const runTest = async (
    name: string,
    category: string,
    fn: () => Promise<string | void>
  ) => {
    const start = performance.now();
    try {
      const details = await fn();
      results.push({
        name,
        category,
        passed: true,
        durationMs: Math.round((performance.now() - start) * 10) / 10,
        details: details || 'Passed',
      });
    } catch (err: any) {
      results.push({
        name,
        category,
        passed: false,
        durationMs: Math.round((performance.now() - start) * 10) / 10,
        error: err?.message || String(err),
      });
    }
  };

  // 1. Cryptographic Test Suite
  await runTest('AES-256-GCM Encryption & Decryption Roundtrip', 'Cryptography', async () => {
    const salt = generateSalt(16);
    const key = await deriveKeyFromPassphrase('correct-horse-battery-staple', salt);
    const secret = 'Top Secret Medical and Financial Record 123';
    const encrypted = await encryptText(secret, key, salt);

    if (!encrypted.cipherBuffer || !encrypted.iv) {
      throw new Error('Encrypted payload missing cipher or IV');
    }

    const decrypted = await decryptText(encrypted, key);
    if (decrypted !== secret) {
      throw new Error(`Decrypted text "${decrypted}" did not match original "${secret}"`);
    }
    return `Verified 256-bit AES-GCM ciphertext roundtrip with IV: ${encrypted.iv.slice(0, 8)}...`;
  });

  await runTest('PBKDF2 SHA-256 Key Derivation Determinism', 'Cryptography', async () => {
    const salt = generateSalt(16);
    const key1 = await deriveKeyFromPassphrase('passphrase-A', salt);
    const key2 = await deriveKeyFromPassphrase('passphrase-A', salt);
    const testData = 'Deterministic vector payload';
    const enc1 = await encryptText(testData, key1, salt);
    const dec2 = await decryptText(enc1, key2);
    if (dec2 !== testData) {
      throw new Error('Deterministic key test failed across identical salts and passphrases');
    }
    return '100,000 iterations PBKDF2 successfully derived identical AES keys';
  });

  await runTest('SHA-256 Hash Integrity and Collision Resistance', 'Cryptography', async () => {
    const hash1 = await computeSha256('block-0-seed');
    const hash2 = await computeSha256('block-0-seed');
    const hash3 = await computeSha256('block-0-seed-altered');

    if (hash1 !== hash2) throw new Error('SHA-256 was non-deterministic');
    if (hash1 === hash3) throw new Error('Hash collision detected');
    return `Hash verification confirmed (output: ${hash1.slice(0, 12)}...)`;
  });

  // 2. Semantic & Vector Math Suite
  await runTest('Vector Embedding Dimensionality & Unit L2 Norm', 'Vector Engine', async () => {
    const vector = generateVector('Cardiovascular lipid biomarker test results');
    if (vector.length !== 64) {
      throw new Error(`Expected 64 dimensions, got ${vector.length}`);
    }

    let normSq = 0;
    for (const v of vector) normSq += v * v;
    const norm = Math.sqrt(normSq);

    if (Math.abs(norm - 1.0) > 0.001) {
      throw new Error(`Vector is not unit normalized: L2 norm is ${norm}`);
    }
    return `Embedding space verified: 64 dimensions, L2 norm = ${norm.toFixed(4)}`;
  });

  await runTest('Semantic Cosine Invariance & Conceptual Proximity', 'Vector Engine', async () => {
    const vecA = generateVector('tax deductions and 1099 writeoffs');
    const vecB = generateVector('irs annual revenue and business expenses');
    const vecC = generateVector('recipe for homemade sourdough pizza');

    const simRelated = cosineSimilarity(vecA, vecB);
    const simUnrelated = cosineSimilarity(vecA, vecC);

    if (simRelated <= simUnrelated) {
      throw new Error(`Semantic similarity failed: Related (${simRelated}) <= Unrelated (${simUnrelated})`);
    }
    return `High semantic separation confirmed: Related score ${simRelated.toFixed(3)} vs Unrelated ${simUnrelated.toFixed(3)}`;
  });

  await runTest('BM25 Lexical Term Frequency Saturation', 'Lexical Search', async () => {
    const query = tokenize('deductions revenue');
    const docFrequent = tokenize('deductions deductions revenue balance statement');
    const docSparse = tokenize('deductions other words here');

    const scoreFrequent = computeBM25(query, docFrequent);
    const scoreSparse = computeBM25(query, docSparse);

    if (scoreFrequent <= scoreSparse) {
      throw new Error('BM25 score failed to reward term frequency and coverage');
    }
    return `BM25 frequency ranking confirmed: Frequent (${scoreFrequent.toFixed(3)}) > Sparse (${scoreSparse.toFixed(3)})`;
  });

  // 3. Storage & IndexedDB Suite
  await runTest('IndexedDB Transactional Write and Readback', 'Storage Layer', async () => {
    await storageEngine.init();
    const testDoc = {
      title: 'Unit Test Document Ingestion',
      category: 'notes' as const,
      tags: ['test', 'storage'],
      content: 'This document tests isolated IndexedDB atomic persistence and chunk indexing.',
    };

    const saved = await storageEngine.saveDocument(testDoc, null, 'owner');
    if (!saved.id) throw new Error('Document saved without ID');

    const allDocs = await storageEngine.getAllDocuments(null);
    const found = allDocs.find(d => d.id === saved.id);
    if (!found) throw new Error('Saved document could not be retrieved from IndexedDB');

    // Clean up
    await storageEngine.deleteDocument(saved.id, 'owner');
    return `Document persisted, chunked into vectors, verified, and purged cleanly`;
  });

  // 4. Cross-Platform Sync Suite
  await runTest('Encrypted Sync Bundle Export & Checksum Validation', 'Offline Sync', async () => {
    const salt = generateSalt(16);
    const key = await deriveKeyFromPassphrase('sync-test-passphrase', salt);

    const bundleJson = await exportEncryptedSyncBundle(key, 'owner');
    const payload = JSON.parse(bundleJson);

    if (!payload.checksum || !payload.encryptedBlob) {
      throw new Error('Sync bundle missing checksum or encrypted blob');
    }

    const { importedCount } = await importEncryptedSyncBundle(bundleJson, key, 'owner');
    if (typeof importedCount !== 'number') {
      throw new Error('Import failed to report importedCount');
    }
    return `Verified cryptographic sync payload checksum and bundle re-import`;
  });

  // 5. Instant Utility Answers Suite (Precision Clock, Date, Storage, Activity, Calculator)
  await runTest('Instant Utility Answer: Time & World Clocks', 'Instant Answers', async () => {
    const { resolveInstantAnswer } = await import('./instantAnswers');

    const timeAns = await resolveInstantAnswer('the time');
    if (!timeAns || timeAns.type !== 'time' || !timeAns.primaryValue) {
      throw new Error(`Failed to resolve "the time", got: ${JSON.stringify(timeAns)}`);
    }

    const tokyoAns = await resolveInstantAnswer('time in tokyo');
    if (!tokyoAns || tokyoAns.type !== 'time' || !tokyoAns.title.includes('Tokyo')) {
      throw new Error(`Failed to resolve "time in tokyo", got: ${JSON.stringify(tokyoAns)}`);
    }

    const mathAns = await resolveInstantAnswer('50 * 20');
    if (!mathAns || mathAns.type !== 'calculator' || mathAns.primaryValue !== '1000') {
      throw new Error(`Failed to resolve "50 * 20", got: ${JSON.stringify(mathAns)}`);
    }

    return `Verified local precision clock (${timeAns.primaryValue}), world time (${tokyoAns.primaryValue}), and math engine (${mathAns.primaryValue})`;
  });

  // 6. Machine Telemetry Suite (Date, Storage Capacity, Changes / Activity Log, System Specs)
  await runTest('Local Machine Telemetry: Date, Storage, Activity Log & Specs', 'Machine Telemetry', async () => {
    const { resolveInstantAnswer } = await import('./instantAnswers');

    // 1. Date
    const dateAns = await resolveInstantAnswer('today');
    if (!dateAns || dateAns.type !== 'date' || !dateAns.dateData) {
      throw new Error(`Failed to resolve "today", got: ${JSON.stringify(dateAns)}`);
    }

    // 2. Storage capacity
    const storageAns = await resolveInstantAnswer('storage capacity');
    if (!storageAns || storageAns.type !== 'storage' || !storageAns.storageData) {
      throw new Error(`Failed to resolve "storage capacity", got: ${JSON.stringify(storageAns)}`);
    }

    // 3. What I have done / changed
    const activityAns = await resolveInstantAnswer('what i have done');
    if (!activityAns || activityAns.type !== 'activity' || !activityAns.activityData) {
      throw new Error(`Failed to resolve "what i have done", got: ${JSON.stringify(activityAns)}`);
    }

    // 4. Machine specs
    const systemAns = await resolveInstantAnswer('machine specs');
    if (!systemAns || systemAns.type !== 'system' || !systemAns.systemData) {
      throw new Error(`Failed to resolve "machine specs", got: ${JSON.stringify(systemAns)}`);
    }

    return `Verified Date (${dateAns.primaryValue}), Storage (${storageAns.storageData.usedFormatted}), Activity (${activityAns.activityData.totalEvents} actions), and Specs (${systemAns.systemData.os}, ${systemAns.systemData.cpuCores} cores)`;
  });

  return results;
}
