/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Play,
  Download,
  Copy,
  Check,
  Shield,
  Layers,
  Cpu,
  Workflow,
  BookOpen,
  Database,
  Calendar,
} from 'lucide-react';
import { runAllUnitTests, TestResult } from '../lib/tests';

type DocSection = 'prd' | 'technical' | 'appflow' | 'design' | 'schema' | 'plan' | 'tests';

export const DocsView: React.FC = () => {
  const [activeDocSection, setActiveDocSection] = useState<DocSection>('prd');
  const [copiedDoc, setCopiedDoc] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const docsMetadata: Record<
    DocSection,
    { title: string; filename: string; category: string; description: string }
  > = {
    prd: {
      title: 'Product Requirements Document (PRD)',
      filename: 'PRODUCT_REQUIREMENTS.md',
      category: 'Product Specifications',
      description: 'Comprehensive problem statement, user personas, dual-layer privacy requirements, and conversational Q&A criteria.',
    },
    technical: {
      title: 'Technical Requirements Document (TRD)',
      filename: 'TECHNICAL_REQUIREMENTS.md',
      category: 'Engineering Architecture',
      description: 'AES-256-GCM cipher standards, PBKDF2 100k rounds SHA-256 key derivation, 64-dim vector projection, BM25 formulas, and p95 SLAs.',
    },
    appflow: {
      title: 'Application Flow & Workflows',
      filename: 'APP_FLOW.md',
      category: 'System Sequences',
      description: 'Lifecycle flowcharts, sliding-window chunking pipelines, dual-layer search state machines, and offline P2P sync diagrams.',
    },
    design: {
      title: 'Design Brief & Constitution',
      filename: 'DESIGN_BRIEF.md',
      category: 'Frontend & UX',
      description: 'Anti-AI slop rules, zero-pill metadata discipline, 60-30-10 color allocation, and the 3-zone top bar contract.',
    },
    schema: {
      title: 'Background Data Schema',
      filename: 'BACKGROUND_SCHEMA.md',
      category: 'Data Models',
      description: 'IndexedDB store definitions for documents, vectors, audit logs, settings, and the .veritas.enc sync container specification.',
    },
    plan: {
      title: 'Implementation Plan & Milestones',
      filename: 'IMPLEMENTATION_PLAN.md',
      category: 'Execution Roadmap',
      description: 'Completed development phases, test verification matrix, and maintenance hardening schedule.',
    },
    tests: {
      title: 'Automated Unit Test Suite & Benchmarks',
      filename: 'TEST_SUITE.md',
      category: 'Verification Runner',
      description: 'Live in-browser unit test execution verifying cryptography, vector dot products, BM25 ranking, and IndexedDB persistence.',
    },
  };

  const handleRunTests = async () => {
    setIsRunningTests(true);
    try {
      const results = await runAllUnitTests();
      setTestResults(results);
    } finally {
      setIsRunningTests(false);
    }
  };

  const currentMeta = docsMetadata[activeDocSection];

  const handleCopyDoc = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 2000);
  };

  const handleDownloadDoc = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-8">
      {/* Top Header */}
      <div className="pb-6 border-b border-neutral-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-neutral-400" />
              <span>Veritas Architecture & Specifications Hub</span>
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Extensive standalone documents covering product requirements, technical architecture, schema, design, and implementation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-neutral-400 bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded">
              v2.4.0 · Local-First Sovereign
            </span>
          </div>
        </div>

        {/* Individual Document Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-5">
          {[
            { id: 'prd' as DocSection, label: 'PRD', file: 'PRODUCT_REQUIREMENTS.md' },
            { id: 'technical' as DocSection, label: 'Technical', file: 'TECHNICAL_REQUIREMENTS.md' },
            { id: 'appflow' as DocSection, label: 'App Flow', file: 'APP_FLOW.md' },
            { id: 'design' as DocSection, label: 'Design Brief', file: 'DESIGN_BRIEF.md' },
            { id: 'schema' as DocSection, label: 'Schema', file: 'BACKGROUND_SCHEMA.md' },
            { id: 'plan' as DocSection, label: 'Plan & Matrix', file: 'IMPLEMENTATION_PLAN.md' },
            { id: 'tests' as DocSection, label: 'Test Suite', file: 'TEST_SUITE.md' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveDocSection(tab.id)}
              className={`p-2.5 text-left rounded-lg border transition-all cursor-pointer ${
                activeDocSection === tab.id
                  ? 'bg-neutral-800 border-neutral-600 text-white shadow-sm'
                  : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <div className="text-xs font-bold truncate">{tab.label}</div>
              <div className="text-[10px] font-mono text-neutral-400 truncate mt-0.5">{tab.file}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Document View Header */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 mb-1">
            <span className="uppercase text-[11px] text-neutral-300 font-semibold">{currentMeta.category}</span>
            <span aria-hidden="true">·</span>
            <span className="text-neutral-400">{currentMeta.filename}</span>
          </div>
          <h2 className="text-base font-bold text-neutral-100">{currentMeta.title}</h2>
          <p className="text-xs text-neutral-400 mt-0.5">{currentMeta.description}</p>
        </div>

        {activeDocSection !== 'tests' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleCopyDoc(activeDocSection)}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-xs text-neutral-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedDoc ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedDoc ? 'Copied' : 'Copy Markdown'}</span>
            </button>

            <button
              onClick={() => handleDownloadDoc(activeDocSection, currentMeta.filename)}
              className="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-white text-xs text-neutral-900 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Document Content Area */}
      <div className="mt-6">
        {/* 1. PRODUCT REQUIREMENTS DOCUMENT */}
        {activeDocSection === 'prd' && (
          <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-300 space-y-6 leading-relaxed font-sans">
            <div>
              <div className="text-[11px] font-mono text-neutral-500 uppercase">Document Ref: PRD-VERITAS-2026</div>
              <h3 className="text-base font-bold text-neutral-100 mt-1 mb-2">1. Executive Overview & Mission</h3>
              <p className="text-neutral-400 leading-relaxed">
                Veritas Sovereign Search is engineered to provide privacy-first individuals and enterprise operators with a local search engine
                that matches human cognitive intent rather than brittle keyword strings. By combining high-dimensional vector embeddings with
                the Okapi BM25 lexical ranking algorithm, Veritas uncovers concepts across vast personal document collections even when the query terms
                were never explicitly mentioned in the source records.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <span className="font-semibold text-neutral-200 block mb-1">100% Client-Side Invariant</span>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Zero cloud LLM calls, zero remote indexing, and zero telemetry beacons. Personal documents never leave the user's browser device.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <span className="font-semibold text-neutral-200 block mb-1">AES-256-GCM Encryption</span>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Cryptographic protection using PBKDF2 (100,000 SHA-256 rounds). Plaintext exists solely in ephemeral memory while unlocked.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <span className="font-semibold text-neutral-200 block mb-1">Browser Omnibox Interception</span>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Full OpenSearch 1.1 XML and Manifest v3 extension support allowing users to set Veritas as their default browser search engine.
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider font-mono mb-2">2. Target User Personas</h4>
              <ul className="list-disc list-inside space-y-2 text-neutral-400">
                <li><strong className="text-neutral-200">Dr. Elena Rostova (Medical Researcher):</strong> Holds de-identified clinical lab records and cardiology tests. Requires semantic discovery without risking medical privacy violations.</li>
                <li><strong className="text-neutral-200">Marcus Vance (Systems Architect):</strong> Maintains hundreds of client invoices, 1099 tax schedules, and microservice specifications. Needs to search notes via his browser's URL address bar.</li>
                <li><strong className="text-neutral-200">Julian Chen (Security Auditor):</strong> Demands zero-telemetry guarantees, verifiable SHA-256 Merkle audit chains, and offline encrypted sync capabilities.</li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider font-mono mb-2">3. Functional Requirements Matrix</h4>
              <div className="overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900 text-neutral-400 font-mono text-[11px]">
                      <th className="py-2.5 px-3">Req ID</th>
                      <th className="py-2.5 px-3">Feature Module</th>
                      <th className="py-2.5 px-3">Functional Description</th>
                      <th className="py-2.5 px-3 text-right">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900 font-mono text-[11px]">
                    <tr>
                      <td className="py-2 px-3 text-neutral-400">FR-1.1</td>
                      <td className="py-2 px-3 text-neutral-200">Vector Ingestion</td>
                      <td className="py-2 px-3 text-neutral-400">Chunk sliding window (300 words, 50 overlap) & 64-dim embedding</td>
                      <td className="py-2 px-3 text-right text-emerald-400">P0 (Critical)</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-neutral-400">FR-1.2</td>
                      <td className="py-2 px-3 text-neutral-200">Hybrid Search</td>
                      <td className="py-2 px-3 text-neutral-400">Reciprocal Rank Fusion: 0.65 Vector Cosine + 0.35 Okapi BM25</td>
                      <td className="py-2 px-3 text-right text-emerald-400">P0 (Critical)</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-neutral-400">FR-1.3</td>
                      <td className="py-2 px-3 text-neutral-200">E2E Encryption</td>
                      <td className="py-2 px-3 text-neutral-400">AES-256-GCM with PBKDF2 100k rounds; zero passphrase storage</td>
                      <td className="py-2 px-3 text-right text-emerald-400">P0 (Critical)</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-neutral-400">FR-1.4</td>
                      <td className="py-2 px-3 text-neutral-200">Browser Integration</td>
                      <td className="py-2 px-3 text-neutral-400">OpenSearch 1.1 descriptor + URL query param /?q=%s handler</td>
                      <td className="py-2 px-3 text-right text-emerald-400">P0 (Critical)</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-neutral-400">FR-1.5</td>
                      <td className="py-2 px-3 text-neutral-200">Conversational Q&A</td>
                      <td className="py-2 px-3 text-neutral-400">Multi-document extractive sentence synthesis with exact citations</td>
                      <td className="py-2 px-3 text-right text-blue-400">P1 (High)</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-neutral-400">FR-1.6</td>
                      <td className="py-2 px-3 text-neutral-200">Offline P2P Sync</td>
                      <td className="py-2 px-3 text-neutral-400">Encrypted .veritas.enc packages with SHA-256 checksums</td>
                      <td className="py-2 px-3 text-right text-blue-400">P1 (High)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. TECHNICAL REQUIREMENTS DOCUMENT */}
        {activeDocSection === 'technical' && (
          <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-300 space-y-6 leading-relaxed font-sans">
            <div>
              <div className="text-[11px] font-mono text-neutral-500 uppercase">Document Ref: TRD-VERITAS-2026</div>
              <h3 className="text-base font-bold text-neutral-100 mt-1 mb-2">1. Cryptographic Standard & Invariants</h3>
              <p className="text-neutral-400">
                All sensitive documents and vector indices are shielded via authenticated client-side encryption.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-[11px] space-y-2 text-neutral-300">
              <div>• Cipher Algorithm: AES-256-GCM (Galois/Counter Mode) with 128-bit authentication tag</div>
              <div>• Nonce / IV: Unique 12-byte (96-bit) cryptographically secure pseudorandom number per record</div>
              <div>• KDF: PBKDF2 using HMAC-SHA-256 with 100,000 iterations</div>
              <div>• Salt: 16-byte (128-bit) cryptographically secure pseudorandom salt</div>
              <div>• Zero-Knowledge Rule: The master passphrase is never stored on disk or transmitted. Derived CryptoKey is marked non-extractable and held in ephemeral React RAM.</div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider font-mono mb-2">2. Vector Space Mathematics & Ranking Equations</h4>
              <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-[11px] space-y-3 text-neutral-400">
                <div>
                  <strong className="text-neutral-200 block mb-1">A. Subword Vector Embedding & L2 Unit Normalization:</strong>
                  <span>v_norm = v / sqrt(sum(v_i^2)) for i in [0..63]</span>
                </div>
                <div>
                  <strong className="text-neutral-200 block mb-1">B. Cosine Dot Product:</strong>
                  <span>CosineSim(q, d) = sum(q_i * d_i)  [Calculated in &lt; 0.01ms via Float32Array]</span>
                </div>
                <div>
                  <strong className="text-neutral-200 block mb-1">C. Okapi BM25 Lexical Score:</strong>
                  <span>BM25(D, Q) = sum( IDF(q_i) * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (|D| / avgdl))) )</span>
                </div>
                <div>
                  <strong className="text-neutral-200 block mb-1">D. Hybrid Reciprocal Rank Fusion:</strong>
                  <span>HybridScore = 0.65 * VectorSim + 0.35 * BM25Score</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider font-mono mb-2">3. Performance SLA Targets</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
                <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="text-neutral-500 text-[10px] uppercase">p50 Latency</div>
                  <div className="text-base font-bold text-neutral-100 tabular-nums">2.5ms</div>
                </div>
                <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="text-neutral-500 text-[10px] uppercase">p95 Latency</div>
                  <div className="text-base font-bold text-emerald-400 tabular-nums">7.8ms</div>
                </div>
                <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="text-neutral-500 text-[10px] uppercase">Outbound Telemetry</div>
                  <div className="text-base font-bold text-neutral-100 tabular-nums">0.00 KB</div>
                </div>
                <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="text-neutral-500 text-[10px] uppercase">Key Derivation</div>
                  <div className="text-base font-bold text-neutral-100 tabular-nums">120ms</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. APPLICATION FLOW */}
        {activeDocSection === 'appflow' && (
          <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-300 space-y-6 leading-relaxed font-sans">
            <div>
              <div className="text-[11px] font-mono text-neutral-500 uppercase">Document Ref: FLOW-VERITAS-2026</div>
              <h3 className="text-base font-bold text-neutral-100 mt-1 mb-2">1. End-to-End System Pipeline</h3>
              <p className="text-neutral-400">
                Detailed execution path from query submission in browser address bar or UI canvas to decrypted results.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-[11px] leading-relaxed text-neutral-300 overflow-x-auto whitespace-pre">
{`+-----------------------------------------------------------------------------------+
| 1. Query Interception & Tokenization                                              |
|    • Input captured from omnibox (?q=...) or search bar                           |
|    • Strip punctuation, remove stopwords, generate 64-dim float query vector      |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 2. Local Index Evaluation (Sub-10ms)                                              |
|    • Compute Cosine Dot Product across all vector chunks in memory                |
|    • Compute BM25 Lexical Score for exact token matches                           |
|    • Fuse: HybridScore = 0.65 * VectorSim + 0.35 * BM25Normalized                 |
+-----------------------------------------------------------------------------------+
                                         |
                       +-----------------+-----------------+
                       |                                   |
                       v                                   v
+----------------------------------------+ +----------------------------------------+
| 3A. Local Matches Exceed Threshold     | | 3B. Low Local Confidence (< 0.60)      |
|     • Decrypt top documents via AES-256| |     • If Web Fallback is toggled on:   |
|     • If question intent: Synthesize   | |       Sanitize query (strip identifiers)|
|       contextual answer with citations | |       Query anonymous public knowledge |
+----------------------------------------+ +----------------------------------------+
                       |                                   |
                       +-----------------+-----------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 4. Render Unified Ranked Results                                                  |
|    • Prioritize local private records over anonymous external web items           |
|    • Display latency measurement (0.8ms), match percentages, and snippet preview   |
|    • Append cryptographically signed SHA-256 audit record to Merkle chain         |
+-----------------------------------------------------------------------------------+`}
            </div>
          </div>
        )}

        {/* 4. DESIGN BRIEF */}
        {activeDocSection === 'design' && (
          <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-300 space-y-6 leading-relaxed font-sans">
            <div>
              <div className="text-[11px] font-mono text-neutral-500 uppercase">Document Ref: DESIGN-VERITAS-2026</div>
              <h3 className="text-base font-bold text-neutral-100 mt-1 mb-2">1. Visual Constitution & Anti-AI Slop Mandate</h3>
              <p className="text-neutral-400">
                Veritas is designed to look like a tool built for senior software engineers, researchers, and cryptography specialists.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider font-mono">Core Prohibitions & Enforcements</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-neutral-950 border border-rose-950/40 text-rose-300/90">
                  <span className="font-bold block mb-1">❌ Banned AI Slop Patterns:</span>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-neutral-400">
                    <li>No purple or magenta glowing gradients</li>
                    <li>No static pill badges enclosing metadata</li>
                    <li>No fake scoreboard counters ("92% INNOVATION SCORE")</li>
                    <li>No decorative pulsing green status dots</li>
                    <li>No thick left accent borders (`border-l-4`)</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-lg bg-neutral-950 border border-emerald-950/40 text-emerald-300/90">
                  <span className="font-bold block mb-1">✅ Enforced Veritas Standards:</span>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-neutral-400">
                    <li>Unboxed metadata separated by clean dots (`·`)</li>
                    <li>Strict 3-zone header contract (Wordmark, 5 Links, 1 CTA)</li>
                    <li>Plus Jakarta Sans display + JetBrains Mono tabular data</li>
                    <li>60-30-10 color discipline with deep neutral obsidian canvas</li>
                    <li>Global keyboard navigation (`/` or `Cmd+K` focus)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. BACKGROUND SCHEMA */}
        {activeDocSection === 'schema' && (
          <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-300 space-y-6 leading-relaxed font-sans">
            <div>
              <div className="text-[11px] font-mono text-neutral-500 uppercase">Document Ref: SCHEMA-VERITAS-2026</div>
              <h3 className="text-base font-bold text-neutral-100 mt-1 mb-2">1. Storage Topology (`Veritas_Private_Storage_v1`)</h3>
              <p className="text-neutral-400">
                Transactional IndexedDB architecture with four primary object stores.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-[11px] leading-relaxed text-neutral-300 overflow-x-auto whitespace-pre">
{`Store: 'documents' [keyPath: 'id']
  • id: string (UUIDv4)
  • title: string
  • category: 'finance' | 'medical' | 'legal' | 'notes' | 'code' | 'personal'
  • content: string (present in memory only; empty string on disk when encrypted)
  • encryptedPayload?: {
      cipherBuffer: string (Base64 AES-256-GCM ciphertext + tag),
      iv: string (Base64 12-byte IV),
      salt: string (Base64 16-byte PBKDF2 salt)
    }
  • tokensCount: number
  • tags: string[]
  • createdAt: number (epoch ms)
  • version: number (CRDT sequence)

Store: 'vectors' [autoIncrement: true, index: 'docId']
  • docId: string
  • chunkIndex: number
  • snippet: string
  • vector: number[] (64-dimensional float vector, normalized)
  • keywords: string[] (top TF-IDF stems)

Store: 'audit_logs' [keyPath: 'id', index: 'timestamp']
  • id: string
  • timestamp: number
  • action: 'QUERY' | 'INGEST' | 'DECRYPT' | 'EXPORT' | 'SYNC' | 'KEY_DERIVE' | 'PURGE'
  • actorRole: 'owner' | 'auditor' | 'guest'
  • details: string
  • hash: string (SHA-256 Merkle chain hash)
  • prevHash: string (SHA-256 of prior record)`}
            </div>
          </div>
        )}

        {/* 6. IMPLEMENTATION PLAN */}
        {activeDocSection === 'plan' && (
          <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-300 space-y-6 leading-relaxed font-sans">
            <div>
              <div className="text-[11px] font-mono text-neutral-500 uppercase">Document Ref: PLAN-VERITAS-2026</div>
              <h3 className="text-base font-bold text-neutral-100 mt-1 mb-2">1. Implementation Roadmap & Milestones</h3>
              <p className="text-neutral-400">
                Phase-by-phase engineering deliverables verified against zero-cloud sovereignty benchmarks.
              </p>
            </div>

            <div className="space-y-2.5 font-mono text-[11px] text-neutral-300">
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Phase 1: Cryptographic Engine & Volatile Key Derivation</span>
                </span>
                <span className="text-emerald-400 font-semibold">COMPLETE</span>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Phase 2: 64-Dim Vector Embeddings & Hybrid BM25 Fusion</span>
                </span>
                <span className="text-emerald-400 font-semibold">COMPLETE</span>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Phase 3: Multi-Store IndexedDB Ingestion & Merkle Auditing</span>
                </span>
                <span className="text-emerald-400 font-semibold">COMPLETE</span>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Phase 4: Dual-Layer Router & Extractive Conversational Q&A</span>
                </span>
                <span className="text-emerald-400 font-semibold">COMPLETE</span>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Phase 5: OpenSearch 1.1 Descriptor & Browser Extensions</span>
                </span>
                <span className="text-emerald-400 font-semibold">COMPLETE</span>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Phase 6: Offline P2P Encrypted Sync & In-Browser Unit Tests</span>
                </span>
                <span className="text-emerald-400 font-semibold">COMPLETE</span>
              </div>
            </div>
          </div>
        )}

        {/* 7. AUTOMATED TEST SUITE RUNNER */}
        {activeDocSection === 'tests' && (
          <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-300 space-y-6 leading-relaxed font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-neutral-400" />
                  <span>Live Automated Unit Test Runner & Latency Benchmarks</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Executes real WebCrypto AES-GCM round-trips, PBKDF2 derivations, float vector norms, BM25 saturation, and IndexedDB operations.
                </p>
              </div>

              <button
                onClick={handleRunTests}
                disabled={isRunningTests}
                className="px-4 py-2 text-xs font-semibold bg-neutral-100 hover:bg-white text-neutral-900 rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Play className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
                <span>{isRunningTests ? 'Running Benchmark Tests...' : 'Run Test Suite'}</span>
              </button>
            </div>

            {testResults.length === 0 && !isRunningTests && (
              <div className="py-12 text-center text-neutral-400">
                <p className="mb-2">Click "Run Test Suite" to execute all tests directly inside your browser.</p>
                <span className="text-[11px] font-mono text-neutral-500">
                  Verifies Cryptography · Vector Engine · Storage Layer · Offline Sync
                </span>
              </div>
            )}

            {testResults.length > 0 && (
              <div className="space-y-2 font-mono">
                {testResults.map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      t.passed
                        ? 'bg-neutral-950 border-neutral-800'
                        : 'bg-rose-950/40 border-rose-900 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {t.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <div>
                        <div className="font-semibold text-neutral-200 truncate">{t.name}</div>
                        <div className="text-[11px] text-neutral-400 font-sans">{t.details || t.error}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-neutral-400 shrink-0 tabular-nums">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400">{t.category}</span>
                      <span className="text-emerald-400 font-semibold">{t.durationMs}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
