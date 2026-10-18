/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InstantWidget } from '../types';
import {
  getMachineStorageInfo,
  getMachineSystemInfo,
  getMachineActivityInfo,
  getDateCalendarInfo,
} from './machineTelemetry';

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

  // 2. Date & Calendar Queries
  // e.g. "date", "today", "today's date", "what is the date", "what day is it", "current date", "calendar", "day"
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
    const dateData = getDateCalendarInfo();
    const now = new Date();
    const liveTime = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(now);

    return {
      type: 'date',
      title: "Today's Date & Calendar",
      primaryValue: dateData.formattedDate,
      secondaryValue: `Day ${dateData.dayOfYear} of ${dateData.totalDaysInYear} (${dateData.percentOfYear}% of year) · Week ${dateData.weekNumber}`,
      details: `${dateData.daysRemainingInYear} days remaining in ${now.getFullYear()} · Time: ${liveTime} (${dateData.timeZone})`,
      source: 'Veritas System Calendar (Local Precision)',
      dateData,
    };
  }

  // 3. Storage Capacity Queries
  // e.g. "storage", "storage capacity", "disk space", "disk", "storage info", "drive space", "how much storage", "quota"
  const isStorageQuery =
    q === 'storage' ||
    q === 'storage capacity' ||
    q === 'disk' ||
    q === 'disk space' ||
    q === 'disk usage' ||
    q === 'storage info' ||
    q === 'storage limit' ||
    q === 'drive space' ||
    q === 'hard drive' ||
    q === 'storage quota' ||
    q === 'quota' ||
    /\b(storage capacity|disk space|how much storage|storage usage|storage quota|drive space)\b/i.test(q) ||
    /^(how much )?(storage|disk space|disk|memory space) (do i have|is left|is available|used)/i.test(q) ||
    /^(what('?s| is)? )?(my )?(storage|storage capacity|disk space|drive space|storage quota)/i.test(q);

  if (isStorageQuery) {
    const storageInfo = await getMachineStorageInfo();
    return {
      type: 'storage',
      title: 'Local Machine Storage Capacity',
      primaryValue: `${storageInfo.usedFormatted} used of ${storageInfo.quotaFormatted}`,
      secondaryValue: `${storageInfo.freeFormatted} available (${storageInfo.percentUsed}% consumed)`,
      details: `Client Storage: ${storageInfo.vaultDocsCount} IndexedDB vault documents (${storageInfo.vaultSizeFormatted})${storageInfo.connectedFolder ? ` · Folder: ${storageInfo.connectedFolder}` : ''}`,
      source: 'Client Storage Quota & IndexedDB Manager (Local)',
      storageData: storageInfo,
    };
  }

  // 4. System, Machine & Hardware Specifications Queries
  // e.g. "machine info", "system info", "system specs", "my machine", "computer info", "specs", "device info", "os", "what os", "hardware"
  const isSystemQuery =
    q === 'machine' ||
    q === 'machine info' ||
    q === 'my machine' ||
    q === 'system' ||
    q === 'system info' ||
    q === 'system specs' ||
    q === 'specs' ||
    q === 'computer info' ||
    q === 'device info' ||
    q === 'device specs' ||
    q === 'hardware' ||
    q === 'os' ||
    q === 'what os' ||
    q === 'operating system' ||
    /^(what('?s| is)? )?(my )?(system info|machine info|device specs|computer specs|hardware|operating system|os)/i.test(q) ||
    /\b(system info|machine specs|system specs|device specs|hardware info)\b/i.test(q);

  if (isSystemQuery) {
    const systemInfo = await getMachineSystemInfo();
    return {
      type: 'system',
      title: 'Local Machine & System Specifications',
      primaryValue: `${systemInfo.os} · ${systemInfo.cpuCores} Logical CPU Cores`,
      secondaryValue: `${systemInfo.browser} · ${systemInfo.screenResolution} Display (${systemInfo.pixelRatio}x DPI)`,
      details: `Storage: ${systemInfo.storage.usedFormatted} used of ${systemInfo.storage.quotaFormatted} · Network: ${systemInfo.isOnline ? 'Online' : 'Offline'}${systemInfo.deviceMemoryGb ? ` · RAM: ${systemInfo.deviceMemoryGb}` : ''}`,
      source: 'Local Client Hardware & Runtime Inspector (Zero-Cloud)',
      systemData: systemInfo,
      storageData: systemInfo.storage,
    };
  }

  // 5. What I Have Done / Changed Queries (Audit trail, Activity log, History)
  // e.g. "what i have done", "what have i done", "what did i change", "what i changed", "my changes", "recent changes", "changes", "history", "recent activity", "activity log", "audit log", "changelog"
  const isActivityQuery =
    q === 'what i have done' ||
    q === 'what have i done' ||
    q === 'what i changed' ||
    q === 'what did i change' ||
    q === 'what did i do' ||
    q === 'what changed' ||
    q === 'changes' ||
    q === 'my changes' ||
    q === 'recent changes' ||
    q === 'history' ||
    q === 'activity' ||
    q === 'my activity' ||
    q === 'recent activity' ||
    q === 'activity log' ||
    q === 'audit log' ||
    q === 'changelog' ||
    q === 'actions' ||
    q === 'my actions' ||
    q === 'recent actions' ||
    /what (i have done|have i done|did i change|did i do|i changed|changed)/i.test(q) ||
    /^(my )?(changes|activity|history|actions|recent activity|recent changes)$/i.test(q);

  if (isActivityQuery) {
    const activityInfo = await getMachineActivityInfo();
    return {
      type: 'activity',
      title: 'Local Machine Activity & Changes Log',
      primaryValue: `${activityInfo.totalEvents} recorded actions on this machine`,
      secondaryValue: `${activityInfo.ingestCount} documents indexed · ${activityInfo.queryCount} queries executed · ${activityInfo.purgeCount} deleted`,
      details: `Latest action: ${activityInfo.lastActionSummary}`,
      source: 'Veritas Cryptographic Audit Trail (SHA-256 Tamper-Evident)',
      activityData: activityInfo,
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
