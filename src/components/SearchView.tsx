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

interface SearchViewProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: (q: string, settings: SearchSettings) => void;
  results: SearchResultItem[];
  instantWidget?: InstantWidget;
  conversationalAnswer?: ConversationalAnswer;
  isLoading: boolean;
  totalTimeMs: number;
  localResultsCount: number;
  webResultsCount: number;
  settings: SearchSettings;
  onUpdateSettings: (s: SearchSettings) => void;
  isUnlocked: boolean;
  onOpenUnlockModal: () => void;
  allDocuments: DocumentItem[];
  onNavigateTab?: (tab: 'search' | 'vault' | 'browser' | 'audit' | 'docs') => void;
}

const QUICK_PROMPTS = [
  { label: 'What time is it?', q: 'what time is it' },
  { label: 'Storage', q: 'storage capacity' },
  { label: 'System specs', q: 'machine specs' },
  { label: 'Activity', q: 'what I have done' },
];

export const SearchView: React.FC<SearchViewProps> = ({
  query,
  onQueryChange,
  onSearch,
  results,
  instantWidget,
  conversationalAnswer,
  isLoading,
  totalTimeMs,
  localResultsCount,
  webResultsCount,
  settings,
  onUpdateSettings,
  isUnlocked,
  onOpenUnlockModal,
  allDocuments,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [liveTime, setLiveTime] = useState<string | null>(null);
  const [is24Hour, setIs24Hour] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasQuery = query.trim().length > 0;
  const hasResults = results.length > 0 || !!instantWidget || !!conversationalAnswer;
  const isEmptyHome = !hasQuery && !hasResults;

  useEffect(() => {
    if (instantWidget?.type !== 'time') {
      setLiveTime(null);
      return;
    }
    const update = () => {
      const tz = instantWidget.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      try {
        setLiveTime(
          new Date().toLocaleTimeString('en-US', {
            timeZone: tz,
            hour: is24Hour ? '2-digit' : 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: !is24Hour,
          })
        );
      } catch {
        setLiveTime(
          new Date().toLocaleTimeString('en-US', {
            hour: is24Hour ? '2-digit' : 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: !is24Hour,
          })
        );
      }
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [instantWidget, is24Hour]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) return;
    debounceRef.current = setTimeout(() => onSearch(query, settings), 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) &&
        document.activeElement !== inputRef.current
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (isEmptyHome) inputRef.current?.focus();
  }, [isEmptyHome]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onSearch(query, settings);
    }
  };

  const setMode = (mode: SearchSettings['searchMode']) => {
    const next = { ...settings, searchMode: mode };
    onUpdateSettings(next);
    if (query) onSearch(query, next);
  };

  const activeDoc = allDocuments.find(d => d.id === selectedDocId);

  const searchBar = (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
        <SearchIcon className="w-5 h-5" aria-hidden />
      </div>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search your private index…"
        aria-label="Search your private index"
        autoComplete="off"
        className="w-full pl-12 pr-24 py-3.5 text-[15px] bg-neutral-900 border border-neutral-700 rounded-full text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-colors"
      />
      <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
        {query && (
          <button
            type="button"
            onClick={() => {
              onQueryChange('');
              onSearch('', settings);
              inputRef.current?.focus();
            }}
            className="p-2 text-neutral-500 hover:text-neutral-300 rounded-full"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onSearch(query, settings)}
          className="px-3.5 py-1.5 text-xs font-semibold bg-neutral-100 text-neutral-900 rounded-full hover:bg-white transition-colors flex items-center gap-1"
        >
          Search
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  const modeChips = (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {(
        [
          ['hybrid', 'Hybrid'],
          ['semantic', 'Semantic'],
          ['exact', 'Exact'],
          ['conversational', 'Conversational'],
        ] as const
      ).map(([mode, label]) => (
        <button
          key={mode}
          type="button"
          onClick={() => setMode(mode)}
          className={`px-2.5 py-1 rounded-full border transition-colors ${
            settings.searchMode === mode
              ? 'border-neutral-500 bg-neutral-800 text-neutral-100'
              : 'border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700'
          }`}
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setShowSettings(s => !s)}
        className="p-1.5 text-neutral-500 hover:text-neutral-300 rounded-full border border-transparent hover:border-neutral-800"
        aria-label="Search settings"
        title="Settings"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  if (isEmptyHome) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-700 text-2xl font-mono text-neutral-100 mb-4">
            ∇
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-100">Veritas</h1>
          <p className="mt-2 text-sm text-neutral-500 max-w-md mx-auto">
            Private semantic search. Your files stay on this device.
          </p>
        </div>

        <div className="w-full max-w-xl mb-6">{searchBar}</div>
        <div className="mb-8">{modeChips}</div>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p.q}
              type="button"
              onClick={() => {
                onQueryChange(p.q);
                onSearch(p.q, settings);
              }}
              className="px-3 py-1.5 text-xs text-neutral-400 border border-neutral-800 rounded-full hover:border-neutral-600 hover:text-neutral-200 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        {!isUnlocked && (
          <button
            type="button"
            onClick={onOpenUnlockModal}
            className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            Unlock vault to search encrypted documents
          </button>
        )}

        {showSettings && (
          <SettingsPanel
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4">{searchBar}</div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {modeChips}
        {(hasResults || isLoading) && (
          <div className="text-[11px] font-mono text-neutral-500 tabular-nums">
            {isLoading ? (
              'Searching…'
            ) : (
              <>
                {localResultsCount} local
                {webResultsCount > 0 && <> · {webResultsCount} web</>}
                {totalTimeMs > 0 && <> · {totalTimeMs} ms</>}
              </>
            )}
          </div>
        )}
      </div>

      {showSettings && (
        <div className="mb-5">
          <SettingsPanel
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onClose={() => setShowSettings(false)}
          />
        </div>
      )}

      {!isUnlocked && (
        <div className="mb-5 p-3 rounded-lg border border-neutral-800 bg-neutral-900/50 text-xs text-neutral-400 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5" />
            Vault locked — local encrypted results unavailable
          </span>
          <button type="button" onClick={onOpenUnlockModal} className="text-neutral-200 hover:underline shrink-0">
            Unlock
          </button>
        </div>
      )}

      {instantWidget && (
        <InstantCard
          widget={instantWidget}
          liveTime={liveTime}
          is24Hour={is24Hour}
          onToggle24={() => setIs24Hour(v => !v)}
          onQuickTime={q => {
            onQueryChange(q);
            onSearch(q, settings);
          }}
        />
      )}

      {conversationalAnswer && (
        <div className="mb-6 p-4 rounded-xl border border-neutral-800 bg-neutral-900/60">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500 mb-2 font-mono">Extractive answer</div>
          <p className="text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed">{conversationalAnswer.synthesizedAnswer}</p>
          {conversationalAnswer.citations?.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-neutral-800 pt-3">
              {conversationalAnswer.citations.map((c, i) => (
                <li key={i} className="text-xs text-neutral-500">
                  <span className="text-neutral-400 font-medium">{c.title}</span>
                  {c.passage && <span className="block text-neutral-600 line-clamp-2 mt-0.5">{c.passage}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-1">
        {results.map(item => (
          <ResultCard
            key={item.docId}
            item={item}
            onOpen={() => {
              if (item.source === 'local') setSelectedDocId(item.docId);
              else if (item.sourceUrl) window.open(item.sourceUrl, '_blank', 'noopener,noreferrer');
            }}
          />
        ))}

        {hasQuery && results.length === 0 && !isLoading && !instantWidget && !conversationalAnswer && (
          <div className="py-12 text-center text-sm text-neutral-500">
            <p>No matches for “{query}”.</p>
            <p className="text-xs text-neutral-600 mt-1">Try different terms, unlock the vault, or add documents in Vault.</p>
          </div>
        )}
      </div>

      {activeDoc && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setSelectedDocId(null)} role="presentation">
          <aside
            className="w-full max-w-md h-full bg-neutral-950 border-l border-neutral-800 p-6 overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-label="Document preview"
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
              <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" /> Preview
              </span>
              <button type="button" onClick={() => setSelectedDocId(null)} className="p-1 text-neutral-500 hover:text-white" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-[11px] text-neutral-500 font-mono mb-1 uppercase">
              {activeDoc.category}
              {activeDoc.tokensCount != null && ` · ${activeDoc.tokensCount} tokens`}
            </div>
            <h2 className="text-lg font-semibold text-neutral-100 mb-3">{activeDoc.title}</h2>
            {activeDoc.filePath && <p className="text-xs text-neutral-600 font-mono mb-4 break-all">{activeDoc.filePath}</p>}
            <pre className="text-xs text-neutral-400 whitespace-pre-wrap font-sans leading-relaxed">
              {activeDoc.content || '(encrypted — unlock vault to read)'}
            </pre>
          </aside>
        </div>
      )}
    </div>
  );
};

function ResultCard({ item, onOpen }: { item: SearchResultItem; onOpen: () => void }) {
  const isLocal = item.source === 'local';
  return (
    <article
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
      role="button"
      className="group px-1 py-3 border-b border-neutral-900 hover:bg-neutral-900/40 rounded-sm cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-600"
    >
      <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-500 mb-1">
        {isLocal ? (
          <>
            <span className="text-emerald-500/90 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Local
            </span>
            <span>·</span>
            <span className="uppercase">{item.category}</span>
            <span className="ml-auto tabular-nums text-neutral-600">{Math.round(item.hybridScore * 100)}%</span>
          </>
        ) : (
          <>
            <span className="text-sky-500/90 flex items-center gap-1">
              <Globe className="w-3 h-3" /> Web
            </span>
            {item.sourceUrl && (
              <span className="truncate max-w-[14rem] text-neutral-600">
                {(() => {
                  try {
                    return new URL(item.sourceUrl).hostname;
                  } catch {
                    return 'web';
                  }
                })()}
              </span>
            )}
          </>
        )}
      </div>
      <h3 className="text-[15px] font-medium text-sky-300/90 group-hover:underline decoration-sky-400/40 underline-offset-2 flex items-center gap-1.5">
        {item.title}
        {!isLocal && <ExternalLink className="w-3 h-3 opacity-50 shrink-0" />}
      </h3>
      <p className="mt-0.5 text-sm text-neutral-500 leading-snug line-clamp-2">{item.snippet}</p>
    </article>
  );
}

function InstantCard({
  widget,
  liveTime,
  is24Hour,
  onToggle24,
  onQuickTime,
}: {
  widget: InstantWidget;
  liveTime: string | null;
  is24Hour: boolean;
  onToggle24: () => void;
  onQuickTime: (q: string) => void;
}) {
  const icon =
    widget.type === 'time' ? (
      <Clock className="w-3.5 h-3.5 text-sky-400" />
    ) : widget.type === 'date' ? (
      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
    ) : widget.type === 'storage' ? (
      <HardDrive className="w-3.5 h-3.5 text-violet-400" />
    ) : widget.type === 'system' ? (
      <Laptop className="w-3.5 h-3.5 text-cyan-400" />
    ) : widget.type === 'activity' ? (
      <Activity className="w-3.5 h-3.5 text-amber-400" />
    ) : (
      <Calculator className="w-3.5 h-3.5 text-emerald-400" />
    );

  return (
    <div className="mb-6 p-4 rounded-xl border border-neutral-800 bg-neutral-900/50">
      <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mb-2">
        <span className="flex items-center gap-1.5 uppercase tracking-wider text-neutral-400">
          {icon}
          {widget.title}
        </span>
        {widget.source && <span className="text-neutral-600">{widget.source}</span>}
      </div>

      {widget.type === 'time' ? (
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
            <div className="text-4xl font-mono font-semibold text-white tabular-nums tracking-tight">
              {liveTime || widget.primaryValue}
            </div>
            <button
              type="button"
              onClick={onToggle24}
              className="text-[11px] font-mono px-2 py-0.5 rounded border border-neutral-700 text-neutral-400 hover:text-neutral-200"
            >
              {is24Hour ? '24h' : '12h'}
            </button>
          </div>
          {widget.secondaryValue && <p className="text-sm text-neutral-400 mb-2">{widget.secondaryValue}</p>}
          {widget.details && <p className="text-xs text-neutral-600 font-mono mb-3">{widget.details}</p>}
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-neutral-800">
            {['time', 'time in london', 'time in new york', 'time in tokyo', 'time in utc'].map(q => (
              <button
                key={q}
                type="button"
                onClick={() => onQuickTime(q)}
                className="px-2 py-0.5 text-[11px] font-mono rounded border border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-600"
              >
                {q.replace('time in ', '').replace('time', 'Local')}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="text-2xl font-semibold text-white tracking-tight mb-1">{widget.primaryValue}</div>
          {widget.secondaryValue && <p className="text-sm text-neutral-400 mb-1">{widget.secondaryValue}</p>}
          {widget.details && (
            <p className="text-xs text-neutral-600 font-mono whitespace-pre-wrap">{widget.details}</p>
          )}
          {widget.type === 'date' && widget.dateData && (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] font-mono text-neutral-500 mb-1">
                <span>Year progress</span>
                <span>{widget.dateData.percentOfYear}%</span>
              </div>
              <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600/80 rounded-full"
                  style={{ width: `${Math.min(100, widget.dateData.percentOfYear)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SettingsPanel({
  settings,
  onUpdateSettings,
  onClose,
}: {
  settings: SearchSettings;
  onUpdateSettings: (s: SearchSettings) => void;
  onClose: () => void;
}) {
  return (
    <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900 text-xs space-y-3 max-w-md mx-auto">
      <div className="flex items-center justify-between">
        <span className="font-medium text-neutral-300">Search settings</span>
        <button type="button" onClick={onClose} className="text-neutral-500 hover:text-white">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <label className="flex items-center justify-between gap-4 text-neutral-400">
        <span>Hybrid weight (vector)</span>
        <input
          type="range"
          min={0.1}
          max={0.9}
          step={0.05}
          value={settings.hybridWeight}
          onChange={e => onUpdateSettings({ ...settings, hybridWeight: parseFloat(e.target.value) })}
          className="w-28"
        />
        <span className="font-mono tabular-nums w-8 text-right">{settings.hybridWeight.toFixed(2)}</span>
      </label>
      <label className="flex items-center justify-between gap-4 text-neutral-400">
        <span>Min local confidence</span>
        <input
          type="range"
          min={0.1}
          max={0.9}
          step={0.05}
          value={settings.minLocalConfidenceThreshold}
          onChange={e =>
            onUpdateSettings({
              ...settings,
              minLocalConfidenceThreshold: parseFloat(e.target.value),
            })
          }
          className="w-28"
        />
        <span className="font-mono tabular-nums w-8 text-right">
          {settings.minLocalConfidenceThreshold.toFixed(2)}
        </span>
      </label>
      <label className="flex items-center gap-2 text-neutral-400 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.enableWebFallback}
          onChange={e => onUpdateSettings({ ...settings, enableWebFallback: e.target.checked })}
          className="rounded border-neutral-600"
        />
        Anonymous web fallback when online
      </label>
    </div>
  );
}
