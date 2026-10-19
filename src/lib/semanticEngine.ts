/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VectorChunk, ConversationalAnswer } from '../types';

/**
 * 64-dimensional semantic concept anchors for personal knowledge management.
 */
export const SEMANTIC_CLUSTERS: Record<string, number[]> = {
  tax: [0, 1], taxes: [0, 1], deduction: [0, 2], deductions: [0, 2], writeoff: [0, 2],
  revenue: [0, 3], income: [0, 3], salary: [0, 3], dividend: [0, 4], investment: [0, 4],
  portfolio: [0, 4], expense: [0, 5], spending: [0, 5], budget: [0, 5], cost: [0, 5],
  balance: [0, 6], bank: [0, 6], checking: [0, 6], invoice: [0, 7], receipt: [0, 7],
  '1099': [0, 1], w2: [0, 1], finances: [0, 3],
  health: [8, 9], medical: [8, 9], doctor: [8, 9], hospital: [8, 9], cholesterol: [8, 10],
  lipid: [8, 10], blood: [8, 10], glucose: [8, 10], cardio: [8, 11], heart: [8, 11],
  prescription: [8, 12], medication: [8, 12], dosage: [8, 12], symptom: [8, 13], pain: [8, 13],
  lab: [8, 14], results: [8, 14], test: [8, 14], biomarker: [8, 14], therapy: [8, 15], vaccine: [8, 15],
  software: [16, 17], code: [16, 17], programming: [16, 17], architecture: [16, 18], system: [16, 18],
  design: [16, 18], database: [16, 19], sql: [16, 19], indexeddb: [16, 19], postgres: [16, 19],
  api: [16, 20], endpoint: [16, 20], rest: [16, 20], microservice: [16, 21], backend: [16, 21],
  server: [16, 21], cloud: [16, 22], docker: [16, 22], deploy: [16, 22], cache: [16, 23],
  latency: [16, 23], performance: [16, 23],
  contract: [24, 25], agreement: [24, 25], clause: [24, 25], lease: [24, 26], landlord: [24, 26],
  tenant: [24, 26], rent: [24, 26], deposit: [24, 26], nda: [24, 27], confidential: [24, 27],
  liability: [24, 28], indemnity: [24, 28], terms: [24, 29], signature: [24, 29], compliance: [24, 30],
  license: [24, 30], legal: [24, 31],
  travel: [32, 33], trip: [32, 33], vacation: [32, 33], flight: [32, 34], airline: [32, 34],
  boarding: [32, 34], airfare: [32, 34], hotel: [32, 35], reservation: [32, 35], airbnb: [32, 35],
  itinerary: [32, 36], schedule: [32, 36], passport: [32, 37], visa: [32, 37], customs: [32, 37],
  packing: [32, 38], luggage: [32, 38], gear: [32, 38], destination: [32, 39], tourism: [32, 39],
  security: [40, 41], privacy: [40, 41], sovereignty: [40, 41], encryption: [40, 42], encrypted: [40, 42],
  e2ee: [40, 42], aes: [40, 42], key: [40, 43], passphrase: [40, 43], password: [40, 43],
  credential: [40, 43], vault: [40, 44], hash: [40, 45], sha256: [40, 45], pbkdf2: [40, 45],
  audit: [40, 46], telemetry: [40, 47], zero: [40, 47],
  project: [48, 49], roadmap: [48, 49], timeline: [48, 50], milestone: [48, 50], deadline: [48, 50],
  sprint: [48, 51], deliverable: [48, 51], okr: [48, 52], kpi: [48, 52], goal: [48, 52],
  meeting: [48, 53], minutes: [48, 53], action: [48, 54], strategy: [48, 55],
  research: [56, 57], study: [56, 57], paper: [56, 57], algorithm: [56, 58], vector: [56, 58],
  embedding: [56, 58], cosine: [56, 58], metric: [56, 59], benchmark: [56, 59], formula: [56, 60],
  model: [56, 61], dataset: [56, 62], analysis: [56, 63],
};

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers',
  'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
  'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once',
  'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
  'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
  'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will',
  'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Generate 64-dim L2-normalized embedding (concept clusters + subword 3-grams). */
export function generateVector(text: string): number[] {
  const dim = 64;
  const vec = new Float32Array(dim);
  const tokens = tokenize(text);
  if (tokens.length === 0) return Array.from(vec);

  for (const token of tokens) {
    const clusterIndices = SEMANTIC_CLUSTERS[token];
    if (clusterIndices) {
      for (const idx of clusterIndices) vec[idx] += 2.5;
    }
    if (token.length > 4) {
      const prefix = token.slice(0, 4);
      for (const [key, indices] of Object.entries(SEMANTIC_CLUSTERS)) {
        if (key.startsWith(prefix)) {
          for (const idx of indices) vec[idx] += 0.8;
        }
      }
    }
    const padded = `^${token}$`;
    for (let i = 0; i <= padded.length - 3; i++) {
      const trigram = padded.slice(i, i + 3);
      const h = hashString(trigram);
      const targetDim = h % dim;
      const sign = (h & 0x80000000) === 0 ? 1.0 : -1.0;
      vec[targetDim] += sign * 0.35;
    }
  }

  let sumSq = 0;
  for (let i = 0; i < dim; i++) sumSq += vec[i] * vec[i];
  const norm = Math.sqrt(sumSq);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) vec[i] /= norm;
  }
  return Array.from(vec);
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) dot += vecA[i] * vecB[i];
  return Math.max(0, Math.min(1, (dot + 1) / 2));
}

