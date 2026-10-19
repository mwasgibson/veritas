/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Lock, Unlock, Shield, Search, Database, Globe, FileText, CheckCircle2 } from 'lucide-react';
import { UserRole } from '../types';

interface HeaderProps {
  currentTab: 'search' | 'vault' | 'browser' | 'audit' | 'docs';
  onSelectTab: (tab: 'search' | 'vault' | 'browser' | 'audit' | 'docs') => void;
  isUnlocked: boolean;
  onToggleLock: () => void;
  userRole: UserRole;
  documentsCount: number;
  isOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  isUnlocked,
  onToggleLock,
  userRole,
  documentsCount,
  isOnline,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-3.5">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center text-neutral-100 font-mono font-bold text-sm tracking-wider">
            ∇
          </div>
          <button
            onClick={() => onSelectTab('search')}
            className="text-left group cursor-pointer focus:outline-none"
          >
            <span className="text-base font-semibold tracking-tight text-neutral-100 group-hover:text-white transition-colors whitespace-nowrap">
              Veritas
            </span>
          </button>
        </div>

        <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-neutral-400">
          <button
            onClick={() => onSelectTab('search')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 py-1 ${
              currentTab === 'search'
                ? 'text-white border-b-2 border-white font-semibold'
                : 'hover:text-neutral-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>

          <button
            onClick={() => onSelectTab('vault')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 py-1 ${
              currentTab === 'vault'
                ? 'text-white border-b-2 border-white font-semibold'
                : 'hover:text-neutral-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Vault</span>
            <span className="font-mono text-[11px] text-neutral-400">({documentsCount})</span>
          </button>

          <button
            onClick={() => onSelectTab('browser')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 py-1 ${
              currentTab === 'browser'
                ? 'text-white border-b-2 border-white font-semibold'
                : 'hover:text-neutral-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>

          <button
            onClick={() => onSelectTab('audit')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 py-1 ${
              currentTab === 'audit'
                ? 'text-white border-b-2 border-white font-semibold'
                : 'hover:text-neutral-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Audit</span>
          </button>

          <button
            onClick={() => onSelectTab('docs')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 py-1 ${
              currentTab === 'docs'
                ? 'text-white border-b-2 border-white font-semibold'
                : 'hover:text-neutral-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Docs</span>
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-400 font-mono">
            <span className="uppercase text-[10px] tracking-wider text-neutral-400 font-semibold">{userRole}</span>
            <span className="text-neutral-700">·</span>
            <span className="text-emerald-400 text-[11px] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Machine Index
            </span>
            <span className="text-neutral-700">·</span>
            {isOnline ? (
              <span className="text-blue-400 text-[11px] flex items-center gap-1">
                <Globe className="w-3 h-3 text-blue-400" />
                Live Web
              </span>
            ) : (
              <span className="text-neutral-500 text-[11px]">Offline</span>
            )}
          </div>

          <button
            onClick={onToggleLock}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              isUnlocked
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                : 'bg-neutral-100 hover:bg-white text-neutral-900 font-semibold'
            }`}
          >
            {isUnlocked ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Unlocked</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-neutral-900" />
                <span>Unlock</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
