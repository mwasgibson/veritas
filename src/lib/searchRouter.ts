/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SearchResultItem, SearchSettings, ConversationalAnswer, DocumentItem, InstantWidget } from '../types';
import { storageEngine } from './storage';
import { embedText, cosineSimilarity, bm25Score, synthesizeConversationalAnswer, chunkDocument } from './semanticEngine';
import { getInstantAnswers } from './instantAnswers';

const DEFAULT_SETTINGS: SearchSettings = {
  mode: 'hybrid',
  hybridWeight: 0.55,
  minLocalConfidenceThreshold: 0.35,
  enableWebFallback: true,
};

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/** Rebuild a display snippet from decrypted document content (privacy: vectors store redacted snippets). */
function liveSnippet(docContent: string, queryTokens: string[], maxLen = 180): string {
  if (!docContent) return '';
  const lower = docContent.toLowerCase();
  let best = 0;
  let bestIdx = 0;
  for (const t of queryTokens) {
    const i = lower.indexOf(t);
    if (i >= 0 && (best === 0 || i < bestIdx)) {
      bestIdx = i;
      best = 1;
    }
  }
  const start = Math.max(0, bestIdx - 40);
  let snip = docContent.slice(start, start + maxLen);
  if (start > 0) snip = '…' + snip;
  if (start + maxLen < docContent.length) snip = snip + '…';
  return snip;
}

export async function runSearch(
  query: string,
  masterKey: CryptoKey | null,
  settings: Partial<SearchSettings> = {}
): Promise<{
  results: SearchResultItem[];
  conversational: ConversationalAnswer | null;
  instants: InstantWidget[];
  usedWebFallback: boolean;
}> {
  const cfg = { ...DEFAULT_SETTINGS, ...settings };
  const q = query.trim();
  if (!q) {
    return { results: [], conversational: null, instants: [], usedWebFallback: false };
  }

  const instants = getInstantAnswers(q);
  const queryTokens = tokenize(q);
  const queryVec = embedText(q);

  const vectors = await storageEngine.getAllVectors();
  const docs = masterKey ? await storageEngine.getAllDocuments(masterKey) : [];
  const docMap = new Map(docs.map(d => [d.id, d]));

  // Score local chunks
  const scored: { chunkId: string; docId: string; score: number; semantic: number; lexical: number }[] = [];
  const avgDl = vectors.reduce((s, v) => s + (v.tokenCount || 1), 0) / (vectors.length || 1);

  for (const v of vectors) {
    const semantic = cosineSimilarity(queryVec, v.embedding);
    const docTokens = tokenize(v.text || v.snippet || '');
    const lexical = bm25Score(queryTokens, docTokens, avgDl);
    const score =
      cfg.mode === 'semantic'
        ? semantic
        : cfg.mode === 'keyword'
          ? lexical
          : cfg.hybridWeight * semantic + (1 - cfg.hybridWeight) * lexical;
    scored.push({ chunkId: v.id, docId: v.docId, score, semantic, lexical });
  }

  scored.sort((a, b) => b.score - a.score);

  // Dedup by doc, take top
  const seen = new Set<string>();
  const results: SearchResultItem[] = [];
  for (const s of scored) {
    if (seen.has(s.docId)) continue;
    seen.add(s.docId);
    const doc = docMap.get(s.docId);
    const title = doc?.title || s.docId;
    const content = doc?.content || '';
    const snippet = liveSnippet(content, queryTokens);
    results.push({
      id: s.chunkId,
      docId: s.docId,
      title,
      snippet,
      score: s.score,
      source: 'local',
      category: doc?.category,
    });
    if (results.length >= 20) break;
  }

  const topScore = results[0]?.score ?? 0;
  let usedWebFallback = false;

  // Anonymous web fallback when local confidence is low
  if (cfg.enableWebFallback && topScore < cfg.minLocalConfidenceThreshold) {
    try {
      const web = await fetchAnonymousWeb(q);
      for (const w of web) {
        results.push(w);
      }
      usedWebFallback = web.length > 0;
    } catch {
      // offline or blocked — ignore
    }
  }

  // Conversational extractive answer from top local passages
  const passages = results
    .filter(r => r.source === 'local')
    .slice(0, 5)
    .map(r => ({
      text: r.snippet,
      title: r.title,
      score: r.score,
    }));
  const conversational =
    passages.length > 0 ? synthesizeConversationalAnswer(q, passages) : null;

  return { results, conversational, instants, usedWebFallback };
}

async function fetchAnonymousWeb(query: string): Promise<SearchResultItem[]> {
  // DuckDuckGo Instant Answer / OpenSearch-style (headers stripped, no identity)
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      // deliberately minimal headers — no cookies, no auth
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const out: SearchResultItem[] = [];
  if (data.AbstractText) {
    out.push({
      id: `web_ddg_${Date.now()}`,
      docId: 'web',
      title: data.Heading || 'Web',
      snippet: data.AbstractText,
      score: 0.3,
      source: 'web',
      url: data.AbstractURL || undefined,
    });
  }
  const related = data.RelatedTopics || [];
  for (const t of related.slice(0, 5)) {
    if (t.Text) {
      out.push({
        id: `web_rel_${Math.random().toString(36).slice(2, 8)}`,
        docId: 'web',
        title: (t.FirstURL || '').replace(/^https?:\/\//, '').slice(0, 40) || 'Related',
        snippet: t.Text,
        score: 0.25,
        source: 'web',
        url: t.FirstURL,
      });
    }
  }
  return out;
}
