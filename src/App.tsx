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

export default function App() {
  const [currentTab, setCurrentTab] = useState<'search' | 'vault' | 'browser' | 'audit' | 'docs'>('search');
  const [userRole, setUserRole] = useState<UserRole>('owner');
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [vaultSalt, setVaultSalt] = useState<Uint8Array | null>(null);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [passphraseMode, setPassphraseMode] = useState<'unlock' | 'create'>('unlock');
  const [hasVaultKey, setHasVaultKey] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [connectedFolder, setConnectedFolder] = useState<ConnectedFolder | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

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

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await storageEngine.init();
        await storageEngine.purgeLegacyMockData('owner');

        const saltB64 = await storageEngine.getSetting<string>('vault_salt_b64');
        if (saltB64) {
          try {
            const bin = atob(saltB64);
            const salt = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) salt[i] = bin.charCodeAt(i);
            setVaultSalt(salt);
            setHasVaultKey(true);
          } catch {
            setHasVaultKey(false);
          }
        } else {
          setHasVaultKey(false);
        }

        await refreshDocuments(null);

        const urlParams = new URLSearchParams(window.location.search);
        const queryParam = urlParams.get('q');
        if (queryParam) {
          setQuery(queryParam);
          setCurrentTab('search');
          const result = await executeSearch(queryParam, settings, null, 'owner');
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

  const openUnlock = () => {
    setPassphraseMode('unlock');
    setIsUnlockModalOpen(true);
  };

  const openCreateKey = () => {
    setPassphraseMode('create');
    setIsUnlockModalOpen(true);
  };

  const handleLock = () => {
    setMasterKey(null);
    refreshDocuments(null);
  };

  const handleUnlocked = async (
    key: CryptoKey,
    salt: Uint8Array,
    _mode: 'unlock' | 'create'
  ) => {
    setMasterKey(key);
    setVaultSalt(salt);
    setHasVaultKey(true);
    let b64 = '';
    for (let i = 0; i < salt.length; i++) b64 += String.fromCharCode(salt[i]);
    await storageEngine.setSetting('vault_salt_b64', btoa(b64));
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
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isUnlocked={!!masterKey}
        userRole={userRole}
        documentsCount={documents.length}
        isOnline={isOnline}
      />

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
            onOpenUnlockModal={openUnlock}
            allDocuments={documents}
            onNavigateTab={setCurrentTab}
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
            hasVaultKey={hasVaultKey}
            onUnlock={openUnlock}
            onCreateKey={openCreateKey}
            onLock={handleLock}
          />
        )}

        {currentTab === 'browser' && (
          <BrowserSyncView
            masterKey={masterKey}
            onOpenUnlockModal={openUnlock}
            userRole={userRole}
            onSyncCompleted={() => refreshDocuments(masterKey)}
          />
        )}

        {currentTab === 'audit' && (
          <AuditView currentRole={userRole} onChangeRole={setUserRole} />
        )}

        {currentTab === 'docs' && <DocsView />}
      </main>

      <PassphraseModal
        isOpen={isUnlockModalOpen}
        mode={passphraseMode}
        onClose={() => setIsUnlockModalOpen(false)}
        onUnlocked={handleUnlocked}
        savedSalt={vaultSalt}
      />

      <footer className="border-t border-neutral-900 py-4 text-neutral-600">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 font-mono text-[10px] sm:flex-row sm:px-6">
          <span>Veritas · local index · AES-256-GCM</span>
          <span>{isOnline ? 'online' : 'offline'}</span>
        </div>
      </footer>
    </div>
  );
}
