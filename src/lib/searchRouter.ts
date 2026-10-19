/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SearchResultItem, ConversationalAnswer, SearchSettings, InstantWidget, UserRole } from '../types';
import { storageEngine } from './storage';
import { resolveInstantAnswer } from './instantAnswers';
import {
  generateVector,
  cosineSimilarity,
  computeBM25,
  tokenize,
  synthesizeLocalAnswer,
} from './semanticEngine';
import { fuseHybridScores } from './rankFusion';
import { searchSession } from './sessionContext';

export interface SearchExecutionResult {
  query: string;
  expandedQuery?: string;
  usedSessionContext?: boolean;
  results: SearchResultItem[];
  instantWidget?: InstantWidget;
  conversationalAnswer?: ConversationalAnswer;
  totalTimeMs: number;
  localResultsCount: number;
  webResultsCount: number;
}

/**
 * Dual-layer search: local hybrid (vector + BM25 + RRF) first, anonymous web fallback.
 * Optional session context expands follow-up queries in-memory only.
 */
export async function executeSearch(
  query: string,
  settings: SearchSettings,
  masterKey?: CryptoKey | null,
  actorRole: UserRole = 'owner',
  options?: { useSessionContext?: boolean }
): Promise<SearchExecutionResult> {
  const startTime = performance.now();
  const trimmed = query.trim();

  if (!trimmed) {
    return {
      query,
      results: [],
      totalTimeMs: 0,
      localResultsCount: 0,
      webResultsCount: 0,
    };
  }

  const useSession = options?.useSessionContext !== false;
  const { expanded, usedContext } = useSession
    ? searchSession.expandQuery(trimmed)
    : { expanded: trimmed, usedContext: false };
  const searchText = expanded;

  const instantWidget = await resolveInstantAnswer(trimmed);

  await storageEngine.recordAudit(
    'QUERY',
    actorRole,
    `Executed search: "${trimmed.slice(0, 50)}${trimmed.length > 50 ? '...' : ''}" [Mode: ${settings.searchMode}]${usedContext ? ' [session]' : ''}`
  );

  const [docs, vectorChunks] = await Promise.all([
    storageEngine.getAllDocuments(masterKey),
    storageEngine.getAllVectors(),
  ]);

  const queryTokens = tokenize(searchText);
  const queryVector = generateVector(searchText);
  const docMap = new Map(docs.map(d => [d.id, d]));

  const docChunkScores = new Map<
    string,
    { bestVectorSim: number; bestSnippet: string; keywords: string[] }
  >();

  for (const chunk of vectorChunks) {
    const sim = cosineSimilarity(queryVector, chunk.vector);
    const existing = docChunkScores.get(chunk.docId);
    if (!existing || sim > existing.bestVectorSim) {
      const doc = docMap.get(chunk.docId);
      const liveSnippet =
        chunk.snippet ||
        (doc?.content ? doc.content.slice(0, 400) : '') ||
        (chunk.keywords?.length ? chunk.keywords.join(' ') : '');
      docChunkScores.set(chunk.docId, {
        bestVectorSim: sim,
        bestSnippet: liveSnippet,
        keywords: chunk.keywords || [],
      });
    }
  }

  const vectorById = new Map<string, number>();
  const bm25ById = new Map<string, number>();
  const metaById = new Map<
    string,
    { title: string; category: string; tokens: string[]; keywords: string[]; snippet: string }
  >();

  for (const doc of docs) {
    const chunkInfo = docChunkScores.get(doc.id) || {
      bestVectorSim: 0,
      bestSnippet: doc.content ? doc.content.slice(0, 300) : '',
      keywords: [] as string[],
    };
    const docTokens = tokenize(
      doc.title + ' ' + (doc.content || '') + ' ' + (doc.tags || []).join(' ')
    );
    const bm25 = computeBM25(queryTokens, docTokens);
    vectorById.set(doc.id, chunkInfo.bestVectorSim);
    bm25ById.set(doc.id, bm25);
    metaById.set(doc.id, {
      title: doc.title,
      category: doc.category,
      tokens: docTokens,
      keywords: chunkInfo.keywords,
      snippet: chunkInfo.bestSnippet,
    });
  }

  const docIds = docs.map(d => d.id);
  const hybridById = fuseHybridScores(
    docIds,
    vectorById,
    bm25ById,
    settings.searchMode,
    settings.hybridWeight
  );

  const localResults: SearchResultItem[] = [];

  for (const doc of docs) {
    const hybridScore = hybridById.get(doc.id) || 0;
    const v = vectorById.get(doc.id) || 0;
    const bm25 = bm25ById.get(doc.id) || 0;
    const meta = metaById.get(doc.id)!;

    if (hybridScore >= settings.minLocalConfidenceThreshold || bm25 > 0.25 || v > 0.55) {
      const highlightWords = queryTokens.filter(
        t => meta.tokens.includes(t) || meta.title.toLowerCase().includes(t)
      );
      localResults.push({
        docId: doc.id,
        title: doc.title,
        category: doc.category,
        snippet:
          meta.snippet ||
          (doc.content ? doc.content.slice(0, 280) + '...' : 'Encrypted document'),
        highlightWords,
        vectorScore: Math.round(v * 100) / 100,
        bm25Score: Math.round(bm25 * 100) / 100,
        hybridScore: Math.round(hybridScore * 100) / 100,
        latencyMs: 0,
        source: 'local',
        encrypted: !!doc.encryptedPayload,
        filePath: doc.filePath,
        fileExtension: doc.fileExtension,
      });
    }
  }

  localResults.sort((a, b) => b.hybridScore - a.hybridScore);

  let conversationalAnswer: ConversationalAnswer | undefined;
  const isConversationalQuery =
    settings.searchMode === 'conversational' ||
    trimmed.endsWith('?') ||
    /^(what|how|where|when|why|who|can|is|does|tell|show|explain|summarize)\b/i.test(trimmed);

  if (isConversationalQuery) {
    const matchingDocItems = localResults.slice(0, 8).map(r => {
      const doc = docMap.get(r.docId);
      return {
        id: r.docId,
        title: r.title,
        content: doc?.content || r.snippet,
        score: r.hybridScore,
      };
    });

    if (matchingDocItems.length > 0) {
      conversationalAnswer = synthesizeLocalAnswer(searchText, matchingDocItems);
    } else if (instantWidget) {
      conversationalAnswer = {
        query: trimmed,
        synthesizedAnswer: formatInstantAsAnswer(instantWidget),
        citations: [],
        confidence: 1.0,
      };
    }
  }

  const webResults: SearchResultItem[] = [];
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (isOnline && settings.enableWebFallback) {
    try {
      const externalMatches = await fetchAnonymousWebResults(trimmed);
      webResults.push(...externalMatches);
    } catch (err) {
      console.warn('Anonymous web query exception:', err);
    }
  }

  const endTime = performance.now();
  const totalTimeMs = Math.round((endTime - startTime) * 10) / 10;
  for (const r of localResults) r.latencyMs = totalTimeMs;

  if (useSession) {
    const titles = localResults.slice(0, 5).map(r => r.title);
    const keywords = Array.from(
      new Set(localResults.flatMap(r => r.highlightWords).slice(0, 12))
    );
    searchSession.pushTurn(trimmed, titles, keywords);
  }

  return {
    query: trimmed,
    expandedQuery: usedContext ? searchText : undefined,
    usedSessionContext: usedContext,
    results: [...localResults, ...webResults],
    instantWidget: instantWidget || undefined,
    conversationalAnswer,
    totalTimeMs,
    localResultsCount: localResults.length,
    webResultsCount: webResults.length,
  };
}

