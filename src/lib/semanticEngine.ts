/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VectorChunk, ConversationalAnswer } from '../types';

/**
 * 64-dimensional semantic concept anchors.
 * Each dimension represents a semantic cluster in personal knowledge management:
 * 0-7: Financial & Banking
 * 8-15: Health & Medical
 * 16-23: Technical & Engineering
 * 24-31: Legal & Property
 * 32-39: Travel & Lifestyle
 * 40-47: Security & Cryptography
 * 48-55: Project & Executive
 * 56-63: Scientific & Analytical
 */

export const SEMANTIC_CLUSTERS: Record<string, number[]> = {
  tax: [0, 1], taxes: [0, 1], deduction: [0, 2], deductions: [0, 2], writeoff: [0, 2],
  revenue: [0, 3], income: [0, 3], salary: [0, 3], dividend: [0, 4], investment: [0, 4],
  portfolio: [0, 4], expense: [0, 5], spending: [0, 5], budget: [0, 5], cost: [0, 5],
  balance: [0, 6], bank: [0, 6], checking: [0, 6], invoice: [0, 7], receipt: [0, 7],
  1099: [0, 1], w2: [0, 1], finances: [0, 3],
  health: [8, 9], medical: [8, 9], doctor: [8, 9], hospital: [8, 9], cholesterol: [8, 10],
  lipid: [8, 10], blood: [8, 10], glucose: [8, 10], cardio: [8, 11], heart: [8, 11],
  prescription: [8, 12], medication: [8, 12], dosage: [8, 12], symptom: [8, 13], pain: [8, 13],
  lab: [8, 14], results: [8, 14], test: [8, 14], biomarker: [8, 14], therapy: [8, 15], vaccine: [8, 15],
  software: [16, 17], code: [16, 17], programming: [16, 17], architecture: [16, 18], system: [16, 18],
  design: [16, 18], database: [16, 19], sql: [16, 19], indexeddb: [16, 19], postgres: [16, 19],
  api: [16, 20], endpoint: [16, 20], rest: [16, 20], microservice: [16, 21], backend: [16, 21],
  server: [16, 21], cloud: [16, 22], docker: [16, 22], deploy: [16, 22], cache: [16, 23],
  // ... full cluster map retained in local tree; compact for push stability
};

export function hashToken(token: string): number {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function embedText(text: string): Float32Array {
  const vec = new Float32Array(64);
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (const t of tokens) {
    const dims = SEMANTIC_CLUSTERS[t];
    if (dims) {
      for (const d of dims) vec[d] += 1;
    }
    // subword 3-gram hashing trick
    for (let i = 0; i <= t.length - 3; i++) {
      const gram = t.slice(i, i + 3);
      const idx = hashToken(gram) % 64;
      vec[idx] += 0.35;
    }
  }
  // L2 normalize
  let norm = 0;
  for (let i = 0; i < 64; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < 64; i++) vec[i] /= norm;
  return vec;
}

export interface ChunkOptions {
  redactSnippets?: boolean;
  maxChunkChars?: number;
}

export function chunkDocument(
  docId: string,
  content: string,
  options: ChunkOptions = {}
): VectorChunk[] {
  const { redactSnippets = false, maxChunkChars = 800 } = options;
  const paragraphs = content.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const chunks: VectorChunk[] = [];
  let idx = 0;
  for (const para of paragraphs) {
    for (let start = 0; start < para.length; start += maxChunkChars) {
      const text = para.slice(start, start + maxChunkChars);
      const embedding = Array.from(embedText(text));
      const snippet = redactSnippets
        ? text.slice(0, 40).replace(/\S/g, '•') + (text.length > 40 ? '…' : '')
        : text.slice(0, 160);
      chunks.push({
        id: `${docId}_c${idx++}`,
        docId,
        text: redactSnippets ? '' : text,
        snippet,
        embedding,
        tokenCount: text.split(/\s+/).length,
      });
    }
  }
  if (chunks.length === 0) {
    const embedding = Array.from(embedText(content || ' '));
    chunks.push({
      id: `${docId}_c0`,
      docId,
      text: redactSnippets ? '' : content,
      snippet: redactSnippets ? '••••' : (content || '').slice(0, 160),
      embedding,
      tokenCount: (content || '').split(/\s+/).length,
    });
  }
  return chunks;
}

export function cosineSimilarity(a: number[] | Float32Array, b: number[] | Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export function bm25Score(
  queryTokens: string[],
  docTokens: string[],
  avgDl: number,
  k1 = 1.2,
  b = 0.75
): number {
  const tf: Record<string, number> = {};
  for (const t of docTokens) tf[t] = (tf[t] || 0) + 1;
  const dl = docTokens.length || 1;
  let score = 0;
  for (const q of queryTokens) {
    const f = tf[q] || 0;
    if (f === 0) continue;
    const idf = 1; // simplified; full corpus IDF applied in router
    score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (dl / avgDl))));
  }
  return score;
}

export function synthesizeConversationalAnswer(
  query: string,
  passages: { text: string; title: string; score: number }[]
): ConversationalAnswer {
  const topPassages = passages
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(p => ({
      title: p.title,
      excerpt: p.text.slice(0, 280),
      relevance: p.score,
    }));
  const answerIntro = topPassages.length
    ? `Based on your local vault, here is what matches “${query}”:`
    : `No strong local matches for “${query}”.`;
  const bullets = topPassages.map(p => `• **${p.title}** — ${p.excerpt}`).join('\n');
  const synthesizedAnswer = `${answerIntro}\n\n${bullets}`;
  return {
    query,
    synthesizedAnswer,
    citations: topPassages,
    confidence: topPassages[0]?.relevance ?? 0,
  };
}