export function computeBM25(
  queryTokens: string[],
  docTokens: string[],
  avgDocLength = 150,
  k1 = 1.5,
  b = 0.75
): number {
  if (queryTokens.length === 0 || docTokens.length === 0) return 0;
  const docLen = docTokens.length;
  const termCounts = new Map<string, number>();
  for (const t of docTokens) termCounts.set(t, (termCounts.get(t) || 0) + 1);
  let score = 0;
  for (const q of queryTokens) {
    const tf = termCounts.get(q) || 0;
    if (tf > 0) {
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (docLen / avgDocLength));
      score += numerator / denominator;
    }
  }
  return Math.min(1, score / (queryTokens.length * (k1 + 1)));
}

/**
 * Chunk document for vector indexing.
 * When redactSnippets is true, full text is not stored at rest.
 */
export function chunkDocument(
  docId: string,
  content: string,
  chunkSize = 300,
  overlap = 50,
  redactSnippets = false
): VectorChunk[] {
  const words = content.split(/\s+/);
  if (words.length <= chunkSize) {
    const tokens = tokenize(content);
    return [
      {
        docId,
        chunkIndex: 0,
        snippet: redactSnippets ? '' : content.slice(0, 400),
        vector: generateVector(content),
        keywords: Array.from(new Set(tokens)).slice(0, 10),
      },
    ];
  }

  const chunks: VectorChunk[] = [];
  let start = 0;
  let chunkIdx = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunkWords = words.slice(start, end);
    const chunkText = chunkWords.join(' ');
    const tokens = tokenize(chunkText);
    chunks.push({
      docId,
      chunkIndex: chunkIdx++,
      snippet: redactSnippets ? '' : chunkText.slice(0, 400),
      vector: generateVector(chunkText),
      keywords: Array.from(new Set(tokens)).slice(0, 10),
    });
    start += chunkSize - overlap;
  }
  return chunks;
}

/** Extractive local answer synthesis — no cloud LLM. */
export function synthesizeLocalAnswer(
  query: string,
  matchingDocs: { id: string; title: string; content: string; score: number }[]
): ConversationalAnswer {
  if (matchingDocs.length === 0) {
    return {
      query,
      synthesizedAnswer:
        'No local documents in your vault matched the semantic intent of this query. You can add relevant documents or check the anonymous web fallback.',
      citations: [],
      confidence: 0,
    };
  }

  const queryTokens = tokenize(query);
  const queryVec = generateVector(query);
  const candidatePassages: {
    docId: string;
    title: string;
    passage: string;
    relevance: number;
  }[] = [];

  for (const doc of matchingDocs.slice(0, 4)) {
    const sentences = doc.content
      .split(/(?<=[.?!])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 20);

    for (const sentence of sentences) {
      const sentenceVec = generateVector(sentence);
      const sim = cosineSimilarity(queryVec, sentenceVec);
      const sentenceTokens = tokenize(sentence);
      const overlap = queryTokens.filter(t => sentenceTokens.includes(t)).length;
      const relevance = sim * 0.7 + (overlap / Math.max(1, queryTokens.length)) * 0.3;
      if (relevance > 0.45) {
        candidatePassages.push({
          docId: doc.id,
          title: doc.title,
          passage: sentence,
          relevance,
        });
      }
    }
  }

  candidatePassages.sort((a, b) => b.relevance - a.relevance);
  const topPassages = candidatePassages.slice(0, 3);

  if (topPassages.length === 0) {
    const primary = matchingDocs[0];
    return {
      query,
      synthesizedAnswer: `Relevant information was identified in "${primary.title}". The document discusses related topics including: ${tokenize(primary.content).slice(0, 6).join(', ')}.`,
      citations: [
        {
          docId: primary.id,
          title: primary.title,
          passage: primary.content.slice(0, 240) + '...',
          relevance: primary.score,
        },
      ],
      confidence: primary.score,
    };
  }

  const answerIntro = 'Based on your indexed private documents, here is the synthesized context:';
  const bullets = topPassages.map(p => `• ${p.passage}`).join('\n\n');
  const synthesizedAnswer = `${answerIntro}\n\n${bullets}`;

  return {
    query,
    synthesizedAnswer,
    citations: topPassages,
    confidence: topPassages[0].relevance,
  };
}
