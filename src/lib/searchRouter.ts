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

export interface SearchExecutionResult {
  query: string;
  results: SearchResultItem[];
  instantWidget?: InstantWidget;
  conversationalAnswer?: ConversationalAnswer;
  totalTimeMs: number;
  localResultsCount: number;
  webResultsCount: number;
}

/**
 * Execute Dual-Layer Search: Local Semantic Index First + Anonymous Fallback
 */
export async function executeSearch(
  query: string,
  settings: SearchSettings,
  masterKey?: CryptoKey | null,
  actorRole: UserRole = 'owner'
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

  // 0. Resolve Instant Utility Answers (Time, Date, Calculations, Direct Facts) immediately
  const instantWidget = await resolveInstantAnswer(trimmed);

  // Record audit query
  await storageEngine.recordAudit(
    'QUERY',
    actorRole,
    `Executed search: "${trimmed.slice(0, 50)}${trimmed.length > 50 ? '...' : ''}" [Mode: ${settings.searchMode}]`
  );

  // 1. Fetch all local documents and precomputed vector chunks
  const [docs, vectorChunks] = await Promise.all([
    storageEngine.getAllDocuments(masterKey),
    storageEngine.getAllVectors(),
  ]);

  const queryTokens = tokenize(trimmed);
  const queryVector = generateVector(trimmed);

  // Map docId -> document for rapid metadata lookup
  const docMap = new Map(docs.map(d => [d.id, d]));

  // Calculate scores per document by taking the maximum chunk similarity
  const docChunkScores = new Map<
    string,
    { bestVectorSim: number; bestSnippet: string; keywords: string[] }
  >();

  for (const chunk of vectorChunks) {
    const sim = cosineSimilarity(queryVector, chunk.vector);
    const existing = docChunkScores.get(chunk.docId);
    if (!existing || sim > existing.bestVectorSim) {
      docChunkScores.set(chunk.docId, {
        bestVectorSim: sim,
        bestSnippet: chunk.snippet,
        keywords: chunk.keywords,
      });
    }
  }

  // Score each local document
  const localResults: SearchResultItem[] = [];

  for (const doc of docs) {
    const chunkInfo = docChunkScores.get(doc.id) || {
      bestVectorSim: 0,
      bestSnippet: doc.content ? doc.content.slice(0, 300) : '',
      keywords: [],
    };

    // Calculate lexical BM25
    const docTokens = tokenize(doc.title + ' ' + (doc.content || '') + ' ' + doc.tags.join(' '));
    const bm25 = computeBM25(queryTokens, docTokens);

    // Compute hybrid weighted score based on settings
    let hybridScore = 0;
    if (settings.searchMode === 'semantic') {
      hybridScore = chunkInfo.bestVectorSim;
    } else if (settings.searchMode === 'exact') {
      hybridScore = bm25;
    } else {
      // Hybrid mode (default: 0.65 vector + 0.35 BM25)
      const alpha = settings.hybridWeight;
      hybridScore = alpha * chunkInfo.bestVectorSim + (1 - alpha) * bm25;
    }

    // Identify highlight words from query that appear in title or content
    const highlightWords = queryTokens.filter(t =>
      docTokens.includes(t) || doc.title.toLowerCase().includes(t)
    );

    // Threshold filter: only include if above minimum confidence threshold or exact match
    if (hybridScore >= settings.minLocalConfidenceThreshold || bm25 > 0.25) {
      localResults.push({
        docId: doc.id,
        title: doc.title,
        category: doc.category,
        snippet: chunkInfo.bestSnippet || (doc.content ? doc.content.slice(0, 280) + '...' : 'Encrypted document'),
        highlightWords,
        vectorScore: Math.round(chunkInfo.bestVectorSim * 100) / 100,
        bm25Score: Math.round(bm25 * 100) / 100,
        hybridScore: Math.round(hybridScore * 100) / 100,
        latencyMs: 0, // Will be set after timing
        source: 'local',
        encrypted: !!doc.encryptedPayload,
        filePath: doc.filePath,
        fileExtension: doc.fileExtension,
      });
    }
  }

  // Sort local results by descending hybrid score
  localResults.sort((a, b) => b.hybridScore - a.hybridScore);

  // 2. Synthesize conversational answer if requested or if query is conversational
  let conversationalAnswer: ConversationalAnswer | undefined = undefined;
  const isConversationalQuery =
    settings.searchMode === 'conversational' ||
    trimmed.endsWith('?') ||
    /^(what|how|where|when|why|who|can|is|does|tell|show)\b/i.test(trimmed);

  if (isConversationalQuery) {
    const matchingDocItems = localResults.map(r => {
      const doc = docMap.get(r.docId);
      return {
        id: r.docId,
        title: r.title,
        content: doc?.content || r.snippet,
        score: r.hybridScore,
      };
    });

    if (matchingDocItems.length > 0) {
      conversationalAnswer = synthesizeLocalAnswer(trimmed, matchingDocItems);
    } else if (instantWidget) {
      // Direct synthesize from instant utility widget (Time, Date, Storage, System, Activity, Calculator)
      const answerText =
        instantWidget.type === 'time'
          ? `The current ${instantWidget.title.toLowerCase()} is ${instantWidget.primaryValue} (${instantWidget.secondaryValue}). ${instantWidget.details || ''}`
          : instantWidget.type === 'date'
          ? `Today's date is ${instantWidget.primaryValue}. ${instantWidget.secondaryValue}. ${instantWidget.details || ''}`
          : instantWidget.type === 'storage'
          ? `Local machine storage status: ${instantWidget.primaryValue} (${instantWidget.secondaryValue}). ${instantWidget.details || ''}`
          : instantWidget.type === 'system'
          ? `Your machine specifications: ${instantWidget.primaryValue}. Display & runtime: ${instantWidget.secondaryValue}. ${instantWidget.details || ''}`
          : instantWidget.type === 'activity'
          ? `Your machine activity history: ${instantWidget.primaryValue}. Breakdown: ${instantWidget.secondaryValue}. ${instantWidget.details || ''}`
          : instantWidget.type === 'calculator'
          ? `Calculation: ${instantWidget.secondaryValue || instantWidget.primaryValue}`
          : instantWidget.primaryValue;

      conversationalAnswer = {
        query: trimmed,
        synthesizedAnswer: answerText,
        citations: [],
        confidence: 1.0,
      };
    }
  }

  // 3. Fallback / Live Internet Search:
  // As required: ALWAYS search the internet if the machine recognizes it is connected to the internet
  const webResults: SearchResultItem[] = [];
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (isOnline) {
    try {
      const externalMatches = await fetchAnonymousWebResults(trimmed);
      webResults.push(...externalMatches);
    } catch (err) {
      console.warn('Anonymous web query exception:', err);
    }
  }

  const endTime = performance.now();
  const totalTimeMs = Math.round((endTime - startTime) * 10) / 10;

  // Stamp latency on local items
  for (const r of localResults) {
    r.latencyMs = totalTimeMs;
  }

  return {
    query: trimmed,
    results: [...localResults, ...webResults],
    instantWidget: instantWidget || undefined,
    conversationalAnswer,
    totalTimeMs,
    localResultsCount: localResults.length,
    webResultsCount: webResults.length,
  };
}

/**
 * Anonymous External Web Search Provider.
 * Strips user headers, cookies, and local identifiers, querying live public knowledge indexes.
 */
async function fetchAnonymousWebResults(query: string): Promise<SearchResultItem[]> {
  const sanitizedQuery = encodeURIComponent(query.replace(/[^\w\s-]/gi, '').trim());
  if (!sanitizedQuery) return [];

  // Query Wikipedia OpenSearch API (anonymous, privacy-preserving, live index)
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${sanitizedQuery}&limit=8&namespace=0&format=json&origin=*`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
      // No credentials, no cookies, no tracking
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
    const desc = descriptions[i] || `Live web search result for "${title}"`;
    const webUrl = urls[i] || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;

    // Compute basic lexical match score for the web snippet
    const snippetTokens = tokenize(title + ' ' + desc);
    const overlap = queryTerms.filter(t => snippetTokens.includes(t)).length;
    const matchScore = Math.max(0.4, Math.min(0.95, overlap / Math.max(1, queryTerms.length)));

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
