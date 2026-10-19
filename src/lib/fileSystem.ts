/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DocumentItem, ConnectedFolder, UserRole } from '../types';
import { storageEngine } from './storage';
import {
  extractFromFile,
  isSupportedIngestExtension,
  extensionOf,
  MAX_EXTRACT_BYTES,
} from './extractors';

/** @deprecated Use isSupportedIngestExtension — kept for callers that import the set */
export const SUPPORTED_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'json', 'csv', 'ts', 'tsx', 'js', 'jsx', 'py',
  'html', 'css', 'yaml', 'yml', 'env', 'log', 'rtf', 'org', 'sh', 'sql',
  'toml', 'conf', 'xml', 'svg', 'pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp',
]);

export interface IndexProgress {
  scannedCount: number;
  indexedCount: number;
  failedCount: number;
  currentFile: string;
  isComplete: boolean;
  error?: string;
  recentWarnings?: string[];
}

function inferCategory(filename: string, content: string): DocumentItem['category'] {
  const lower = (filename + ' ' + content.slice(0, 500)).toLowerCase();
  if (/tax|deduct|invoice|revenue|receipt|w2|1099|balance|salary|expense|financial|bank|crypto|ledger/i.test(lower)) {
    return 'finance';
  }
  if (/medical|doctor|hospital|cholesterol|blood|glucose|cardio|prescription|lab|clinic|symptom|vitals|health/i.test(lower)) {
    return 'medical';
  }
  if (/lease|contract|agreement|landlord|tenant|nda|terms|clause|liability|legal|compliance|license/i.test(lower)) {
    return 'legal';
  }
  if (/api|function|const|import|class|database|query|server|docker|microservice|architecture|backend|endpoint/i.test(lower)) {
    return 'code';
  }
  if (/flight|hotel|trip|travel|itinerary|passport|packing|vacation|airbnb|destination/i.test(lower)) {
    return 'personal';
  }
  return 'notes';
}

function yieldToMain(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

async function indexOneFile(
  file: File,
  filePath: string,
  masterKey: CryptoKey | null | undefined,
  actorRole: UserRole
): Promise<{ ok: boolean; warning?: string }> {
  const extension = extensionOf(file.name);
  if (!isSupportedIngestExtension(extension)) {
    return { ok: false, warning: `skip unsupported .${extension}` };
  }
  if (file.size > MAX_EXTRACT_BYTES) {
    return { ok: false, warning: `skip oversized ${file.name}` };
  }

  const extracted = await extractFromFile(file);
  if (!extracted.text.trim()) {
    return { ok: false, warning: extracted.warning || `no text in ${file.name}` };
  }

  const category = inferCategory(file.name, extracted.text);
  const title = file.name.replace(/\.[^/.]+$/, '');
  const tags = [extension, category, extracted.kind];
  if (extracted.partial) tags.push('partial-extract');

  await storageEngine.saveDocument(
    {
      id: `file_${filePath.replace(/[^a-zA-Z0-9_-]/g, '_')}`.slice(0, 180),
      title,
      category,
      content: extracted.text,
      filePath,
      fileSize: file.size,
      fileExtension: extension,
      tags,
    },
    masterKey,
    actorRole
  );

  return { ok: true, warning: extracted.warning };
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function connectMachineDirectory(
  onProgress: (p: IndexProgress) => void,
  masterKey?: CryptoKey | null,
  actorRole: UserRole = 'owner'
): Promise<ConnectedFolder | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error(
      'Your browser does not support showDirectoryPicker. Use the folder upload fallback.'
    );
  }

  try {
    const dirHandle = await (window as any).showDirectoryPicker({
      id: 'veritas-search-vault',
      mode: 'read',
    });

    const folderName = dirHandle.name as string;
    let scanned = 0;
    let indexed = 0;
    let failed = 0;
    const recentWarnings: string[] = [];

    const pushWarn = (w?: string) => {
      if (!w) return;
      recentWarnings.push(w);
      if (recentWarnings.length > 5) recentWarnings.shift();
    };

    async function scanDirectory(handle: any, currentPath = '') {
      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          scanned++;
          const fileName = entry.name as string;
          const extension = extensionOf(fileName);
          if (!isSupportedIngestExtension(extension)) continue;

          onProgress({
            scannedCount: scanned,
            indexedCount: indexed,
            failedCount: failed,
            currentFile: `${currentPath}/${fileName}`.replace(/^\//, ''),
            isComplete: false,
            recentWarnings: [...recentWarnings],
          });

          try {
            const file = (await entry.getFile()) as File;
            const filePath = `${folderName}${currentPath}/${fileName}`;
            const result = await indexOneFile(file, filePath, masterKey, actorRole);
            if (result.ok) {
              indexed++;
              if (result.warning) pushWarn(`${fileName}: ${result.warning}`);
            } else {
              failed++;
              pushWarn(`${fileName}: ${result.warning || 'failed'}`);
            }
          } catch (fileErr) {
            failed++;
            pushWarn(`${fileName}: ${fileErr instanceof Error ? fileErr.message : 'read error'}`);
            console.warn(`Could not read file ${fileName}:`, fileErr);
          }

          if (scanned % 3 === 0) await yieldToMain();
        } else if (entry.kind === 'directory') {
          if (
            !entry.name.startsWith('.') &&
            entry.name !== 'node_modules' &&
            entry.name !== 'dist' &&
            entry.name !== 'build'
          ) {
            await scanDirectory(entry, `${currentPath}/${entry.name}`);
          }
        }
      }
    }

    await scanDirectory(dirHandle, '');

    const folderInfo: ConnectedFolder = {
      name: folderName,
      filesCount: indexed,
      lastScannedAt: Date.now(),
    };

    await storageEngine.setSetting('connected_folder', folderInfo);
    await storageEngine.recordAudit(
      'INGEST',
      actorRole,
      `Connected folder "${folderName}" — indexed ${indexed}, failed ${failed}, scanned ${scanned}`
    );

    onProgress({
      scannedCount: scanned,
      indexedCount: indexed,
      failedCount: failed,
      currentFile: 'Complete',
      isComplete: true,
      recentWarnings: [...recentWarnings],
    });

    return folderInfo;
  } catch (err: any) {
    if (err?.name === 'AbortError') return null;
    throw err;
  }
}

