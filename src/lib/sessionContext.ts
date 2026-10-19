/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * In-memory multi-turn session context for conversational search.
 * Expands follow-up queries using prior turns so semantic search understands
 * "what about that?" / "and the second one?" style references without cloud LLM.
 * Nothing here is persisted or transmitted — session dies with the page.
 */

import { tokenize } from './semanticEngine';

export interface SessionTurn {
  query: string;
  /** Top local doc titles from the previous result set */
  topTitles: string[];
  /** Top keywords from previous hits */
  topKeywords: string[];
  timestamp: number;
}

const MAX_TURNS = 8;
const FOLLOW_UP_RE =
  /^(and|also|what about|how about|tell me more|more about|the same|that one|those|it|them|this|that)\b/i;
const PRONOUN_RE = /\b(it|that|this|those|them|he|she|they)\b/i;

/**
 * Lightweight session store (module singleton — one tab session).
 */
class SearchSession {
  private turns: SessionTurn[] = [];

  clear(): void {
    this.turns = [];
  }

  getTurns(): readonly SessionTurn[] {
    return this.turns;
  }

  /**
   * Record a completed search for future expansion.
   */
  pushTurn(query: string, topTitles: string[], topKeywords: string[]): void {
    const q = query.trim();
    if (!q) return;
    this.turns.push({
      query: q,
      topTitles: topTitles.slice(0, 5),
      topKeywords: topKeywords.slice(0, 12),
      timestamp: Date.now(),
    });
    if (this.turns.length > MAX_TURNS) {
      this.turns = this.turns.slice(-MAX_TURNS);
    }
  }

  /**
   * Expand a follow-up query with prior context when the user refers back.
   * Returns the original query unchanged when it looks self-contained.
   */
  expandQuery(rawQuery: string): { expanded: string; usedContext: boolean } {
    const q = rawQuery.trim();
    if (!q || this.turns.length === 0) {
      return { expanded: q, usedContext: false };
    }

    const last = this.turns[this.turns.length - 1];
    const looksLikeFollowUp =
      FOLLOW_UP_RE.test(q) ||
      (PRONOUN_RE.test(q) && tokenize(q).length <= 6) ||
      q.split(/\s+/).length <= 3;

    if (!looksLikeFollowUp) {
      return { expanded: q, usedContext: false };
    }

    const contextBits = [
      ...last.topTitles.slice(0, 2),
      ...last.topKeywords.slice(0, 6),
      last.query,
    ].filter(Boolean);

    const unique = Array.from(new Set(contextBits.map(s => s.toLowerCase())));
    const expanded = `${q} ${unique.join(' ')}`.trim();
    return { expanded, usedContext: true };
  }
}

export const searchSession = new SearchSession();
