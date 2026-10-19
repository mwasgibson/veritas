/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Menu, X, Search, Database, Globe, Shield, FileText } from 'lucide-react';
import { UserRole } from '../types';

interface HeaderProps {
  currentTab: 'search' | 'vault' | 'browser' | 'audit' | 'docs';
  onSelectTab: (tab: 'search' | 'vault' | 'browser' | 'audit' | 'docs') => void;
  isUnlocked: boolean;
  userRole: UserRole;
  documentsCount: number;
  isOnline: boolean;
}

const NAV: {
  id: HeaderProps['currentTab'];
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: 'search', label: 'Search', icon: <Search className="w-4 h-4" /> },
  { id: 'vault', label: 'Vault', icon: <Database className="w-4 h-4" /> },
  { id: 'browser', label: 'Sync', icon: <Globe className="w-4 h-4" /> },
  { id: 'audit', label: 'Audit', icon: <Shield className="w-4 h-4" /> },
  { id: 'docs', label: 'Docs', icon: <FileText className="w-4 h-4" /> },
];

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  isUnlocked,
  userRole,
  documentsCount,
  isOnline,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const select = (tab: HeaderProps['currentTab']) => {
    onSelectTab(tab);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => select('search')}
          className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-500 rounded"
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded border border-neutral-700 bg-neutral-900 font-mono text-sm text-neutral-200"
            aria-hidden
          >
            ∇
          </span>
          <span className="text-sm font-medium tracking-tight text-neutral-100">Veritas</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-wide text-neutral-500">
            {isUnlocked ? 'Unlocked' : 'Locked'} · {userRole}
            {isOnline ? '' : ' · offline'}
          </span>

          <button
            ref={buttonRef}
            type="button"
            onClick={() => setMenuOpen(o => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-500"
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50" role="presentation">
          <div className="absolute inset-0 bg-black/50" aria-hidden />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute right-3 top-14 w-[min(100%-1.5rem,18rem)] rounded-lg border border-neutral-700 bg-neutral-950 shadow-xl sm:right-6"
          >
            <nav className="py-2">
              {NAV.map(item => {
                const active = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => select(item.id)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      active
                        ? 'bg-neutral-900 text-neutral-100'
                        : 'text-neutral-400 hover:bg-neutral-900/80 hover:text-neutral-200'
                    }`}
                  >
                    <span className={active ? 'text-neutral-200' : 'text-neutral-500'}>
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.id === 'vault' && documentsCount > 0 && (
                      <span className="font-mono text-[11px] text-neutral-500">{documentsCount}</span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-neutral-800 px-4 py-2.5 font-mono text-[10px] text-neutral-600">
              Local index · AES-256-GCM · no telemetry
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
