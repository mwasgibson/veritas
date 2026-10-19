/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search as SearchIcon,
  Lock,
  Globe,
  ExternalLink,
  Clock,
  ArrowRight,
  BookOpen,
  X,
  Calculator,
  Calendar,
  HardDrive,
  Activity,
  Laptop,
  SlidersHorizontal,
} from 'lucide-react';
import {
  SearchResultItem,
  SearchSettings,
  ConversationalAnswer,
  DocumentItem,
  InstantWidget,
} from '../types';
import { runSearch } from '../lib/searchRouter';

interface SearchViewProps {
  masterKey: CryptoKey | null;
  isUnlocked: boolean;
  onRequestUnlock: () => void;
  documents: DocumentItem[];
}

const DEFAULT_SETTINGS: SearchSettings = {
  mode: 'hybrid',
  hybridWeight: 0.55,
  minLocalConfidenceThreshold: 0.35,
  enableWebFallback: true,
};

export const SearchView: React.FC<SearchViewProps> = ({
  masterKey,
  isUnlocked,
  onRequestUnlock,
  documents,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [conversational, setConversational] = useState<ConversationalAnswer | null>(null);
  const [instants, setInstants] = useState<InstantWidget[]>([]);
  const [loading, setLoading] = useState(false);
  const [usedWeb, setUsedWeb] = useState(false);
  const [settings, setSettings] = useState<SearchSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Deep-link ?q=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      setQuery(q);
      void doSearch(q);
    }
  }, []);

  async function doSearch(q: string = query) {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setConversational(null);
      setInstants([]);
      setUsedWeb(false);
      return;
    }
    setLoading(true);
    try {
      const out = await runSearch(trimmed, masterKey, settings);
      setResults(out.results);
      setConversational(out.conversational);
      setInstants(out.instants);
      setUsedWeb(out.usedWebFallback);
    } finally {
      setLoading(false);
    }
  }

  const hasQuery = query.trim().length > 0;
  const showEmpty = !hasQuery && !loading;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-neutral-950 text-neutral-100">
      {/* Compact top bar when results are showing */}
      {hasQuery && (
        <div className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur sticky top-14 z-30">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch()}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-full pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-neutral-500"
                placeholder="Search your vault…"
                aria-label="Search query"
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setResults([]); setConversational(null); setInstants([]); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                  aria-label="Clear"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => doSearch()}
              disabled={loading}
              className="px-4 py-2 bg-neutral-100 text-neutral-900 text-sm font-medium rounded-full hover:bg-white disabled:opacity-50"
            >
              {loading ? '…' : 'Search'}
            </button>
            <button
              onClick={() => setShowSettings(s => !s)}
              className="p-2 text-neutral-500 hover:text-neutral-300"
              aria-label="Search settings"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
          {showSettings && (
            <div className="max-w-3xl mx-auto px-4 pb-3 flex flex-wrap gap-3 text-xs text-neutral-400">
              <label className="flex items-center gap-1.5">
                Mode
                <select
                  value={settings.mode}
                  onChange={e => setSettings({ ...settings, mode: e.target.value as SearchSettings['mode'] })}
                  className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1"
                >
                  <option value="hybrid">Hybrid</option>
                  <option value="semantic">Semantic</option>
                  <option value="keyword">Keyword</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5">
                Web fallback
                <input
                  type="checkbox"
                  checked={settings.enableWebFallback}
                  onChange={e => setSettings({ ...settings, enableWebFallback: e.target.checked })}
                />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Centered empty state (search-engine page) */}
      {showEmpty && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-16">
          <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-700 flex items-center justify-center text-2xl font-mono text-neutral-200 mb-6">
            ∇
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-100 mb-2">Veritas</h1>
          <p className="text-sm text-neutral-500 mb-8 text-center max-w-md">
            Private semantic search. Your files never leave this device.
          </p>
          <div className="w-full max-w-xl relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-full pl-12 pr-4 py-3.5 text-base focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-600"
              placeholder="Search what you mean…"
              aria-label="Search query"
            />
          </div>
          {!isUnlocked && (
            <button
              onClick={onRequestUnlock}
              className="mt-6 flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-200"
            >
              <Lock className="w-4 h-4" />
              Unlock vault to search your documents
            </button>
          )}
          <div className="mt-10 flex flex-wrap justify-center gap-2 text-xs text-neutral-600">
            <span className="px-2.5 py-1 rounded-full border border-neutral-800">Hybrid</span>
            <span className="px-2.5 py-1 rounded-full border border-neutral-800">Local-first</span>
            <span className="px-2.5 py-1 rounded-full border border-neutral-800">AES-256-GCM</span>
            <span className="px-2.5 py-1 rounded-full border border-neutral-800">Zero telemetry</span>
          </div>
        </div>
      )}

      {/* Results area */}
      {hasQuery && (
        <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
          {/* Instant answers */}
          {instants.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {instants.map((w, i) => (
                <InstantCard key={i} widget={w} />
              ))}
            </div>
          )}

          {/* Conversational extractive answer */}
          {conversational && conversational.synthesizedAnswer && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
              <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                <BookOpen className="w-3.5 h-3.5" />
                From your vault
              </div>
              <div className="text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed">
                {conversational.synthesizedAnswer}
              </div>
            </div>
          )}

          {usedWeb && (
            <div className="flex items-center gap-2 text-xs text-blue-400/80">
              <Globe className="w-3.5 h-3.5" />
              Low local confidence — included anonymous web results
            </div>
          )}

          {loading && (
            <div className="text-sm text-neutral-500 animate-pulse">Searching…</div>
          )}

          {!loading && results.length === 0 && (
            <div className="text-sm text-neutral-500 py-8 text-center">
              No results. Try a different query or unlock the vault to index more documents.
            </div>
          )}

          <div className="space-y-3">
            {results.map(r => (
              <ResultCard key={r.id} item={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function ResultCard({ item }: { item: SearchResultItem }) {
  const isWeb = item.source === 'web';
  return (
    <article className="group rounded-xl border border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${
                isWeb
                  ? 'bg-blue-950 text-blue-400 border border-blue-900'
                  : 'bg-emerald-950 text-emerald-400 border border-emerald-900'
              }`}
            >
              {isWeb ? 'Web' : 'Local'}
            </span>
            {item.category && (
              <span className="text-[10px] text-neutral-500">{item.category}</span>
            )}
            <span className="text-[10px] text-neutral-600 font-mono">
              {(item.score * 100).toFixed(0)}%
            </span>
          </div>
          <h3 className="text-base font-medium text-neutral-100 truncate group-hover:text-white">
            {item.title}
          </h3>
          <p className="mt-1.5 text-sm text-neutral-400 leading-relaxed line-clamp-3">
            {item.snippet}
          </p>
        </div>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 p-2 text-neutral-500 hover:text-neutral-300"
            aria-label="Open link"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </article>
  );
}

function InstantCard({ widget }: { widget: InstantWidget }) {
  const iconMap: Record<string, React.ReactNode> = {
    time: <Clock className="w-4 h-4" />,
    calculator: <Calculator className="w-4 h-4" />,
    calendar: <Calendar className="w-4 h-4" />,
    storage: <HardDrive className="w-4 h-4" />,
    activity: <Activity className="w-4 h-4" />,
    specs: <Laptop className="w-4 h-4" />,
  };
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300 shrink-0">
        {iconMap[widget.kind] || <ArrowRight className="w-4 h-4" />}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">{widget.kind}</div>
        <div className="text-sm font-medium text-neutral-100">{widget.title}</div>
        <div className="text-xs text-neutral-400 mt-0.5">{widget.body}</div>
      </div>
    </div>
  );
}

export default SearchView;