export async function processSelectedFolderFiles(
  fileList: FileList,
  folderName: string,
  onProgress: (p: IndexProgress) => void,
  masterKey?: CryptoKey | null,
  actorRole: UserRole = 'owner'
): Promise<ConnectedFolder> {
  let scanned = 0;
  let indexed = 0;
  let failed = 0;
  const recentWarnings: string[] = [];

  const pushWarn = (w?: string) => {
    if (!w) return;
    recentWarnings.push(w);
    if (recentWarnings.length > 5) recentWarnings.shift();
  };

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    scanned++;
    const path = (file as any).webkitRelativePath || file.name;

    if (path.includes('/.') || path.includes('/node_modules/') || path.includes('/dist/')) {
      continue;
    }

    const extension = extensionOf(file.name);
    if (!isSupportedIngestExtension(extension)) continue;

    onProgress({
      scannedCount: scanned,
      indexedCount: indexed,
      failedCount: failed,
      currentFile: path,
      isComplete: false,
      recentWarnings: [...recentWarnings],
    });

    try {
      const result = await indexOneFile(file, path, masterKey, actorRole);
      if (result.ok) {
        indexed++;
        if (result.warning) pushWarn(`${file.name}: ${result.warning}`);
      } else {
        failed++;
        pushWarn(`${file.name}: ${result.warning || 'failed'}`);
      }
    } catch (err) {
      failed++;
      pushWarn(`${file.name}: read error`);
      console.warn('Failed reading file:', path, err);
    }

    if (scanned % 3 === 0) await yieldToMain();
  }

  const folderInfo: ConnectedFolder = {
    name: folderName || 'Connected Folder',
    filesCount: indexed,
    lastScannedAt: Date.now(),
  };

  await storageEngine.setSetting('connected_folder', folderInfo);
  await storageEngine.recordAudit(
    'INGEST',
    actorRole,
    `Imported folder "${folderInfo.name}" — indexed ${indexed}, failed ${failed}`
  );

  onProgress({
    scannedCount: scanned,
    indexedCount: indexed,
    failedCount: failed,
    currentFile: 'Complete',
    isComplete: true,
    recentWarnings: [...recentWarnings],
  });

  return folderInfo;
}

/** Index a single user-picked file (e.g. one PDF) into the vault. */
export async function ingestSingleFile(
  file: File,
  masterKey?: CryptoKey | null,
  actorRole: UserRole = 'owner'
): Promise<{ ok: boolean; warning?: string }> {
  return indexOneFile(file, file.name, masterKey, actorRole);
}
