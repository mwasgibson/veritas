/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Reciprocal Rank Fusion and hybrid score fusion for local search ranking.
 */

/**
 * Reciprocal Rank Fusion — robust multi-list ranking.
 * score(d) = Σ 1 / (k + rank_i(d)) across ranked lists.
 * k=60 is the Cormack et al. default; works well for sparse + dense fusion.
 */
export function reciprocalRankFusion(
  rankedLists: string[][],
  k = 60
): Map<string, number> {
  const scores = new Map<string, number>();
  for (const list of rankedLists) {
    list.forEach((id, rank) => {
      const contrib = 1 / (k + rank + 1);
      scores.set(id, (scores.get(id) || 0) + contrib);
    });
  }
  return scores;
}

/**
 * Fuse vector ranks and BM25 ranks into a single hybrid score in [0, 1].
 * When mode is pure semantic or exact, falls back to that signal only.
 */
export function fuseHybridScores(
  docIds: string[],
  vectorById: Map<string, number>,
  bm25ById: Map<string, number>,
  mode: 'hybrid' | 'semantic' | 'exact' | 'conversational',
  hybridWeight = 0.65
): Map<string, number> {
  if (mode === 'semantic') {
    return new Map(docIds.map(id => [id, vectorById.get(id) || 0]));
  }
  if (mode === 'exact') {
    return new Map(docIds.map(id => [id, bm25ById.get(id) || 0]));
  }

  const byVector = [...docIds].sort(
    (a, b) => (vectorById.get(b) || 0) - (vectorById.get(a) || 0)
  );
  const byBm25 = [...docIds].sort(
    (a, b) => (bm25ById.get(b) || 0) - (bm25ById.get(a) || 0)
  );

  const rrf = reciprocalRankFusion([byVector, byBm25], 60);

  let maxRrf = 0;
  for (const v of rrf.values()) maxRrf = Math.max(maxRrf, v);
  const fused = new Map<string, number>();
  for (const id of docIds) {
    const rrfN = maxRrf > 0 ? (rrf.get(id) || 0) / maxRrf : 0;
    const v = vectorById.get(id) || 0;
    const b = bm25ById.get(id) || 0;
    const linear = hybridWeight * v + (1 - hybridWeight) * b;
    fused.set(id, Math.round((0.55 * rrfN + 0.45 * linear) * 1000) / 1000);
  }
  return fused;
}
