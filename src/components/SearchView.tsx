/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search as SearchIcon,
  Sparkles,
  SlidersHorizontal,
  Lock,
  Globe,
  ExternalLink,
  Clock,
  Layers,
  ArrowRight,
  BookOpen,
  X,
  FileText,
  Calculator,
  Calendar,
  HardDrive,
  Cpu,
  Activity,
  History,
  Laptop,
  ShieldCheck,
  Database,
  CheckCircle2,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import { SearchResultItem, SearchSettings, ConversationalAnswer, DocumentItem, InstantWidget } from '../types';

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
  onNavigateTab,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [liveTime, setLiveTime] = useState<string | null>(null);
  const [is24Hour, setIs24Hour] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Live ticking clock for time queries with timezone and 12h/24h support
  useEffect(() => {
    if (instantWidget?.type !== 'time') {
      setLiveTime(null);
      return;
    }
    const updateTime = () => {
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

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [instantWidget, is24Hour]);

  // Real-time debounced search-as-you-type (sub-220ms responsiveness)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (!query.trim()) {
      return;
    }
    debounceRef.current = setTimeout(() => {
      onSearch(query, settings);
    }, 220);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Global keyboard shortcut '/' or 'Cmd+K' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) &&
        document.activeElement !== inputRef.current
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      onSearch(query, settings);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    onQueryChange(prompt);
    onSearch(prompt, settings);
  };

  const activeDoc = allDocuments.find(d => d.id === selectedDocId);

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-8">
      {/* Search Header & Input */}
      <div className="mb-6">
        <div className="relative mb-3">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
            <SearchIcon className="w-5 h-5" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search your private documents, records, or ask natural language questions..."
            className="w-full pl-12 pr-28 py-3.5 text-base bg-neutral-900 border border-neutral-700/80 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 transition-all shadow-lg"
          />

          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
            {query && (
              <button
                onClick={() => {
                  onQueryChange('');
                  onSearch('', settings);
                  inputRef.current?.focus();
                }}
                className="p-1.5 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer mr-1"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onSearch(query, settings)}
              className="px-3 py-1.5 text-xs font-semibold bg-neutral-100 hover:bg-white text-neutral-900 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Search</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Filter Modes & Parameters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Functional Mode Selector Buttons */}
          <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-lg">
            <button
              onClick={() => {
                const updated = { ...settings, searchMode: 'hybrid' as const };
                onUpdateSettings(updated);
                if (query) onSearch(query, updated);
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                settings.searchMode === 'hybrid'
                  ? 'bg-neutral-800 text-neutral-100 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Hybrid Semantic
            </button>

            <button
              onClick={() => {
                const updated = { ...settings, searchMode: 'semantic' as const };
                onUpdateSettings(updated);
                if (query) onSearch(query, updated);
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                settings.searchMode === 'semantic'
                  ? 'bg-neutral-800 text-neutral-100 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Semantic Vector
            </button>

            <button
              onClick={() => {
                const updated = { ...settings, searchMode: 'exact' as const };
                onUpdateSettings(updated);
                if (query) onSearch(query, updated);
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                settings.searchMode === 'exact'
                  ? 'bg-neutral-800 text-neutral-100 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Exact BM25
            </button>

            <button
              onClick={() => {
                const updated = { ...settings, searchMode: 'conversational' as const };
                onUpdateSettings(updated);
                if (query) onSearch(query, updated);
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                settings.searchMode === 'conversational'
                  ? 'bg-neutral-800 text-neutral-100 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              Conversational Q&A
            </button>
          </div>

          {/* Quick Settings & Status */}
          <div className="flex items-center gap-4 text-neutral-400">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.enableWebFallback}
                onChange={e => {
                  const updated = { ...settings, enableWebFallback: e.target.checked };
                  onUpdateSettings(updated);
                  if (query) onSearch(query, updated);
                }}
                className="rounded border-neutral-700 bg-neutral-900 text-neutral-100 focus:ring-0 w-3.5 h-3.5"
              />
              <span className="text-xs">Anonymous Web Fallback</span>
            </label>

            <button
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className="flex items-center gap-1 text-xs hover:text-neutral-200 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Weight ({Math.round(settings.hybridWeight * 100)}% Vec)</span>
            </button>
          </div>
        </div>

        {/* Fine-Tuning Drawer */}
        {showSettingsDrawer && (
          <div className="mt-3 p-3.5 rounded-lg bg-neutral-900/90 border border-neutral-800 text-xs text-neutral-300 flex flex-wrap items-center gap-6 animate-in fade-in duration-100">
            <div className="flex items-center gap-3">
              <span className="text-neutral-400">Semantic Vector Weight:</span>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={settings.hybridWeight}
                onChange={e => {
                  const updated = { ...settings, hybridWeight: parseFloat(e.target.value) };
                  onUpdateSettings(updated);
                }}
                className="w-32 accent-neutral-300 cursor-pointer"
              />
              <span className="font-mono text-neutral-200 tabular-nums">
                {Math.round(settings.hybridWeight * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-neutral-400">Min Local Match Threshold:</span>
              <input
                type="range"
                min="0.1"
                max="0.6"
                step="0.05"
                value={settings.minLocalConfidenceThreshold}
                onChange={e => {
                  const updated = { ...settings, minLocalConfidenceThreshold: parseFloat(e.target.value) };
                  onUpdateSettings(updated);
                }}
                className="w-28 accent-neutral-300 cursor-pointer"
              />
              <span className="font-mono text-neutral-200 tabular-nums">
                {Math.round(settings.minLocalConfidenceThreshold * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Machine Folder Status & Action */}
      {!query && results.length === 0 && (
        <div className="mb-8 pt-2">
          {allDocuments.length === 0 ? (
            <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 text-center max-w-lg mx-auto">
              <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300 mx-auto mb-3">
                <FileText className="w-5 h-5 text-neutral-300" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-100 mb-1">
                No Local Machine Files Indexed
              </h3>
              <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
                Veritas operates on your real computer files. Request access to your machine's file explorer
                to index your notes, code, documents, or research.
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-blue-400" />
                  Live Web Fallback: Ready
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/80 flex items-center justify-between text-xs font-mono text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-semibold">{allDocuments.length} machine files</span>
                <span>ready for semantic retrieval</span>
              </div>
              <span className="text-neutral-500">
                Type queries or use omnibox to search local files & live web
              </span>
            </div>
          )}

          {/* Quick Machine Inquiries Grid */}
          <div className="mt-6">
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Local Machine & System Inquiries</span>
              <span className="text-neutral-500">Zero Cloud · Real Hardware Telemetry</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              {[
                {
                  label: 'The Time',
                  q: 'the time',
                  desc: 'Precision local clock & world time',
                  icon: <Clock className="w-3.5 h-3.5 text-blue-400" />,
                },
                {
                  label: "Today's Date",
                  q: "today's date",
                  desc: 'Day of year, ISO week & calendar',
                  icon: <Calendar className="w-3.5 h-3.5 text-emerald-400" />,
                },
                {
                  label: 'Storage Capacity',
                  q: 'storage capacity',
                  desc: 'Disk space, quota & vault metrics',
                  icon: <HardDrive className="w-3.5 h-3.5 text-purple-400" />,
                },
                {
                  label: 'What I Have Done',
                  q: 'what i have done',
                  desc: 'Recent changes & activity history',
                  icon: <Activity className="w-3.5 h-3.5 text-amber-400" />,
                },
                {
                  label: 'Machine Specs',
                  q: 'machine specs',
                  desc: 'OS, CPU cores, RAM & display',
                  icon: <Laptop className="w-3.5 h-3.5 text-cyan-400" />,
                },
                {
                  label: 'Audit Trail',
                  q: 'audit log',
                  desc: 'SHA-256 tamper-evident ledger',
                  icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
                },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => {
                    onQueryChange(item.q);
                    onSearch(item.q, settings);
                  }}
                  className="p-3 text-left rounded-xl bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {item.icon}
                    <span className="font-semibold text-neutral-200 group-hover:text-white transition-colors">
                      {item.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 font-sans leading-tight">
                    {item.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Query Stats Bar */}
      {(results.length > 0 || isLoading || query) && (
        <div className="flex items-center justify-between text-xs text-neutral-400 pb-3 mb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span>{results.length} total results</span>
            <span aria-hidden="true">·</span>
            <span className="text-neutral-300 font-mono tabular-nums">{localResultsCount} local private</span>
            {webResultsCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-neutral-400 font-mono tabular-nums">{webResultsCount} anonymous web</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="flex items-center gap-1 text-neutral-400">
              <Clock className="w-3 h-3" />
              <span className="tabular-nums">{totalTimeMs}ms</span> latency
            </span>
          </div>
        </div>
      )}

      {/* Instant Answer / Real-Time Live Utility Card (Time, Date, Storage, System, Activity, Calculator, Direct Facts) */}
      {instantWidget && (
        <div className="mb-6 p-5 rounded-xl bg-neutral-900 border border-neutral-700/80 shadow-xl">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-mono mb-2">
            <span className="flex items-center gap-1.5 uppercase font-semibold text-neutral-300">
              {instantWidget.type === 'time' && <Clock className="w-3.5 h-3.5 text-blue-400" />}
              {instantWidget.type === 'date' && <Calendar className="w-3.5 h-3.5 text-emerald-400" />}
              {instantWidget.type === 'storage' && <HardDrive className="w-3.5 h-3.5 text-purple-400" />}
              {instantWidget.type === 'system' && <Laptop className="w-3.5 h-3.5 text-cyan-400" />}
              {instantWidget.type === 'activity' && <Activity className="w-3.5 h-3.5 text-amber-400" />}
              {instantWidget.type === 'calculator' && <Calculator className="w-3.5 h-3.5 text-emerald-400" />}
              {instantWidget.type === 'definition' && <BookOpen className="w-3.5 h-3.5 text-amber-400" />}
              {instantWidget.type === 'direct_answer' && <Sparkles className="w-3.5 h-3.5 text-blue-400" />}
              <span>{instantWidget.title}</span>
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">
              {instantWidget.source}
            </span>
          </div>

          {instantWidget.type === 'time' ? (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-4 mb-2">
                <div className="text-4xl sm:text-5xl font-mono font-bold text-white tracking-tight tabular-nums">
                  {liveTime || instantWidget.primaryValue}
                </div>
                <button
                  onClick={() => setIs24Hour(!is24Hour)}
                  className="px-2.5 py-1 text-xs font-mono rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors cursor-pointer"
                >
                  {is24Hour ? '24-hour' : '12-hour AM/PM'}
                </button>
              </div>

              {instantWidget.secondaryValue && (
                <div className="text-sm font-medium text-neutral-200 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-neutral-400" />
                  <span>{instantWidget.secondaryValue.split(' · ')[0]}</span>
                </div>
              )}
              {instantWidget.details && (
                <div className="text-xs text-neutral-400 font-mono mb-3">
                  {instantWidget.details}
                </div>
              )}

              {/* World Clock Quick Cities */}
              <div className="pt-3 border-t border-neutral-800/80 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-neutral-500 font-mono">World Time:</span>
                {[
                  { label: 'Local Time', q: 'the time' },
                  { label: 'London', q: 'time in london' },
                  { label: 'New York', q: 'time in new york' },
                  { label: 'Tokyo', q: 'time in tokyo' },
                  { label: 'Nairobi', q: 'time in nairobi' },
                  { label: 'UTC', q: 'time in utc' },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => {
                      onQueryChange(item.q);
                      onSearch(item.q, settings);
                    }}
                    className="px-2 py-0.5 text-[11px] font-mono rounded bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800/80 hover:border-neutral-600 transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : instantWidget.type === 'date' ? (
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
                {instantWidget.primaryValue}
              </div>
              <div className="text-xs font-mono text-emerald-400 mb-4">
                {instantWidget.secondaryValue}
              </div>

              {/* Day of Year Progress Bar */}
              {instantWidget.dateData && (
                <div className="mb-4 p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-1.5">
                    <span>Year Progress ({new Date().getFullYear()})</span>
                    <span className="text-neutral-200 font-semibold">{instantWidget.dateData.percentOfYear}% elapsed</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(1, instantWidget.dateData.percentOfYear))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mt-1.5">
                    <span>Day {instantWidget.dateData.dayOfYear} of {instantWidget.dateData.totalDaysInYear}</span>
                    <span>{instantWidget.dateData.daysRemainingInYear} days remaining</span>
                  </div>
                </div>
              )}

              {/* Calendar Details Grid */}
              {instantWidget.dateData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono mb-4">
                  <div className="p-2.5 rounded bg-neutral-950/60 border border-neutral-800/80">
                    <div className="text-neutral-500 text-[10px] uppercase">ISO Week</div>
                    <div className="text-neutral-200 font-semibold text-sm">Week {instantWidget.dateData.weekNumber}</div>
                  </div>
                  <div className="p-2.5 rounded bg-neutral-950/60 border border-neutral-800/80">
                    <div className="text-neutral-500 text-[10px] uppercase">Year Type</div>
                    <div className="text-neutral-200 font-semibold text-sm">
                      {instantWidget.dateData.isLeapYear ? 'Leap Year' : 'Common Year'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-neutral-950/60 border border-neutral-800/80">
                    <div className="text-neutral-500 text-[10px] uppercase">Timezone</div>
                    <div className="text-neutral-200 font-semibold text-xs truncate" title={instantWidget.dateData.timeZone}>
                      {instantWidget.dateData.timeZone}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-neutral-950/60 border border-neutral-800/80">
                    <div className="text-neutral-500 text-[10px] uppercase">Unix Seconds</div>
                    <div className="text-neutral-200 font-semibold text-xs tabular-nums">
                      {instantWidget.dateData.unixSeconds}
                    </div>
                  </div>
                </div>
              )}

              {/* Related Machine Queries */}
              <div className="pt-3 border-t border-neutral-800/80 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-neutral-500 font-mono">Quick Inquiries:</span>
                {[
                  { label: 'The Time', q: 'the time' },
                  { label: 'Storage Capacity', q: 'storage capacity' },
                  { label: 'Machine Specs', q: 'machine specs' },
                  { label: 'What I Have Done', q: 'what i have done' },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => {
                      onQueryChange(item.q);
                      onSearch(item.q, settings);
                    }}
                    className="px-2 py-0.5 text-[11px] font-mono rounded bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800/80 hover:border-neutral-600 transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : instantWidget.type === 'storage' ? (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-4 mb-2">
                <div>
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight tabular-nums">
                    {instantWidget.storageData ? instantWidget.storageData.usedFormatted : instantWidget.primaryValue}
                  </div>
                  <div className="text-xs font-mono text-neutral-400">
                    used of {instantWidget.storageData?.quotaFormatted || 'allocated machine storage'}
                  </div>
                </div>
                {instantWidget.storageData && (
                  <div className="text-right">
                    <div className="text-lg font-mono font-semibold text-emerald-400 tabular-nums">
                      {instantWidget.storageData.freeFormatted}
                    </div>
                    <div className="text-[11px] font-mono text-neutral-500">Free Machine Space</div>
                  </div>
                )}
              </div>

              {/* Storage Quota Progress Bar */}
              {instantWidget.storageData && (
                <div className="mb-4 p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-1.5">
                    <span>Machine Storage Quota</span>
                    <span className="text-neutral-200 font-semibold tabular-nums">
                      {instantWidget.storageData.percentUsed}% consumed
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        instantWidget.storageData.percentUsed > 85
                          ? 'bg-rose-500'
                          : instantWidget.storageData.percentUsed > 60
                          ? 'bg-amber-500'
                          : 'bg-purple-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(1, instantWidget.storageData.percentUsed || 1))}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mt-1.5">
                    <span>{instantWidget.storageData.usedFormatted} Indexed</span>
                    <span>{instantWidget.storageData.quotaFormatted} System Limit</span>
                  </div>
                </div>
              )}

              {/* Storage Telemetry Breakdown Grid */}
              {instantWidget.storageData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono mb-4">
                  <div className="p-3 rounded bg-neutral-950/70 border border-neutral-800/80">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
                      <FileText className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Vault Documents</span>
                    </div>
                    <div className="text-sm font-semibold text-neutral-100">
                      {instantWidget.storageData.vaultDocsCount} files
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {instantWidget.storageData.vaultSizeFormatted} indexed
                    </div>
                  </div>

                  <div className="p-3 rounded bg-neutral-950/70 border border-neutral-800/80">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
                      <Layers className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Vector Embeddings</span>
                    </div>
                    <div className="text-sm font-semibold text-neutral-100">
                      {instantWidget.storageData.vaultVectorsCount} vectors
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      64-dim embeddings
                    </div>
                  </div>

                  <div className="p-3 rounded bg-neutral-950/70 border border-neutral-800/80">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Persistence</span>
                    </div>
                    <div className="text-sm font-semibold text-neutral-100 truncate">
                      {instantWidget.storageData.persisted ? 'Persisted' : 'Standard'}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {instantWidget.storageData.persisted ? 'Protected from wipe' : 'Sandbox storage'}
                    </div>
                  </div>

                  <div className="p-3 rounded bg-neutral-950/70 border border-neutral-800/80">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
                      <HardDrive className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Connected Folder</span>
                    </div>
                    <div className="text-sm font-semibold text-neutral-100 truncate" title={instantWidget.storageData.connectedFolder || 'None'}>
                      {instantWidget.storageData.connectedFolder ? 'Connected' : 'None'}
                    </div>
                    <div className="text-[11px] text-neutral-500 truncate mt-0.5" title={instantWidget.storageData.connectedFolder || 'Select a folder in Vault'}>
                      {instantWidget.storageData.connectedFolder || 'Attach file explorer'}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons & Quick Nav */}
              <div className="pt-3 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-neutral-500 font-mono">Related Queries:</span>
                  {[
                    { label: 'Machine Specs', q: 'machine specs' },
                    { label: 'What I Have Done', q: 'what i have done' },
                    { label: "Today's Date", q: "today's date" },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={() => {
                        onQueryChange(item.q);
                        onSearch(item.q, settings);
                      }}
                      className="px-2 py-0.5 text-[11px] font-mono rounded bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800/80 hover:border-neutral-600 transition-colors cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('vault')}
                    className="px-3 py-1 text-xs font-medium rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Database className="w-3 h-3 text-purple-400" />
                    <span>Manage Vault Storage</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ) : instantWidget.type === 'system' ? (
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1">
                {instantWidget.systemData ? instantWidget.systemData.os : instantWidget.primaryValue}
              </div>
              <div className="text-xs font-mono text-cyan-400 mb-4">
                {instantWidget.systemData ? `${instantWidget.systemData.cpuCores} Logical CPU Cores · ${instantWidget.systemData.browser}` : instantWidget.secondaryValue}
              </div>

              {/* System Specs Grid */}
              {instantWidget.systemData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs font-mono mb-4">
                  <div className="p-3 rounded bg-neutral-950/70 border border-neutral-800/80">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Processor Cores</span>
                    </div>
                    <div className="text-sm font-semibold text-neutral-100">
                      {instantWidget.systemData.cpuCores} Logical Cores
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      Hardware Concurrency
                    </div>
                  </div>

                  <div className="p-3 rounded bg-neutral-950/70 border border-neutral-800/80">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
                      <Laptop className="w-3.5 h-3.5 text-blue-400" />
                      <span>Display & Canvas</span>
                    </div>
                    <div className="text-sm font-semibold text-neutral-100">
                      {instantWidget.systemData.screenResolution}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {instantWidget.systemData.pixelRatio}x DPR · {instantWidget.systemData.colorDepth}-bit color
                    </div>
                  </div>

                  <div className="p-3 rounded bg-neutral-950/70 border border-neutral-800/80">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Network Status</span>
                    </div>
                    <div className="text-sm font-semibold text-neutral-100 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${instantWidget.systemData.isOnline ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <span>{instantWidget.systemData.isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {instantWidget.systemData.connectionType || 'Standard Connection'}
                    </div>
                  </div>

                  <div className="p-3 rounded bg-neutral-950/70 border border-neutral-800/80">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
                      <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                      <span>Machine Storage</span>
                    </div>
                    <div className="text-sm font-semibold text-neutral-100">
                      {instantWidget.systemData.storage.usedFormatted} used
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      of {instantWidget.systemData.storage.quotaFormatted} quota
                    </div>
                  </div>

                  <div className="p-3 rounded bg-neutral-950/70 border border-neutral-800/80">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Runtime Environment</span>
                    </div>
                    <div className="text-sm font-semibold text-neutral-100 truncate">
                      {instantWidget.systemData.browser}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      WebAssembly & WebCrypto
                    </div>
                  </div>

                  <div className="p-3 rounded bg-neutral-950/70 border border-neutral-800/80">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
                      <Database className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Vault Files</span>
                    </div>
                    <div className="text-sm font-semibold text-neutral-100">
                      {instantWidget.systemData.storage.vaultDocsCount} Indexed Files
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {instantWidget.systemData.storage.vaultVectorsCount} Vectors
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Navigation Chips */}
              <div className="pt-3 border-t border-neutral-800/80 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-neutral-500 font-mono">Quick Inquiries:</span>
                {[
                  { label: 'Storage Capacity', q: 'storage capacity' },
                  { label: 'What I Have Done', q: 'what i have done' },
                  { label: "Today's Date", q: "today's date" },
                  { label: 'The Time', q: 'the time' },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => {
                      onQueryChange(item.q);
                      onSearch(item.q, settings);
                    }}
                    className="px-2 py-0.5 text-[11px] font-mono rounded bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800/80 hover:border-neutral-600 transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : instantWidget.type === 'activity' ? (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-4 mb-2">
                <div>
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight">
                    {instantWidget.activityData ? `${instantWidget.activityData.totalEvents} Actions Recorded` : instantWidget.primaryValue}
                  </div>
                  <div className="text-xs font-mono text-neutral-400 mt-0.5">
                    Tamper-evident client ledger on this machine
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 px-2 py-1 rounded bg-neutral-950 border border-neutral-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>SHA-256 Verified</span>
                </div>
              </div>

              {/* Category Counts Breakdown */}
              {instantWidget.activityData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono mb-4">
                  <div className="p-2.5 rounded bg-neutral-950/70 border border-neutral-800/80">
                    <div className="text-neutral-500 text-[10px] uppercase">Files Ingested</div>
                    <div className="text-emerald-400 font-semibold text-base">
                      {instantWidget.activityData.ingestCount}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-neutral-950/70 border border-neutral-800/80">
                    <div className="text-neutral-500 text-[10px] uppercase">Searches Run</div>
                    <div className="text-blue-400 font-semibold text-base">
                      {instantWidget.activityData.queryCount}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-neutral-950/70 border border-neutral-800/80">
                    <div className="text-neutral-500 text-[10px] uppercase">Files Removed</div>
                    <div className="text-rose-400 font-semibold text-base">
                      {instantWidget.activityData.purgeCount}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-neutral-950/70 border border-neutral-800/80">
                    <div className="text-neutral-500 text-[10px] uppercase">Sync Bundles</div>
                    <div className="text-purple-400 font-semibold text-base">
                      {instantWidget.activityData.syncCount}
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Changes List */}
              {instantWidget.activityData && instantWidget.activityData.recentChanges.length > 0 ? (
                <div className="mb-4 space-y-1.5">
                  <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Recent Activity & System Changes</span>
                    <span className="text-neutral-500">Chronological</span>
                  </div>
                  {instantWidget.activityData.recentChanges.slice(0, 6).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-2.5 rounded bg-neutral-950/80 border border-neutral-800/70 flex items-start justify-between gap-3 text-xs font-mono"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                            item.action === 'INGEST'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                              : item.action === 'QUERY'
                              ? 'bg-blue-950/80 text-blue-400 border border-blue-800/50'
                              : item.action === 'PURGE'
                              ? 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                              : item.action === 'SYNC' || item.action === 'EXPORT'
                              ? 'bg-purple-950/80 text-purple-400 border border-purple-800/50'
                              : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                          }`}
                        >
                          {item.action}
                        </span>
                        <div className="min-w-0">
                          <div className="text-neutral-200 text-xs leading-snug break-words">
                            {item.details}
                          </div>
                          <div className="text-[10px] text-neutral-500 mt-0.5 flex items-center gap-2">
                            <span>Role: {item.actorRole}</span>
                            <span aria-hidden="true">·</span>
                            <span title="SHA-256 block hash" className="text-neutral-600">
                              #{item.hashShort}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-neutral-400 shrink-0 tabular-nums">
                        {item.relativeTime}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-4 p-4 rounded bg-neutral-950/60 border border-neutral-800 text-center text-xs text-neutral-500 font-mono">
                  No activity has been recorded yet on this machine.
                </div>
              )}

              {/* Action Buttons & Quick Nav */}
              <div className="pt-3 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-neutral-500 font-mono">Quick Inquiries:</span>
                  {[
                    { label: 'Storage Capacity', q: 'storage capacity' },
                    { label: 'Machine Specs', q: 'machine specs' },
                    { label: "Today's Date", q: "today's date" },
                    { label: 'The Time', q: 'the time' },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={() => {
                        onQueryChange(item.q);
                        onSearch(item.q, settings);
                      }}
                      className="px-2 py-0.5 text-[11px] font-mono rounded bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800/80 hover:border-neutral-600 transition-colors cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('audit')}
                    className="px-3 py-1 text-xs font-medium rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>View Full Audit Ledger</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ) : instantWidget.type === 'calculator' ? (
            <div>
              <div className="text-xs font-mono text-neutral-400 mb-1">
                {instantWidget.secondaryValue}
              </div>
              <div className="text-3xl font-mono font-bold text-emerald-400 tabular-nums">
                = {instantWidget.primaryValue}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm leading-relaxed text-neutral-100 font-normal mb-2">
                {instantWidget.primaryValue}
              </div>
              {instantWidget.sourceUrl && (
                <a
                  href={instantWidget.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <span>Read full entry on {instantWidget.source}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Conversational Synthesis Card */}
      {conversationalAnswer && (
        <div className="mb-6 p-5 rounded-xl bg-neutral-900 border border-neutral-800 shadow-md">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Synthesized Contextual Intelligence (Local Zero-Cloud)</span>
            </div>
            <span className="text-xs font-mono text-neutral-400 tabular-nums">
              Confidence: {Math.round(conversationalAnswer.confidence * 100)}%
            </span>
          </div>

          <div className="text-xs leading-relaxed text-neutral-200 whitespace-pre-line mb-4 font-normal">
            {conversationalAnswer.synthesizedAnswer}
          </div>

          {conversationalAnswer.citations.length > 0 && (
            <div className="pt-3 border-t border-neutral-800/80">
              <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Contextual Source References
              </div>
              <div className="space-y-1.5">
                {conversationalAnswer.citations.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedDocId(c.docId)}
                    className="flex items-center justify-between gap-3 p-2 rounded bg-neutral-950/50 hover:bg-neutral-800/60 border border-neutral-800/50 text-xs cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3 h-3 text-neutral-400 shrink-0" />
                      <span className="font-medium text-neutral-200 truncate">{c.title}</span>
                      <span className="text-neutral-500 font-mono text-[11px]">"{c.passage.slice(0, 70)}..."</span>
                    </div>
                    <span className="text-neutral-400 font-mono text-[11px] shrink-0 tabular-nums">
                      {Math.round(c.relevance * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results List */}
      <div className="space-y-3.5">
        {results.map(item => (
          <div
            key={item.docId}
            onClick={() => {
              if (item.source === 'local') {
                setSelectedDocId(item.docId);
              } else if (item.sourceUrl) {
                window.open(item.sourceUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            className="p-4 rounded-xl bg-neutral-900/70 hover:bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700 transition-all cursor-pointer group"
          >
            {/* Unboxed Metadata Line (Strictly Anti-Slop: No Pill Sandwiches!) */}
            <div className="flex items-center justify-between gap-4 text-xs text-neutral-400 mb-1.5 font-mono">
              <div className="flex items-center gap-2">
                {item.source === 'local' ? (
                  <>
                    <span className="uppercase text-[11px] text-neutral-300 font-semibold">{item.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      Local Machine File
                    </span>
                    {item.filePath && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-neutral-500 text-[11px] truncate max-w-xs">{item.filePath}</span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-blue-400 text-[11px] flex items-center gap-1">
                      <Globe className="w-2.5 h-2.5" />
                      Live Web Result
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] tabular-nums">
                {item.source === 'local' ? (
                  <>
                    <span>
                      Match: <strong className="text-neutral-200">{Math.round(item.hybridScore * 100)}%</strong>
                    </span>
                    <span className="hidden sm:inline text-neutral-500">
                      (Vec: {Math.round(item.vectorScore * 100)}% · BM25: {Math.round(item.bm25Score * 100)}%)
                    </span>
                  </>
                ) : (
                  <span className="text-neutral-500">
                    Internet Source
                  </span>
                )}
              </div>
            </div>

            {/* Title */}
            <h3 className="text-sm font-semibold text-neutral-100 group-hover:text-white transition-colors mb-1.5 flex items-center gap-2">
              <span>{item.title}</span>
              {item.source === 'web' && <ExternalLink className="w-3 h-3 text-neutral-400" />}
            </h3>

            {/* Snippet */}
            <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">
              {item.snippet}
            </p>
          </div>
        ))}

        {query && results.length === 0 && !isLoading && !instantWidget && !conversationalAnswer && (
          <div className="p-8 text-center rounded-xl bg-neutral-900/40 border border-neutral-800/60 text-neutral-400">
            <p className="text-xs mb-2">No matching results found for "{query}".</p>
            <p className="text-[11px] text-neutral-500">
              Check internet connection for live web fallback, or connect a folder in the Vault tab.
            </p>
          </div>
        )}
      </div>

      {/* Document Detail Preview Drawer */}
      {activeDoc && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-neutral-900 border-l border-neutral-800 shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-neutral-400" />
              <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                Document Vault Preview
              </span>
            </div>
            <button
              onClick={() => setSelectedDocId(null)}
              className="text-neutral-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-[11px] text-neutral-400 font-mono uppercase mb-1">
                {activeDoc.category} · {activeDoc.tokensCount} tokens
              </div>
              <h2 className="text-base font-bold text-neutral-100 mb-2">{activeDoc.title}</h2>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {activeDoc.tags.map((tag, i) => (
                  <span key={i} className="text-[11px] font-mono text-neutral-400 bg-neutral-800/60 px-2 py-0.5 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800/80 font-mono text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">
              {activeDoc.content || '(Encrypted payload - unlock vault to view plaintext)'}
            </div>

            <div className="pt-2 text-[11px] text-neutral-400 font-mono">
              ID: {activeDoc.id} · Version: {activeDoc.version} · Indexed in Local IndexedDB
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
