/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DocumentItem, ConnectedFolder, UserRole } from '../types';
import { storageEngine } from './storage';

export const SUPPORTED_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'json',
  'csv',
  'ts',
  'tsx',
  'js',
  'jsx',
  'py',
  'html',
  'css',
  'yaml',
  'yml',
  'env',
  'log',
  'rtf',
  'org',
  'sh',
  'sql',
  'toml',
  'conf',
]);

export interface IndexProgress {
  scannedCount: number;
  indexedCount: number;
  currentFile: string;
  isComplete: boolean;
  error?: string;
}

/**
 * Infer category from filename and content
 */
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

/**
 * Check if the browser supports the native File System Access API
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Request access to machine's local directory via OS File Explorer
 */
export async function connectMachineDirectory(
  onProgress: (p: IndexProgress) => void,
  masterKey?: CryptoKey | null,
  actorRole: UserRole = 'owner'
): Promise<ConnectedFolder | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('Your browser does not support the native showDirectoryPicker API. Use the folder upload fallback.');
  }

  try {
    // Opens native OS File Explorer (Windows Explorer, macOS Finder, Linux File Manager)
    const dirHandle = await (window as any).showDirectoryPicker({
      id: 'veritas-search-vault',
      mode: 'read',
    });

    const folderName = dirHandle.name;
    let scanned = 0;
    let indexed = 0;

    // Helper to recursively walk directories
    async function scanDirectory(handle: any, currentPath = '') {
      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          scanned++;
          const fileName = entry.name;
          const extension = fileName.split('.').pop()?.toLowerCase() || '';

          if (SUPPORTED_EXTENSIONS.has(extension)) {
            onProgress({
              scannedCount: scanned,
              indexedCount: indexed,
              currentFile: `${currentPath}/${fileName}`,
              isComplete: false,
            });

            try {
              const file = await entry.getFile();
              // Skip very large files (> 5MB)
              if (file.size <= 5 * 1024 * 1024) {
                const text = await file.text();
                if (text.trim().length > 0) {
                  const category = inferCategory(fileName, text);
                  const title = fileName.replace(/\.[^/.]+$/, '');
                  const filePath = `${folderName}${currentPath}/${fileName}`;

                  await storageEngine.saveDocument(
                    {
                      id: `file_${filePath.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
                      title,
                      category,
                      content: text,
                      filePath,
                      fileSize: file.size,
                      fileExtension: extension,
                      tags: [extension, category],
                    },
                    masterKey,
                    actorRole
                  );
                  indexed++;
                }
              }
            } catch (fileErr) {
              console.warn(`Could not read file ${fileName}:`, fileErr);
            }
          }
        } else if (entry.kind === 'directory') {
          // Avoid scanning hidden or package directories
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'build') {
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
      `Connected machine folder "${folderName}" and indexed ${indexed} local files into vector storage`
    );

    onProgress({
      scannedCount: scanned,
      indexedCount: indexed,
      currentFile: 'Complete',
      isComplete: true,
    });

    return folderInfo;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      // User canceled file explorer picker
      return null;
    }
    throw err;
  }
}

/**
 * Fallback: Process files selected via standard webkitdirectory folder input
 */
export async function processSelectedFolderFiles(
  fileList: FileList,
  folderName: string,
  onProgress: (p: IndexProgress) => void,
  masterKey?: CryptoKey | null,
  actorRole: UserRole = 'owner'
): Promise<ConnectedFolder> {
  let scanned = 0;
  let indexed = 0;

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    scanned++;
    const path = (file as any).webkitRelativePath || file.name;
    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    // Ignore hidden or dependency files
    if (path.includes('/.') || path.includes('/node_modules/') || path.includes('/dist/')) {
      continue;
    }

    if (SUPPORTED_EXTENSIONS.has(extension) && file.size <= 5 * 1024 * 1024) {
      onProgress({
        scannedCount: scanned,
        indexedCount: indexed,
        currentFile: path,
        isComplete: false,
      });

      try {
        const text = await file.text();
        if (text.trim().length > 0) {
          const category = inferCategory(fileName, text);
          const title = fileName.replace(/\.[^/.]+$/, '');

          await storageEngine.saveDocument(
            {
              id: `file_${path.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
              title,
              category,
              content: text,
              filePath: path,
              fileSize: file.size,
              fileExtension: extension,
              tags: [extension, category],
            },
            masterKey,
            actorRole
          );
          indexed++;
        }
      } catch (err) {
        console.warn('Failed reading file:', path, err);
      }
    }
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
    `Imported folder "${folderInfo.name}" (${indexed} files indexed into vector space)`
  );

  onProgress({
    scannedCount: scanned,
    indexedCount: indexed,
    currentFile: 'Complete',
    isComplete: true,
  });

  return folderInfo;
}
