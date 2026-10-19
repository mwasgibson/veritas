/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dual-layer anonymous web fallback — zero cloud AI.
 * - Only query text leaves the device (never document content or keys)
 * - credentials: 'omit', minimal Accept header, no cookies
 * - Results are re-embedded and re-ranked locally with the same vector/BM25 stack
 */

import { SearchResultItem } from '../types';
import { generateVector, cosineSimilarity, computeBM25, tokenize } from './semanticEngine';

/** Whitelisted public endpoints (no auth, no personalization). */
export const WEB_FALLBACK_ENDPOINTS = [
  'https://en.wikipedia.org/w/api.php',
  'https://api.duckduckgo.com/',
] as const;

export interface WebFallbackOptions {
  topLocalScore: number;
  minLocalConfidenceThreshold: number;
  force?: boolean;
  fetchPageExcerpts?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface WebFallbackResult {
  results: SearchResultItem[];
  usedWeb: boolean;
  sourcesTried: string[];
  reason: 'skipped_high_local' | 'offline' | 'ok' | 'empty' | 'error';
}

export function shouldFetchWeb(
  topLocalScore: number,
  threshold: number,
  force = false
): boolean {
  if (force) return true;
  return topLocalScore < threshold;
}

export async function fetchAndRerankWeb(
  query: string,
  options: WebFallbackOptions
): Promise<WebFallbackResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { results: [], usedWeb: false, sourcesTried: [], reason: 'empty' };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { results: [], usedWeb: false, sourcesTried: [], reason: 'offline' };
  }

  if (
    !shouldFetchWeb(
      options.topLocalScore,
      options.minLocalConfidenceThreshold,
      options.force
    )
  ) {
    return {
      results: [],
      usedWeb: false,
      sourcesTried: [],
      reason: 'skipped_high_local',
    };
  }

  const timeoutMs = options.timeoutMs ?? 4000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const signal = options.signal
    ? anySignal([options.signal, controller.signal])
    : controller.signal;

  const sourcesTried: string[] = [];
  const raw: RawWebHit[] = [];

  try {
    const [wiki, ddg] = await Promise.all([
      fetchWikipedia(trimmed, signal).then(hits => {
        sourcesTried.push('wikipedia');
        return hits;
      }),
      fetchDuckDuckGo(trimmed, signal).then(hits => {
        sourcesTried.push('duckduckgo');
        return hits;
      }),
    ]);
    raw.push(...wiki, ...ddg);

    if (options.fetchPageExcerpts && raw.length > 0) {
      await enrichExcerpts(raw.slice(0, 3), signal);
    }
  } catch {
    clearTimeout(timeoutId);
    return { results: [], usedWeb: false, sourcesTried, reason: 'error' };
  }
  clearTimeout(timeoutId);

  if (raw.length === 0) {
    return { results: [], usedWeb: false, sourcesTried, reason: 'empty' };
  }

  const results = rerankLocally(trimmed, raw);
  return {
    results,
    usedWeb: results.length > 0,
    sourcesTried,
    reason: results.length > 0 ? 'ok' : 'empty',
  };
}

interface RawWebHit {
  title: string;
  snippet: string;
  url: string;
  source: 'wikipedia' | 'duckduckgo';
}

function anonymousGet(url: string, signal: AbortSignal): Promise<Response> {
  return fetch(url, {
    method: 'GET',
    credentials: 'omit',
    mode: 'cors',
    referrerPolicy: 'no-referrer',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });
}

