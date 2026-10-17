/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Users,
  Activity,
  Lock,
  WifiOff,
} from 'lucide-react';
import { AuditLogEntry, UserRole } from '../types';
import { storageEngine } from '../lib/storage';
import { computeSha256 } from '../lib/crypto';

interface AuditViewProps {
  currentRole: UserRole;
  onChangeRole: (role: UserRole) => void;
}

export const AuditView: React.FC<AuditViewProps> = ({ currentRole, onChangeRole }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    checkedCount: number;
    message: string;
  } | null>(null);

  const loadLogs = async () => {
    const fetched = await storageEngine.getAuditLogs();
    setLogs(fetched.reverse()); // Latest first
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const allLogs = await storageEngine.getAuditLogs(); // In chronological order
      if (allLogs.length === 0) {
        setVerificationResult({
          valid: true,
          checkedCount: 0,
          message: 'No audit records to verify. Audit chain is clean.',
        });
        return;
      }

      let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';
      for (let i = 0; i < allLogs.length; i++) {
        const entry = allLogs[i];
        if (entry.prevHash !== expectedPrevHash) {
          setVerificationResult({
            valid: false,
            checkedCount: i + 1,
            message: `Hash link broken at record index ${i}: prevHash does not match prior block.`,
          });
          return;
        }

        const calculated = await computeSha256(
          `${entry.prevHash}:${entry.action}:${entry.actorRole}:${entry.details}:${entry.timestamp}`
        );

        if (calculated !== entry.hash) {
          setVerificationResult({
            valid: false,
            checkedCount: i + 1,
            message: `Tamper detected at record index ${i}: signature mismatch.`,
          });
          return;
        }

        expectedPrevHash = entry.hash;
      }

      setVerificationResult({
        valid: true,
        checkedCount: allLogs.length,
        message: `Cryptographic chain intact: All ${allLogs.length} blocks verified via SHA-256. Zero tampering.`,
      });
    } catch (err: any) {
      setVerificationResult({
        valid: false,
        checkedCount: 0,
        message: `Verification failed: ${err?.message}`,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-8">
      {/* Top Header */}
      <div className="pb-6 border-b border-neutral-800">
        <h1 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
          <Shield className="w-5 h-5 text-neutral-400" />
          <span>Security Governance, RBAC & Cryptographic Audit</span>
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Cryptographically linked SHA-256 audit log, role-based access control, and zero-telemetry enforcement.
        </p>
      </div>

      {/* Role-Based Access Control Switcher */}
      <div className="mt-6 p-5 rounded-xl bg-neutral-900/60 border border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-neutral-400" />
            <h2 className="text-sm font-semibold text-neutral-200">Active Security Role (RBAC)</h2>
          </div>
          <span className="text-xs font-mono text-neutral-400">Current: <strong className="text-neutral-100 uppercase">{currentRole}</strong></span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              role: 'owner' as UserRole,
              title: 'Owner (Sovereign)',
              desc: 'Full read, write, indexing, key derivation, sync export, and vault purge privileges.',
            },
            {
              role: 'auditor' as UserRole,
              title: 'Auditor (Read-Only)',
              desc: 'Query capability and full cryptographic audit inspection. Ingestion & purge restricted.',
            },
            {
              role: 'guest' as UserRole,
              title: 'Guest (Restricted)',
              desc: 'Transient local search only. No raw vault inspection, no export, no log tampering.',
            },
          ].map(item => (
            <button
              key={item.role}
              onClick={() => onChangeRole(item.role)}
              className={`p-3.5 text-left rounded-lg border transition-all cursor-pointer ${
                currentRole === item.role
                  ? 'bg-neutral-800 border-neutral-600 text-neutral-100 shadow-sm'
                  : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <div className="text-xs font-bold mb-1">{item.title}</div>
              <p className="text-[11px] text-neutral-400 leading-normal">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Zero Telemetry & Privacy Invariants */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 mb-1">
            <WifiOff className="w-3.5 h-3.5 text-emerald-400" />
            <span>Outbound Telemetry</span>
          </div>
          <div className="text-lg font-mono font-bold text-neutral-100 tabular-nums">0.00 KB</div>
          <p className="text-[11px] text-neutral-500 mt-1">Zero remote beacons, trackers, or telemetry hooks.</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 mb-1">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Local Encryption</span>
          </div>
          <div className="text-lg font-mono font-bold text-neutral-100">AES-256-GCM</div>
          <p className="text-[11px] text-neutral-500 mt-1">PBKDF2 100k rounds SHA-256 key derivation.</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 mb-1">
            <Activity className="w-3.5 h-3.5 text-neutral-400" />
            <span>Audit Entries</span>
          </div>
          <div className="text-lg font-mono font-bold text-neutral-100 tabular-nums">{logs.length}</div>
          <p className="text-[11px] text-neutral-500 mt-1">Merkle-linked tamper-evident chain.</p>
        </div>
      </div>

      {/* Cryptographic Chain Verification Section */}
      <div className="mt-6 p-5 rounded-xl bg-neutral-900/60 border border-neutral-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">Tamper-Evident SHA-256 Hash Chain</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Every operation links cryptographically to the prior block hash: H(n) = SHA256(H(n-1) + event).
            </p>
          </div>
          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="px-3.5 py-1.5 text-xs font-semibold bg-neutral-100 hover:bg-white text-neutral-900 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Verifying...' : 'Verify Cryptographic Chain'}</span>
          </button>
        </div>

        {verificationResult && (
          <div
            className={`p-3 rounded-lg border text-xs mb-4 flex items-start gap-2.5 ${
              verificationResult.valid
                ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300'
                : 'bg-rose-950/40 border-rose-900/60 text-rose-300'
            }`}
          >
            {verificationResult.valid ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            )}
            <span>{verificationResult.message}</span>
          </div>
        )}

        {/* Audit Log Table */}
        <div className="overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900 text-neutral-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 font-medium">Timestamp</th>
                <th className="py-2.5 px-3 font-medium">Action</th>
                <th className="py-2.5 px-3 font-medium">Role</th>
                <th className="py-2.5 px-3 font-medium">Details</th>
                <th className="py-2.5 px-3 font-medium font-mono">Block Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 font-sans">
              {logs.slice(0, 15).map(log => (
                <tr key={log.id} className="hover:bg-neutral-900/40 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-neutral-400 tabular-nums whitespace-nowrap text-[11px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-neutral-200 text-[11px]">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-3 uppercase font-mono text-neutral-400 text-[10px]">
                    {log.actorRole}
                  </td>
                  <td className="py-2.5 px-3 text-neutral-300 max-w-xs truncate text-[11px]">
                    {log.details}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-neutral-500 text-[10px] tracking-tight whitespace-nowrap">
                    {log.hash.slice(0, 12)}...{log.hash.slice(-4)}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-500">
                    No audit records registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