function formatInstantAsAnswer(w: InstantWidget): string {
  switch (w.type) {
    case 'time':
      return `The current ${w.title.toLowerCase()} is ${w.primaryValue}${w.secondaryValue ? ` (${w.secondaryValue})` : ''}. ${w.details || ''}`.trim();
    case 'date':
      return `Today's date is ${w.primaryValue}. ${w.secondaryValue || ''} ${w.details || ''}`.trim();
    case 'storage':
      return `Local storage: ${w.primaryValue}${w.secondaryValue ? ` (${w.secondaryValue})` : ''}. ${w.details || ''}`.trim();
    case 'system':
      return `Machine: ${w.primaryValue}. ${w.secondaryValue || ''} ${w.details || ''}`.trim();
    case 'activity':
      return `Activity: ${w.primaryValue}. ${w.secondaryValue || ''} ${w.details || ''}`.trim();
    case 'calculator':
      return `Calculation: ${w.secondaryValue || w.primaryValue}`;
    default:
      return w.primaryValue;
  }
}

async function fetchAnonymousWebResults(query: string): Promise<SearchResultItem[]> {
  const sanitizedQuery = encodeURIComponent(query.replace(/[^\w\s-]/gi, '').trim());
  if (!sanitizedQuery) return [];

  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${sanitizedQuery}&limit=8&namespace=0&format=json&origin=*`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeoutId);
    return [];
  }
  clearTimeout(timeoutId);

  if (!response.ok) return [];

  const data = await response.json();
  const titles = data[1] || [];
  const descriptions = data[2] || [];
  const urls = data[3] || [];
  const queryTerms = tokenize(query);
  const results: SearchResultItem[] = [];

  for (let i = 0; i < titles.length; i++) {
    const title = titles[i];
    const desc = descriptions[i] || `Web result for "${title}"`;
    const webUrl = urls[i] || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
    const snippetTokens = tokenize(title + ' ' + desc);
    const overlap = queryTerms.filter(t => snippetTokens.includes(t)).length;
    const matchScore = Math.max(0.35, Math.min(0.9, overlap / Math.max(1, queryTerms.length)));

    results.push({
      docId: `web_${i}_${Date.now()}`,
      title,
      category: 'web',
      snippet: desc,
      highlightWords: queryTerms,
      vectorScore: matchScore,
      bm25Score: matchScore,
      hybridScore: Math.round(matchScore * 100) / 100,
      latencyMs: 140,
      source: 'web',
      encrypted: false,
      sourceUrl: webUrl,
    });
  }

  return results;
}
