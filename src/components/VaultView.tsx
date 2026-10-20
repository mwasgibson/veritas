/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  FolderOpen, FolderSync, Trash2, Lock, Unlock, KeyRound, FileText, Eye,
  RefreshCw, X, AlertTriangle, CheckCircle2, AlertCircle, Plus,
} from 'lucide-react';
import { DocumentItem, ConnectedFolder, UserRole } from '../types';
import {
  connectMachineDirectory, processSelectedFolderFiles, ingestSingleFile,
  isFileSystemAccessSupported, IndexProgress,
} from '../lib/fileSystem';

interface VaultViewProps {
  documents: DocumentItem[];
  connectedFolder: ConnectedFolder | null;
  onFolderUpdated: (folder: ConnectedFolder | null) => void;
  onRefreshDocuments: () => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  isUnlocked: boolean;
  masterKey?: CryptoKey | null;
  userRole: UserRole;
  hasVaultKey: boolean;
  onUnlock: () => void;
  onCreateKey: () => void;
  onLock: () => void;
  onResetVault: () => Promise<void>;
}

export const VaultView: React.FC<VaultViewProps> = ({
  documents, connectedFolder, onFolderUpdated, onRefreshDocuments,
  onDeleteDocument, onClearAll, isUnlocked, masterKey, userRole,
  hasVaultKey, onUnlock, onCreateKey, onLock, onResetVault,
}) => {
  const [inspectDoc, setInspectDoc] = useState<DocumentItem | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<IndexProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);

  const handleConnectDirectory = async () => {
    setErrorMessage(null);
    if (!isUnlocked) {
      setErrorMessage('Unlock the vault before indexing files.');
      return;
    }
    if (!isFileSystemAccessSupported()) {
      folderInputRef.current?.click();
      return;
    }
    try {
      setIsScanning(true);
      const folder = await connectMachineDirectory(p => setScanProgress(p), masterKey, userRole);
      if (folder) {
        onFolderUpdated(folder);
        await onRefreshDocuments();
      }
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e.name !== 'AbortError') setErrorMessage(e.message || 'Could not access folder');
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanProgress(null), 3500);
    }
  };

  const handleFolderFallback = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    if (!isUnlocked) {
      setErrorMessage('Unlock the vault before indexing files.');
      return;
    }
    try {
      setIsScanning(true);
      const firstPath = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath || '';
      const folderName = firstPath.split('/')[0] || 'Selected folder';
      const folder = await processSelectedFolderFiles(files, folderName, p => setScanProgress(p), masterKey, userRole);
      onFolderUpdated(folder);
      await onRefreshDocuments();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Folder import failed');
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanProgress(null), 3500);
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleSingleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    if (!isUnlocked) {
      setErrorMessage('Unlock the vault before adding files.');
      return;
    }
    setErrorMessage(null);
    setIsScanning(true);
    let indexed = 0;
    let failed = 0;
    const warnings: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setScanProgress({
          scannedCount: i + 1, indexedCount: indexed, failedCount: failed,
          currentFile: file.name, isComplete: false, recentWarnings: [...warnings],
        });
        const result = await ingestSingleFile(file, masterKey, userRole);
        if (result.ok) {
          indexed++;
          if (result.warning) warnings.push(`${file.name}: ${result.warning}`);
        } else {
          failed++;
          warnings.push(`${file.name}: ${result.warning || 'failed'}`);
        }
        if (warnings.length > 5) warnings.shift();
      }
      setScanProgress({
        scannedCount: files.length, indexedCount: indexed, failedCount: failed,
        currentFile: 'Done', isComplete: true, recentWarnings: warnings,
      });
      await onRefreshDocuments();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Ingest failed');
    } finally {
      setIsScanning(false);
      if (singleFileInputRef.current) singleFileInputRef.current.value = '';
      setTimeout(() => setScanProgress(null), 4000);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <section className="mb-8 rounded-lg border border-neutral-800 bg-neutral-950 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-700 bg-neutral-900 text-neutral-300">
              <KeyRound className="h-4 w-4" />
            </span>
            <div>
              <h1 className="text-sm font-medium text-neutral-100">Vault</h1>
              <p className="mt-0.5 text-xs text-neutral-500">
                {isUnlocked
                  ? 'Unlocked — documents are decrypted in memory for search and ingest.'
                  : hasVaultKey
                    ? 'Locked — unlock with your passphrase, or reset if you forgot it.'
                    : 'No key yet — create a passphrase to encrypt this vault on-device.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isUnlocked ? (
              <button type="button" onClick={onLock}
                className="inline-flex items-center gap-1.5 rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-500 hover:text-white">
                <Lock className="h-3.5 w-3.5" /> Lock
              </button>
            ) : (
              <>
                {hasVaultKey && (
                  <button type="button" onClick={onUnlock}
                    className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-white">
                    <Unlock className="h-3.5 w-3.5" /> Unlock
                  </button>
                )}
                <button type="button" onClick={onCreateKey}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs ${
                    hasVaultKey
                      ? 'border border-neutral-700 text-neutral-300 hover:border-neutral-500'
                      : 'bg-neutral-100 font-medium text-neutral-900 hover:bg-white'
                  }`}>
                  <KeyRound className="h-3.5 w-3.5" />
                  {hasVaultKey ? 'New key' : 'Create key'}
                </button>
                {hasVaultKey && (
                  <button type="button"
                    onClick={async () => {
                      if (window.confirm('Reset vault? Forgets the key and deletes the local index on this device. Files on disk are not touched.')) {
                        await onResetVault();
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 px-3 py-1.5 text-xs text-neutral-500 hover:border-rose-900/50 hover:text-rose-400">
                    Reset vault
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-neutral-500">
          Add individual files of any type, or connect a folder. Text is extracted on-device.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={folderInputRef} type="file" // @ts-expect-error webkitdirectory
            webkitdirectory="" multiple onChange={handleFolderFallback} className="hidden" />
          <input ref={singleFileInputRef} type="file" accept="*/*" multiple onChange={handleSingleFiles} className="hidden" />
          <button type="button" onClick={() => singleFileInputRef.current?.click()}
            disabled={isScanning || userRole === 'guest' || !isUnlocked}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-200 hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-40">
            <Plus className="h-3.5 w-3.5" /> Add file
          </button>
          <button type="button" onClick={handleConnectDirectory}
            disabled={isScanning || userRole === 'guest' || !isUnlocked}
            className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">
            {isScanning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <FolderOpen className="h-3.5 w-3.5" />}
            {isScanning ? 'Indexing…' : 'Connect folder'}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-rose-900/40 bg-rose-950/20 px-3 py-2 text-xs text-rose-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {scanProgress && (
        <div className="mb-4 rounded-md border border-neutral-800 bg-neutral-900/50 px-3 py-3 text-xs">
          <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[11px] text-neutral-400">
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              <FolderSync className="h-3.5 w-3.5 shrink-0 animate-spin" />
              <span className="truncate">{scanProgress.currentFile}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              {scanProgress.indexedCount} ok
              {(scanProgress.failedCount ?? 0) > 0 && (
                <span className="text-rose-400"> · {scanProgress.failedCount} failed</span>
              )}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-neutral-800">
            <div className="h-full rounded-full bg-neutral-400 transition-all"
              style={{ width: scanProgress.isComplete ? '100%' : '55%' }} />
          </div>
        </div>
      )}

      {connectedFolder && (
        <div className="mb-4 flex flex-col gap-2 rounded-md border border-neutral-800 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs">
            <span className="font-medium text-neutral-200">{connectedFolder.name}</span>
            <span className="ml-2 font-mono text-neutral-500">
              {connectedFolder.filesCount} files · {new Date(connectedFolder.lastScannedAt).toLocaleString()}
            </span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleConnectDirectory} disabled={isScanning || !isUnlocked}
              className="rounded-md border border-neutral-700 px-2.5 py-1 text-[11px] text-neutral-400 hover:text-neutral-200 disabled:opacity-40">
              Re-scan
            </button>
            {userRole === 'owner' && (
              <button type="button" onClick={() => {
                if (window.confirm('Clear index and disconnect folder?')) {
                  onClearAll();
                  onFolderUpdated(null);
                }
              }}
                className="rounded-md border border-neutral-800 px-2.5 py-1 text-[11px] text-neutral-500 hover:text-rose-400">
                Disconnect
              </button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-neutral-800">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900/60 font-mono text-[10px] uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-2.5 font-medium">File</th>
              <th className="hidden px-3 py-2.5 font-medium sm:table-cell">Size</th>
              <th className="hidden px-3 py-2.5 font-medium md:table-cell">Tokens</th>
              <th className="px-3 py-2.5 text-right font-medium"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900">
            {documents.map(doc => (
              <tr key={doc.id} className="hover:bg-neutral-900/40">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2 text-neutral-200">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-neutral-600" />
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {doc.title}{doc.fileExtension ? `.${doc.fileExtension}` : ''}
                      </div>
                      <div className="truncate font-mono text-[10px] text-neutral-600">
                        {doc.filePath || doc.category}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="hidden px-3 py-2.5 font-mono tabular-nums text-neutral-500 sm:table-cell">
                  {formatSize(doc.fileSize)}
                </td>
                <td className="hidden px-3 py-2.5 font-mono tabular-nums text-neutral-500 md:table-cell">
                  {doc.tokensCount}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button type="button" onClick={() => setInspectDoc(doc)}
                      className="rounded p-1 text-neutral-500 hover:text-neutral-200" title="Inspect">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    {userRole !== 'guest' && (
                      <button type="button" onClick={() => onDeleteDocument(doc.id)}
                        className="rounded p-1 text-neutral-500 hover:text-rose-400" title="Remove">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-12 text-center text-neutral-500">
                  <p className="text-sm text-neutral-400">No files indexed</p>
                  <p className="mt-1 text-xs text-neutral-600">
                    {isUnlocked
                      ? 'Use Add file or Connect folder to index content.'
                      : hasVaultKey
                        ? 'Unlock or Reset vault first.'
                        : 'Create a vault key first.'}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {documents.length > 0 && userRole === 'owner' && (
        <div className="mt-6 flex items-center justify-between border-t border-neutral-900 pt-4 text-xs text-neutral-500">
          <span>Clear local index only — original files on disk are never modified.</span>
          <button type="button"
            onClick={() => {
              if (window.confirm('Clear all indexed documents from this browser?')) onClearAll();
            }}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-800 px-2.5 py-1 text-neutral-500 hover:border-rose-900/50 hover:text-rose-400">
            <AlertTriangle className="h-3 w-3" /> Clear index
          </button>
        </div>
      )}

      {inspectDoc && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setInspectDoc(null)} role="presentation">
          <aside className="h-full w-full max-w-md overflow-y-auto border-l border-neutral-800 bg-neutral-950 p-5 shadow-xl"
            onClick={e => e.stopPropagation()} role="dialog" aria-label="Document">
            <div className="mb-4 flex items-center justify-between border-b border-neutral-800 pb-3">
              <span className="text-xs font-medium text-neutral-400">Document</span>
              <button type="button" onClick={() => setInspectDoc(null)} className="rounded p-1 text-neutral-500 hover:text-white" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-1 font-mono text-[10px] uppercase text-neutral-600">
              {inspectDoc.category} · {inspectDoc.tokensCount} tokens · {formatSize(inspectDoc.fileSize)}
            </div>
            <h2 className="mb-1 text-base font-medium text-neutral-100">
              {inspectDoc.title}{inspectDoc.fileExtension ? `.${inspectDoc.fileExtension}` : ''}
            </h2>
            {inspectDoc.filePath && (
              <p className="mb-4 break-all font-mono text-[11px] text-neutral-600">{inspectDoc.filePath}</p>
            )}
            <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-neutral-400">
              {inspectDoc.content || '(locked — unlock to read)'}
            </pre>
          </aside>
        </div>
      )}
    </div>
  );
};
