/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, KeyRound, Check, X, Sparkles, AlertCircle } from 'lucide-react';
import { deriveKeyFromPassphrase, generateSalt } from '../lib/crypto';

interface PassphraseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlocked: (key: CryptoKey, salt: Uint8Array) => void;
  savedSalt?: Uint8Array | null;
}

export const PassphraseModal: React.FC<PassphraseModalProps> = ({
  isOpen,
  onClose,
  onUnlocked,
  savedSalt,
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [isDeriving, setIsDeriving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) {
      setError('Please provide a secure master passphrase');
      return;
    }

    try {
      setIsDeriving(true);
      setError(null);

      const salt = savedSalt || generateSalt(16);
      const derivedKey = await deriveKeyFromPassphrase(passphrase, salt);

      onUnlocked(derivedKey, salt);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to derive cryptographic key');
    } finally {
      setIsDeriving(false);
    }
  };

  const handleQuickDemoPassphrase = () => {
    setPassphrase('veritas-sovereign-vault-2026');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl relative text-neutral-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-200 transition-colors p-1"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-200">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-100">Unlock Sovereign Vault</h2>
            <p className="text-xs text-neutral-400">Zero-knowledge local client-side key derivation</p>
          </div>
        </div>

        <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
          Your passphrase derives an AES-256-GCM encryption key using PBKDF2 (100,000 rounds of SHA-256). 
          The key remains strictly in volatile browser RAM and is never stored or transmitted.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Master Passphrase
            </label>
            <input
              type="password"
              value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
              placeholder="Enter your private vault passphrase..."
              className="w-full px-3.5 py-2.5 text-sm bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 transition-colors"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
            <button
              type="button"
              onClick={handleQuickDemoPassphrase}
              className="text-neutral-400 hover:text-neutral-200 transition-colors flex items-center gap-1 underline underline-offset-2"
            >
              <Sparkles className="w-3 h-3" />
              Use standard demo passphrase
            </button>
            <span className="font-mono text-[11px] text-neutral-400">PBKDF2 · SHA-256</span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDeriving}
              className="px-4 py-2 text-xs font-semibold bg-neutral-100 hover:bg-white text-neutral-900 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isDeriving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                  <span>Deriving Key...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Unlock & Decrypt</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
