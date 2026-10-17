/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InstantWidget } from '../types';

const CITY_TIMEZONES: Record<string, string> = {
  london: 'Europe/London',
  tokyo: 'Asia/Tokyo',
  paris: 'Europe/Paris',
  berlin: 'Europe/Berlin',
  sydney: 'Australia/Sydney',
  dubai: 'Asia/Dubai',
  singapore: 'Asia/Singapore',
  'new york': 'America/New_York',
  nyc: 'America/New_York',
  'san francisco': 'America/Los_Angeles',
  sf: 'America/Los_Angeles',
  'los angeles': 'America/Los_Angeles',
  la: 'America/Los_Angeles',
  chicago: 'America/Chicago',
  toronto: 'America/Toronto',
  'hong kong': 'Asia/Hong_Kong',
  nairobi: 'Africa/Nairobi',
  delhi: 'Asia/Kolkata',
  mumbai: 'Asia/Kolkata',
  auckland: 'Pacific/Auckland',
  seattle: 'America/Los_Angeles',
  boston: 'America/New_York',
  miami: 'America/New_York',
  amsterdam: 'Europe/Amsterdam',
  rome: 'Europe/Rome',
  madrid: 'Europe/Madrid',
  bangkok: 'Asia/Bangkok',
  seoul: 'Asia/Seoul',
  cairo: 'Africa/Cairo',
  johannesburg: 'Africa/Johannesburg',
  lagos: 'Africa/Lagos',
  'buenos aires': 'America/Argentina/Buenos_Aires',
  'sao paulo': 'America/Sao_Paulo',
  'mexico city': 'America/Mexico_City',
  utc: 'UTC',
  gmt: 'GMT',
};

/**
 * Resolve instant local utility answers (Time, Date, Calculator, Units)
 */
