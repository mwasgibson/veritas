/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Globe,
  Download,
  Upload,
  Copy,
  Check,
  Code2,
  RefreshCw,
  Lock,
  Smartphone,
  Laptop,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { generateExtensionFiles, exportEncryptedSyncBundle, importEncryptedSyncBundle } from '../lib/syncAndBrowser';
import { UserRole } from '../types';

interface BrowserSyncViewProps {
  masterKey?: CryptoKey | null;
  onOpenUnlockModal: () => void;
  userRole: UserRole;
  onSyncCompleted: () => Promise<void>;
}

export const BrowserSyncView: React.FC<BrowserSyncViewProps> = ({
  masterKey,
  onOpenUnlockModal,
  userRole,
  onSyncCompleted,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedManifest, setCopiedManifest] = useState(false);
  const [copiedBackground, setCopiedBackground] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'browser' | 'sync' | 'extension'>('browser');

  const searchEngineUrl = `${window.location.origin}/?q=%s`;
  const extensionFiles = generateExtensionFiles();

  const handleCopySearchUrl = () => {
    navigator.clipboard.writeText(searchEngineUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleExportBundle = async () => {
    if (!masterKey) {
      onOpenUnlockModal();
      return;
    }

    try {
      setIsExporting(true);
      const bundleJson = await exportEncryptedSyncBundle(masterKey, userRole);
      const blob = new Blob([bundleJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `veritas-vault-sync-${new Date().toISOString().slice(0, 10)}.veritas.enc`;
      a.click();
      URL.revokeObjectURL(url);
      setSyncStatus('Encrypted vault exported with SHA-256 integrity signature.');
    } catch (err: any) {
      setSyncStatus(`Export failed: ${err?.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBundle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!masterKey) {
      onOpenUnlockModal();
      return;
    }

    try {
      setIsImporting(true);
      const text = await file.text();
      const result = await importEncryptedSyncBundle(text, masterKey, userRole);
      await onSyncCompleted();
      setSyncStatus(`Successfully merged ${result.importedCount} documents from encrypted sync payload.`);
    } catch (err: any) {
      setSyncStatus(`Import error: ${err?.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-8">
      {/* Top Header */}
      <div className="pb-6 border-b border-neutral-800">
        <h1 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
          <Globe className="w-5 h-5 text-neutral-400" />
          <span>Browser Omnibox & Offline-First Sync</span>
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Set Veritas as your default browser search engine and synchronize your encrypted vault across all devices.
        </p>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 mt-4 p-1 bg-neutral-900 border border-neutral-800 rounded-lg w-fit text-xs">
          <button
            onClick={() => setActiveTab('browser')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === 'browser' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Browser Integration (OpenSearch)
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === 'sync' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Offline Cross-Device Sync
          </button>
          <button
            onClick={() => setActiveTab('extension')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === 'extension' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Extension Code (Manifest v3)
          </button>
        </div>
      </div>

      {syncStatus && (
        <div className="mt-4 p-3 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-neutral-200 flex items-center justify-between">
          <span>{syncStatus}</span>
          <button onClick={() => setSyncStatus(null)} className="text-neutral-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Browser Default Search Engine Configuration */}
      {activeTab === 'browser' && (
        <div className="mt-6 space-y-6">
          <div className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <h2 className="text-sm font-semibold text-neutral-100 mb-2">
              Default Search Engine URL Template
            </h2>
            <p className="text-xs text-neutral-400 mb-4">
              Add this search URL to Chrome, Brave, Firefox, or Edge. When you type in your browser's address bar,
              queries are routed to Veritas, indexing your private files first in sub-10ms before anonymous web fallback.
            </p>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-xs text-neutral-200">
              <span className="flex-1 truncate select-all">{searchEngineUrl}</span>
              <button
                onClick={handleCopySearchUrl}
                className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-sans font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 text-xs">
              <h3 className="font-semibold text-neutral-200 mb-2">Chrome & Brave Browser Setup</h3>
              <ol className="list-decimal list-inside space-y-2 text-neutral-400 leading-relaxed">
                <li>Navigate to <span className="font-mono text-neutral-300">chrome://settings/searchEngines</span></li>
                <li>Click <strong>Add</strong> next to "Site search"</li>
                <li>Set Name: <span className="font-mono text-neutral-300">Veritas Search</span></li>
                <li>Set Shortcut: <span className="font-mono text-neutral-300">@v</span> or <span className="font-mono text-neutral-300">v</span></li>
                <li>Paste the URL template: <span className="font-mono text-neutral-300">{searchEngineUrl}</span></li>
                <li>Click <strong>Make Default</strong> to replace Google</li>
              </ol>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 text-xs">
              <h3 className="font-semibold text-neutral-200 mb-2">Firefox & Safari Setup</h3>
              <ol className="list-decimal list-inside space-y-2 text-neutral-400 leading-relaxed">
                <li>Firefox automatically detects our OpenSearch descriptor (<span className="font-mono text-neutral-300">/opensearch.xml</span>)</li>
                <li>Right-click the browser address bar while on this page</li>
                <li>Select <strong>Add "Veritas Search"</strong></li>
                <li>Go to <span className="font-mono text-neutral-300">about:preferences#search</span> and choose Veritas as default</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* 2. Offline-First Cross-Platform Sync */}
      {activeTab === 'sync' && (
        <div className="mt-6 space-y-6">
          <div className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-neutral-100">Zero-Cloud End-to-End Encrypted Sync</h2>
                <p className="text-xs text-neutral-400">Synchronize private records between laptop, tablet, and mobile</p>
              </div>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed mb-6">
              Veritas does not rely on centralized servers. Your vault is packaged into an AES-256-GCM encrypted payload,
              signed with a SHA-256 checksum, and can be transferred via AirDrop, local network, USB, or peer-to-peer file transfer.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-neutral-200 mb-1 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Export Encrypted Vault</span>
                  </h3>
                  <p className="text-[11px] text-neutral-500 mb-4 leading-normal">
                    Download an encrypted <span className="font-mono text-neutral-400">.aegis.enc</span> backup container.
                  </p>
                </div>
                <button
                  onClick={handleExportBundle}
                  disabled={isExporting}
                  className="w-full py-2 px-3 text-xs font-semibold bg-neutral-100 hover:bg-white text-neutral-900 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExporting ? 'Exporting...' : 'Export Vault File'}</span>
                </button>
              </div>

              <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-neutral-200 mb-1 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Import & Merge Vault</span>
                  </h3>
                  <p className="text-[11px] text-neutral-500 mb-4 leading-normal">
                    Select a synced <span className="font-mono text-neutral-400">.aegis.enc</span> file from another device to merge updates.
                  </p>
                </div>
                <label className="w-full py-2 px-3 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-center">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isImporting ? 'Merging...' : 'Select File to Merge'}</span>
                  <input
                    type="file"
                    accept=".enc,.json"
                    onChange={handleImportBundle}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Multi-Device Architecture Diagram */}
          <div className="p-5 rounded-xl bg-neutral-900/30 border border-neutral-800">
            <h3 className="text-xs font-semibold text-neutral-300 mb-3 uppercase tracking-wider font-mono">
              Offline-First Multi-Device Topology
            </h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4 text-xs font-mono text-neutral-300">
              <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-neutral-900 border border-neutral-800 w-36 text-center">
                <Laptop className="w-5 h-5 text-neutral-400" />
                <span>Primary Laptop</span>
                <span className="text-[10px] text-neutral-500">IndexedDB Vault</span>
              </div>

              <ArrowRight className="w-4 h-4 text-neutral-600 hidden sm:block" />

              <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-neutral-950 border border-neutral-800 w-44 text-center">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">AES-256-GCM</span>
                <span className="text-[10px] text-neutral-500">Zero-Knowledge Payload</span>
              </div>

              <ArrowRight className="w-4 h-4 text-neutral-600 hidden sm:block" />

              <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-neutral-900 border border-neutral-800 w-36 text-center">
                <Smartphone className="w-5 h-5 text-neutral-400" />
                <span>Mobile Device</span>
                <span className="text-[10px] text-neutral-500">PWA Offline Cache</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Browser Extension Manifest V3 */}
      {activeTab === 'extension' && (
        <div className="mt-6 space-y-6">
          <div className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-neutral-100">Extension Manifest v3</h2>
                <p className="text-xs text-neutral-400">Save as <span className="font-mono text-neutral-300">manifest.json</span> in an extension folder</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(extensionFiles.manifestJson);
                  setCopiedManifest(true);
                  setTimeout(() => setCopiedManifest(false), 2000);
                }}
                className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 font-medium flex items-center gap-1.5 transition-colors"
              >
                {copiedManifest ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedManifest ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-xs text-neutral-300 overflow-x-auto">
              {extensionFiles.manifestJson}
            </pre>
          </div>

          <div className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-neutral-100">Background Service Worker</h2>
                <p className="text-xs text-neutral-400">Save as <span className="font-mono text-neutral-300">background.js</span> to intercept omnibox queries</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(extensionFiles.backgroundJs);
                  setCopiedBackground(true);
                  setTimeout(() => setCopiedBackground(false), 2000);
                }}
                className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 font-medium flex items-center gap-1.5 transition-colors"
              >
                {copiedBackground ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBackground ? 'Copied' : 'Copy JS'}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-xs text-neutral-300 overflow-x-auto">
              {extensionFiles.backgroundJs}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
