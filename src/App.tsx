/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SearchView } from './components/SearchView';
import { VaultView } from './components/VaultView';
import { BrowserSyncView } from './components/BrowserSyncView';
import { AuditView } from './components/AuditView';
import { DocsView } from './components/DocsView';
import { PassphraseModal } from './components/PassphraseModal';
import {
  DocumentItem,
  SearchResultItem,
  InstantWidget,
  ConversationalAnswer,
  SearchSettings,
  ConnectedFolder,
  UserRole,
} from './types';
import { storageEngine } from './lib/storage';
import { executeSearch } from './lib/searchRouter';
import { deriveKeyFromPassphrase, generateSalt } from './lib/crypto';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'search' | 'vault' | 'browser' | 'audit' | 'docs'>('search');
  const [userRole, setUserRole] = useState<UserRole>('owner');
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [vaultSalt, setVaultSalt] = useState<Uint8Array | null>(null);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [connectedFolder, setConnectedFolder] = useState<ConnectedFolder | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Search State
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [instantWidget, setInstantWidget] = useState<InstantWidget | undefined>(undefined);
  const [conversationalAnswer, setConversationalAnswer] = useState<ConversationalAnswer | undefined>(undefined);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMetrics, setSearchMetrics] = useState({
    totalTimeMs: 0,
    localCount: 0,
    webCount: 0,
  });

  const [settings, setSettings] = useState<SearchSettings>({
    searchMode: 'hybrid',
    hybridWeight: 0.65,
    enableWebFallback: true,
    minLocalConfidenceThreshold: 0.35,
    anonymousProxyDomain: 'wikimedia.org',
  });

  // Track network connectivity in real-time
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Refresh document list and connected folder from IndexedDB
  const refreshDocuments = useCallback(async (keyToUse = masterKey) => {
    try {
      await storageEngine.init();
      const docs = await storageEngine.getAllDocuments(keyToUse);
      setDocuments(docs);

      const savedFolder = await storageEngine.getSetting<ConnectedFolder>('connected_folder');
      setConnectedFolder(savedFolder);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  }, [masterKey]);

  // Handle Search Execution
  const handlePerformSearch = useCallback(
    async (searchQuery: string, currentSettings = settings) => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setInstantWidget(undefined);
        setConversationalAnswer(undefined);
        return;
      }

      setIsSearching(true);
      try {
        const result = await executeSearch(searchQuery, currentSettings, masterKey, userRole);
        setSearchResults(result.results);
        setInstantWidget(result.instantWidget);
        setConversationalAnswer(result.conversationalAnswer);
        setSearchMetrics({
          totalTimeMs: result.totalTimeMs,
          localCount: result.localResultsCount,
          webCount: result.webResultsCount,
        });
      } catch (err) {
        console.error('Search execution failed:', err);
      } finally {
        setIsSearching(false);
      }
    },
    [masterKey, settings, userRole]
  );

  // Initial bootstrap: Initialize DB, derive key, check URL ?q=... (Zero mock data)
  useEffect(() => {
    const bootstrap = async () => {
      try {
        await storageEngine.init();

        const defaultSalt = generateSalt(16);
        setVaultSalt(defaultSalt);

        // Derive sovereign session key for local IndexedDB encryption
        const initialKey = await deriveKeyFromPassphrase('veritas-sovereign-vault-2026', defaultSalt);
        setMasterKey(initialKey);

        // Automatically purge any lingering mock/demo data from previous test loads
        await storageEngine.purgeLegacyMockData('owner');

        // Load existing real documents (if user connected a machine folder)
        await refreshDocuments(initialKey);

        // Check if URL has ?q= search parameter from browser omnibox or direct query
        const urlParams = new URLSearchParams(window.location.search);
        const queryParam = urlParams.get('q');
        if (queryParam) {
          setQuery(queryParam);
          setCurrentTab('search');
          // Execute search immediately
          const result = await executeSearch(queryParam, settings, initialKey, 'owner');
          setSearchResults(result.results);
          setInstantWidget(result.instantWidget);
          setConversationalAnswer(result.conversationalAnswer);
          setSearchMetrics({
            totalTimeMs: result.totalTimeMs,
            localCount: result.localResultsCount,
            webCount: result.webResultsCount,
          });
        }
      } catch (err) {
        console.error('Bootstrap error:', err);
      }
    };

    bootstrap();
  }, []);

  const handleToggleLock = () => {
    if (masterKey) {
      // Lock vault
      setMasterKey(null);
      refreshDocuments(null);
    } else {
      setIsUnlockModalOpen(true);
    }
  };

  const handleUnlocked = async (key: CryptoKey, salt: Uint8Array) => {
    setMasterKey(key);
    setVaultSalt(salt);
    await refreshDocuments(key);
    if (query) {
      handlePerformSearch(query, settings);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    await storageEngine.deleteDocument(id, userRole);
    await refreshDocuments(masterKey);
  };

  const handleClearAll = async () => {
    await storageEngine.clearAll(userRole);
    await storageEngine.setSetting('connected_folder', null);
    setConnectedFolder(null);
    await refreshDocuments(masterKey);
    setSearchResults([]);
    setConversationalAnswer(undefined);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-neutral-800 selection:text-neutral-100">
      {/* 3-Zone Header Contract */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isUnlocked={!!masterKey}
        onToggleLock={handleToggleLock}
        userRole={userRole}
        documentsCount={documents.length}
        isOnline={isOnline}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'search' && (
          <SearchView
            query={query}
            onQueryChange={setQuery}
            onSearch={handlePerformSearch}
            results={searchResults}
            instantWidget={instantWidget}
            conversationalAnswer={conversationalAnswer}
            isLoading={isSearching}
            totalTimeMs={searchMetrics.totalTimeMs}
            localResultsCount={searchMetrics.localCount}
            webResultsCount={searchMetrics.webCount}
            settings={settings}
            onUpdateSettings={setSettings}
            isUnlocked={!!masterKey}
            onOpenUnlockModal={() => setIsUnlockModalOpen(true)}
            allDocuments={documents}
          />
        )}

        {currentTab === 'vault' && (
          <VaultView
            documents={documents}
            connectedFolder={connectedFolder}
            onFolderUpdated={folder => setConnectedFolder(folder)}
            onRefreshDocuments={() => refreshDocuments(masterKey)}
            onDeleteDocument={handleDeleteDocument}
            onClearAll={handleClearAll}
            isUnlocked={!!masterKey}
            masterKey={masterKey}
            userRole={userRole}
          />
        )}

        {currentTab === 'browser' && (
          <BrowserSyncView
            masterKey={masterKey}
            onOpenUnlockModal={() => setIsUnlockModalOpen(true)}
            userRole={userRole}
            onSyncCompleted={() => refreshDocuments(masterKey)}
          />
        )}

        {currentTab === 'audit' && (
          <AuditView currentRole={userRole} onChangeRole={setUserRole} />
        )}

        {currentTab === 'docs' && <DocsView />}
      </main>

      {/* Zero-Knowledge Passphrase Modal */}
      <PassphraseModal
        isOpen={isUnlockModalOpen}
        onClose={() => setIsUnlockModalOpen(false)}
        onUnlocked={handleUnlocked}
        savedSalt={vaultSalt}
      />

      {/* Quiet Minimalist Sovereign Footer */}
      <footer className="py-5 border-t border-neutral-900 bg-neutral-950 text-neutral-500 text-xs">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px]">
          <div>
            Veritas Local-First Engine · Client-Side IndexedDB · AES-256-GCM
          </div>
          <div className="flex items-center gap-4 text-neutral-400">
            <span>Machine File Explorer Index</span>
            <span aria-hidden="true">·</span>
            <span className={isOnline ? 'text-blue-400' : 'text-neutral-500'}>
              {isOnline ? 'Live Web Fallback: Active' : 'Offline Mode'}
            </span>
            <span aria-hidden="true">·</span>
            <span>Zero Telemetry</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