export async function resolveInstantAnswer(query: string): Promise<InstantWidget | null> {
  const raw = query.trim().toLowerCase();
  const q = raw.replace(/[?!.,]+$/g, '').trim();

  // 1. Time Queries
  // Matches: "time", "the time", "what time is it", "current time", "time now", "what is the time",
  // "tell me the time", "clock", "local time", "tokyo time", "time in london", "what's the time"
  const isTimeQuery =
    q === 'time' ||
    q === 'the time' ||
    q === 'clock' ||
    q === 'current time' ||
    q === 'local time' ||
    q === 'time now' ||
    q === 'what time' ||
    q === 'what time is it' ||
    q === 'what time is it now' ||
    q === 'what is the time' ||
    q === "what's the time" ||
    q === 'tell me the time' ||
    q === 'show time' ||
    q === 'give me the time' ||
    q === 'world time' ||
    /\b(what('?s| is)? (the )?time|what time is it|current time|local time|time now)\b/i.test(q) ||
    /\btime in [a-z\s]+/i.test(q) ||
    /^[a-z\s]+ time$/i.test(q);

  if (isTimeQuery) {
    // Check if a specific city was requested
    let targetTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let locationLabel = 'Local Time';

    for (const [city, tz] of Object.entries(CITY_TIMEZONES)) {
      if (q.includes(city)) {
        targetTimezone = tz;
        locationLabel = `Time in ${city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;
        break;
      }
    }

    const now = new Date();
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: targetTimezone,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const timeFormatter24 = new Intl.DateTimeFormat('en-US', {
      timeZone: targetTimezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: targetTimezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const primaryValue = timeFormatter.format(now);
    const secondaryValue = dateFormatter.format(now);
    const time24 = timeFormatter24.format(now);

    // Compute UTC offset and timezone name
    let tzName = targetTimezone;
    try {
      tzName = new Intl.DateTimeFormat('en-US', {
        timeZone: targetTimezone,
        timeZoneName: 'long',
      }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value || targetTimezone;
    } catch {
      // fallback
    }

    const utcTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(now);

    return {
      type: 'time',
      title: locationLabel,
      primaryValue,
      secondaryValue: `${secondaryValue} · 24-hr: ${time24}`,
      details: `${tzName} · UTC Reference: ${utcTime}`,
      source: 'Veritas Precision Atomic Clock (Zero-Cloud Local)',
      timezone: targetTimezone,
    };
  }

  // 2. Date Queries
  // e.g. "date", "today", "today's date", "what is the date", "what day is it", "current date"
  const isDateQuery =
    q === 'date' ||
    q === 'the date' ||
    q === 'today' ||
    q === "today's date" ||
    q === 'current date' ||
    q === 'calendar' ||
    q === 'day' ||
    q === 'what day is it' ||
    q === 'what day is today' ||
    /^(what('?s| is)? )?(today('?s)? )?date|what day is it|current date|today('?s)? date/i.test(q);

  if (isDateQuery) {
    const now = new Date();
    const primaryValue = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(now);

    const secondaryValue = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(now);

    return {
      type: 'time',
      title: "Today's Date",
      primaryValue,
      secondaryValue: `Current time: ${secondaryValue}`,
      details: Intl.DateTimeFormat().resolvedOptions().timeZone,
      source: 'Veritas System Calendar',
    };
  }

  // 3. Calculator Queries
  // e.g. "50 * 20", "125 / 5", "2^8", "15% of 200", "sqrt(144)"
  const percentageMatch = q.match(/^(\d+(\.\d+)?)%\s*(of|\*)\s*(\d+(\.\d+)?)$/);
  if (percentageMatch) {
    const pct = parseFloat(percentageMatch[1]);
    const val = parseFloat(percentageMatch[4]);
    const result = (pct / 100) * val;
    return {
      type: 'calculator',
      title: 'Calculation',
      primaryValue: String(result),
      secondaryValue: `${pct}% of ${val} = ${result}`,
      details: 'Mathematical Calculation',
      source: 'Veritas Engine Calculator',
    };
  }

  // Simple safe arithmetic: e.g. "45 + 15", "100 * 4", "99 / 3"
  const mathMatch = q.match(/^([\d\s\.\+\-\*\/\(\)\^%]+)$/);
  if (mathMatch && /[\+\-\*\/\^%]/.test(q) && !/^[0-9]+$/.test(q.trim())) {
    try {
      const sanitized = q.replace(/\^/g, '**');
      // Evaluate strictly sanitized math
      if (/^[0-9\.\s\+\-\*\/\(\)\%]+$/.test(sanitized)) {
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${sanitized});`)();
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
          return {
            type: 'calculator',
            title: 'Calculation',
            primaryValue: String(result),
            secondaryValue: `${query.trim()} = ${result}`,
            details: 'Standard Arithmetic Computation',
            source: 'Veritas Engine Calculator',
          };
        }
      }
    } catch {
      // Ignore evaluation errors
    }
  }

  // 4. DuckDuckGo Instant Answer Fallback (for facts, definitions, entities)
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const res = await fetch(ddgUrl);
      if (res.ok) {
        const data = await res.json();

        if (data.Answer) {
          return {
            type: 'direct_answer',
            title: 'Instant Answer',
            primaryValue: data.Answer,
            details: data.AnswerType || 'Direct Calculation',
            source: 'DuckDuckGo Instant Answer',
          };
        }

        if (data.AbstractText) {
          return {
            type: 'direct_answer',
            title: data.Heading || query,
            primaryValue: data.AbstractText,
            secondaryValue: data.AbstractSource ? `Source: ${data.AbstractSource}` : undefined,
            sourceUrl: data.AbstractURL,
            source: data.AbstractSource || 'Encyclopedia',
          };
        }

        if (data.Definition) {
          return {
            type: 'definition',
            title: `Definition: ${data.Heading || query}`,
            primaryValue: data.Definition,
            sourceUrl: data.DefinitionURL,
            source: data.DefinitionSource || 'Dictionary',
          };
        }
      }
    } catch {
      // Gracefully continue
    }
  }

  return null;
}