async function fetchWikipedia(query: string, signal: AbortSignal): Promise<RawWebHit[]> {
  const q = encodeURIComponent(query.replace(/[^\w\s-]/gi, '').trim());
  if (!q) return [];
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${q}&limit=6&namespace=0&format=json&origin=*`;
  try {
    const res = await anonymousGet(url, signal);
    if (!res.ok) return [];
    const data = await res.json();
    const titles: string[] = data[1] || [];
    const descs: string[] = data[2] || [];
    const urls: string[] = data[3] || [];
    const out: RawWebHit[] = [];
    for (let i = 0; i < titles.length; i++) {
      out.push({
        title: titles[i],
        snippet: descs[i] || titles[i],
        url: urls[i] || `https://en.wikipedia.org/wiki/${encodeURIComponent(titles[i])}`,
        source: 'wikipedia',
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function fetchDuckDuckGo(query: string, signal: AbortSignal): Promise<RawWebHit[]> {
  const q = encodeURIComponent(query.trim());
  if (!q) return [];
  const url = `https://api.duckduckgo.com/?q=${q}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
  try {
    const res = await anonymousGet(url, signal);
    if (!res.ok) return [];
    const data = await res.json();
    const out: RawWebHit[] = [];

    if (data.AbstractText) {
      out.push({
        title: data.Heading || 'DuckDuckGo',
        snippet: data.AbstractText,
        url: data.AbstractURL || data.AbstractSource || 'https://duckduckgo.com',
        source: 'duckduckgo',
      });
    }

    const related = data.RelatedTopics || [];
    for (const t of related) {
      if (t.Text && t.FirstURL) {
        out.push({
          title: (t.FirstURL as string).replace(/^https?:\/\//, '').slice(0, 48) || 'Related',
          snippet: t.Text,
          url: t.FirstURL,
          source: 'duckduckgo',
        });
      }
      if (Array.isArray(t.Topics)) {
        for (const sub of t.Topics.slice(0, 3)) {
          if (sub.Text && sub.FirstURL) {
            out.push({
              title: String(sub.Text).slice(0, 60),
              snippet: sub.Text,
              url: sub.FirstURL,
              source: 'duckduckgo',
            });
          }
        }
      }
      if (out.length >= 8) break;
    }

    return out.slice(0, 8);
  } catch {
    return [];
  }
}

async function enrichExcerpts(hits: RawWebHit[], signal: AbortSignal): Promise<void> {
  await Promise.all(
    hits.map(async hit => {
      if (!hit.url.startsWith('https://')) return;
      try {
        const res = await fetch(hit.url, {
          method: 'GET',
          credentials: 'omit',
          mode: 'cors',
          referrerPolicy: 'no-referrer',
          headers: { Accept: 'text/html' },
          signal,
        });
        if (!res.ok) return;
        const html = await res.text();
        const text = stripHtml(html).slice(0, 400);
        if (text.length > 40) {
          hit.snippet = text;
        }
      } catch {
        /* CORS or network — keep original snippet */
      }
    })
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function rerankLocally(query: string, hits: RawWebHit[]): SearchResultItem[] {
  const queryTokens = tokenize(query);
  const queryVec = generateVector(query);

  const seen = new Set<string>();
  const unique = hits.filter(h => {
    const key = h.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const scored: SearchResultItem[] = unique.map((hit, i) => {
    const body = `${hit.title} ${hit.snippet}`;
    const vec = generateVector(body);
    const vectorScore = cosineSimilarity(queryVec, vec);
    const bm25 = computeBM25(queryTokens, tokenize(body));
    const hybridScore = Math.round((0.7 * vectorScore + 0.3 * bm25) * 100) / 100;

    return {
      docId: `web_${hit.source}_${i}_${hashShort(hit.url)}`,
      title: hit.title,
      category: 'web',
      snippet: hit.snippet.slice(0, 320),
      highlightWords: queryTokens.filter(t => body.toLowerCase().includes(t)),
      vectorScore: Math.round(vectorScore * 100) / 100,
      bm25Score: Math.round(bm25 * 100) / 100,
      hybridScore,
      latencyMs: 0,
      source: 'web' as const,
      encrypted: false,
      sourceUrl: hit.url,
    };
  });

  scored.sort((a, b) => b.hybridScore - a.hybridScore);
  return scored.slice(0, 10);
}

function hashShort(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).slice(0, 8);
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort();
      break;
    }
    s.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return controller.signal;
}
