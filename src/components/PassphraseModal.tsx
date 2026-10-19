/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { KeyRound, X, AlertCircle } from 'lucide-react';
import { deriveKeyFromPassphrase, generateSalt } from '../lib/crypto';

export type PassphraseMode = 'unlock' | 'create';

interface PassphraseModalProps {
  isOpen: boolean;
  mode: PassphraseMode;
  onClose: () => void;
  onUnlocked: (key: CryptoKey, salt: Uint8Array, mode: PassphraseMode) => void;
  savedSalt?: Uint8Array | null;
}

export const PassphraseModal: React.FC<PassphraseModalProps> = ({
  isOpen,
  mode,
  onClose,
  onUnlocked,
  savedSalt,
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isDeriving, setIsDeriving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isCreate = mode === 'create';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) {
      setError('Enter a passphrase');
      return;
    }
    if (isCreate) {
      if (passphrase.length < 8) {
        setError('Use at least 8 characters');
        return;
      }
      if (passphrase !== confirm) {
        setError('Passphrases do not match');
        return;
      }
    }

    try {
      setIsDeriving(true);
      setError(null);
      const salt = isCreate ? generateSalt(16) : savedSalt || generateSalt(16);
      const derivedKey = await deriveKeyFromPassphrase(passphrase, salt);
      onUnlocked(derivedKey, salt, mode);
      setPassphrase('');
      setConfirm('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Key derivation failed');
    } finally {
      setIsDeriving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-sm rounded-lg border border-neutral-700 bg-neutral-950 p-5 shadow-xl"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vault-key-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded p-1 text-neutral-500 hover:text-neutral-200"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded border border-neutral-700 bg-neutral-900 text-neutral-300">
            <KeyRound className="w-4 h-4" />
          </span>
          <div>
            <h2 id="vault-key-title" className="text-sm font-medium text-neutral-100">
              {isCreate ? 'Create vault key' : 'Unlock vault'}
            </h2>
            <p className="text-xs text-neutral-500">
              {isCreate
                ? 'New passphrase · key stays on this device'
                : 'Enter the passphrase for this vault'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-3 flex items-start gap-2 rounded border border-rose-900/50 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="vault-pass" className="mb-1 block text-xs text-neutral-400">
              Passphrase
            </label>
            <input
              id="vault-pass"
              type="password"
              autoComplete={isCreate ? 'new-password' : 'current-password'}
              value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
              placeholder={isCreate ? 'Choose a strong passphrase' : 'Your vault passphrase'}
              autoFocus
            />
          </div>

          {isCreate && (
            <div>
              <label htmlFor="vault-pass-confirm" className="mb-1 block text-xs text-neutral-400">
                Confirm
              </label>
              <input
                id="vault-pass-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
                placeholder="Repeat passphrase"
              />
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-neutral-600">
            Derived with PBKDF2 (100k) → AES-256-GCM. Never sent off this device. If you forget
            the passphrase, encrypted data cannot be recovered.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDeriving}
              className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
            >
              {isDeriving ? 'Working…' : isCreate ? 'Create key' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
