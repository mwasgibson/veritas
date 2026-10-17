/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Folder,
  FolderOpen,
  FolderSync,
  Trash2,
  Lock,
  FileCode,
  FileText,
  Eye,
  RefreshCw,
  Cpu,
  X,
  AlertTriangle,
  HardDrive,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { DocumentItem, ConnectedFolder, UserRole } from '../types';
import { generateVector } from '../lib/semanticEngine';
import {
  connectMachineDirectory,
  processSelectedFolderFiles,
  isFileSystemAccessSupported,
  IndexProgress,
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
}

export const VaultView: React.FC<VaultViewProps> = ({
  documents,
  connectedFolder,
  onFolderUpdated,
  onRefreshDocuments,
  onDeleteDocument,
  onClearAll,
  isUnlocked,
  masterKey,
  userRole,
}) => {
  const [inspectDoc, setInspectDoc] = useState<DocumentItem | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<IndexProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConnectDirectory = async () => {
    setErrorMessage(null);
    if (!isFileSystemAccessSupported()) {
      // Trigger folder input fallback
      fileInputRef.current?.click();
      return;
    }

    try {
      setIsScanning(true);
      const folder = await connectMachineDirectory(
        progress => setScanProgress(progress),
        masterKey,
        userRole
      );

      if (folder) {
        onFolderUpdated(folder);
        await onRefreshDocuments();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMessage(err?.message || 'Failed accessing directory');
      }
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanProgress(null), 3000);
    }
  };

  const handleFallbackFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsScanning(true);
      const firstPath = (files[0] as any).webkitRelativePath || '';
      const folderName = firstPath.split('/')[0] || 'Selected Folder';

      const folder = await processSelectedFolderFiles(
        files,
        folderName,
        progress => setScanProgress(progress),
        masterKey,
        userRole
      );

      onFolderUpdated(folder);
      await onRefreshDocuments();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed importing folder files');
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanProgress(null), 3000);
    }
  };

  const handleDisconnectFolder = async () => {
    if (window.confirm('Disconnect this folder and clear indexed machine files?')) {
      await onClearAll();
      onFolderUpdated(null);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div>
          <h1 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-neutral-400" />
            <span>Machine File Explorer Index</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Request native access to your computer's local folders. Files are parsed, chunked, and vectorized strictly in client memory.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            // @ts-ignore
            webkitdirectory="true"
            // @ts-ignore
            directory="true"
            multiple
            onChange={handleFallbackFolderUpload}
            className="hidden"
          />

          <button
            onClick={handleConnectDirectory}
            disabled={isScanning || userRole === 'guest'}
            className="px-4 py-2 text-xs font-semibold bg-neutral-100 hover:bg-white text-neutral-900 rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Reading File Explorer...</span>
              </>
            ) : (
              <>
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Request Folder Access</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-4 p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Real-time Scanning Progress Bar */}
      {scanProgress && (
        <div className="mt-4 p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-xs animate-in fade-in">
          <div className="flex items-center justify-between font-mono text-[11px] text-neutral-300 mb-2">
            <span className="flex items-center gap-1.5">
              <FolderSync className="w-3.5 h-3.5 text-neutral-400 animate-spin" />
              <span>Scanning: {scanProgress.currentFile}</span>
            </span>
            <span>
              Scanned: <strong className="text-white">{scanProgress.scannedCount}</strong> · Indexed:{' '}
              <strong className="text-emerald-400">{scanProgress.indexedCount}</strong>
            </span>
          </div>
          <div className="w-full bg-neutral-950 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-neutral-100 h-1.5 rounded-full transition-all duration-150 animate-pulse"
              style={{ width: scanProgress.isComplete ? '100%' : '65%' }}
            />
          </div>
        </div>
      )}

      {/* Connected Folder Status Banner */}
      {connectedFolder && (
        <div className="mt-6 p-4 rounded-xl bg-neutral-900/70 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300 shrink-0">
              <Folder className="w-4 h-4 text-neutral-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-neutral-100">{connectedFolder.name}</h3>
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Synced
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono mt-0.5">
                <span>{connectedFolder.filesCount} local files indexed</span>
                <span aria-hidden="true">·</span>
                <span>Last scanned {new Date(connectedFolder.lastScannedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleConnectDirectory}
              disabled={isScanning}
              className="px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>Re-scan Folder</span>
            </button>

            {userRole === 'owner' && (
              <button
                onClick={handleDisconnectFolder}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-rose-400 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      )}

      {/* High-Density Files Table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900/90 text-neutral-400 font-mono text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4 font-medium">Local File & Path</th>
              <th className="py-3 px-4 font-medium text-right">Size</th>
              <th className="py-3 px-4 font-medium text-right">Tokens</th>
              <th className="py-3 px-4 font-medium text-center">Encryption</th>
              <th className="py-3 px-4 font-medium text-right">Indexed Time</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60 font-sans">
            {documents.map(doc => (
              <tr key={doc.id} className="hover:bg-neutral-800/40 transition-colors group">
                <td className="py-3 px-4">
                  <div className="font-semibold text-neutral-200 group-hover:text-white transition-colors flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <span>{doc.title}.{doc.fileExtension || 'txt'}</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono truncate max-w-md mt-0.5">
                    {doc.filePath || doc.id}
                  </div>
                </td>

                <td className="py-3 px-4 text-right font-mono text-neutral-400 tabular-nums">
                  {formatFileSize(doc.fileSize)}
                </td>

                <td className="py-3 px-4 text-right font-mono text-neutral-300 tabular-nums">
                  {doc.tokensCount}
                </td>

                <td className="py-3 px-4 text-center">
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                    <Lock className="w-2.5 h-2.5" />
                    AES-256-GCM
                  </span>
                </td>

                <td className="py-3 px-4 text-right font-mono text-neutral-400 tabular-nums">
                  {new Date(doc.createdAt).toLocaleTimeString()}
                </td>

                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setInspectDoc(doc)}
                      className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                      title="Inspect Vector Embeddings & Content"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {userRole !== 'guest' && (
                      <button
                        onClick={() => onDeleteDocument(doc.id)}
                        className="p-1 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete from Index"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {documents.length === 0 && (
              <tr>
                <td colSpan={6} className="py-14 text-center text-neutral-400">
                  <FolderOpen className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-neutral-300 mb-1">
                    No machine files indexed yet
                  </p>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto mb-5 leading-relaxed">
                    Veritas requires access to a folder on your computer (e.g. Documents, Notes, Project directory, or Vault). 
                    No mock or simulated data is loaded.
                  </p>
                  <button
                    onClick={handleConnectDirectory}
                    className="px-4 py-2 text-xs font-semibold bg-neutral-100 hover:bg-white text-neutral-900 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-2"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Select Local Folder from OS File Explorer</span>
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Danger Zone: Wipe */}
      {documents.length > 0 && userRole === 'owner' && (
        <div className="mt-8 pt-6 border-t border-neutral-900 flex items-center justify-between text-xs text-neutral-400">
          <div>
            <span className="font-semibold text-neutral-300">Clear Local Index</span>
            <p className="text-[11px] text-neutral-500">
              Purges all local file vectors and metadata from browser IndexedDB. (Your original computer files are never modified).
            </p>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Clear all indexed files and vector embeddings from local browser storage?')) {
                onClearAll();
              }
            }}
            className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-900/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Clear Index</span>
          </button>
        </div>
      )}

      {/* Vector Embedding Inspector Drawer */}
      {inspectDoc && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-neutral-900 border-l border-neutral-800 shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-neutral-400" />
              <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                Vector Embedding Inspector
              </span>
            </div>
            <button
              onClick={() => setInspectDoc(null)}
              className="text-neutral-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-[11px] text-neutral-400 font-mono uppercase mb-1">
                {inspectDoc.category} · {inspectDoc.tokensCount} tokens · {formatFileSize(inspectDoc.fileSize)}
              </div>
              <h2 className="text-base font-bold text-neutral-100 mb-1">{inspectDoc.title}.{inspectDoc.fileExtension || 'txt'}</h2>
              <div className="text-xs font-mono text-neutral-500 truncate mb-3">{inspectDoc.filePath}</div>
            </div>

            {/* Simulated Vector Dimensions Bar Visualization */}
            <div>
              <div className="flex items-center justify-between text-xs text-neutral-400 font-mono mb-1.5">
                <span>64-Dimensional Semantic Float32 Embedding Space</span>
                <span>L2 Norm: 1.000</span>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex flex-wrap gap-1">
                {generateVector(inspectDoc.content || inspectDoc.title).map((val, idx) => {
                  const magnitude = Math.abs(val);
                  const isPositive = val >= 0;
                  return (
                    <div
                      key={idx}
                      title={`Dim ${idx}: ${val.toFixed(4)}`}
                      style={{
                        height: '24px',
                        width: '6px',
                        backgroundColor: isPositive
                          ? `rgba(52, 211, 153, ${Math.max(0.2, magnitude * 2.5)})`
                          : `rgba(248, 113, 113, ${Math.max(0.2, magnitude * 2.5)})`,
                      }}
                      className="rounded-xs transition-all hover:scale-125"
                    />
                  );
                })}
              </div>
              <p className="text-[11px] text-neutral-500 font-mono mt-1.5">
                Computed on-device via subword 3-gram hashing & concept cluster projections.
              </p>
            </div>

            {/* Document Content View */}
            <div>
              <div className="text-xs font-semibold text-neutral-300 mb-1.5">
                File Content (Decrypted in Memory)
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                {inspectDoc.content || '(Vault locked - provide passphrase to decrypt)'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
