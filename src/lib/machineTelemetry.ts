/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { storageEngine } from './storage';
import {
  StorageDetails,
  SystemDetails,
  ActivityDetails,
  DateCalendarDetails,
  ActivityChangeItem,
} from '../types';

/**
 * Format raw byte counts to human-readable units
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
  return `${val} ${sizes[i]}`;
}

/**
 * Format relative timestamp (e.g. "Just now", "4m ago", "2h ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

/**
 * Detect client Operating System with high precision
 */
export function detectOperatingSystem(): string {
  if (typeof navigator === 'undefined') return 'Local Machine OS';

  const userAgent = navigator.userAgent || '';
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';

  if (/mac/i.test(platform) || /macintosh|mac os x/i.test(userAgent)) {
    return 'macOS (Darwin)';
  }
  if (/win/i.test(platform) || /windows/i.test(userAgent)) {
    if (/nt 10.0/i.test(userAgent)) return 'Windows 10 / Windows 11';
    return 'Microsoft Windows';
  }
  if (/linux/i.test(platform) || /linux/i.test(userAgent)) {
    if (/android/i.test(userAgent)) return 'Android OS';
    return 'Linux (POSIX)';
  }
  if (/cros/i.test(userAgent)) {
    return 'ChromeOS';
  }
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return 'Apple iOS';
  }
  return platform || 'Local Machine OS';
}

/**
 * Detect browser engine
 */
export function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'Modern Web Environment';
  const ua = navigator.userAgent;

  if (/edg/i.test(ua)) return 'Microsoft Edge';
  if (/chrome|crios/i.test(ua) && !/opr|opera/i.test(ua)) return 'Google Chrome / Chromium';
  if (/firefox|fxios/i.test(ua)) return 'Mozilla Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Apple Safari';
  if (/opr|opera/i.test(ua)) return 'Opera';

  return 'Local Browser Engine';
}

/**
 * Query real machine storage capacity and local vault statistics
 */
export async function getMachineStorageInfo(): Promise<StorageDetails> {
  let usedBytes = 0;
  let quotaBytes = 0;
  let persisted = false;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      if (navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        usedBytes = estimate.usage || 0;
        quotaBytes = estimate.quota || 0;
      }
      if (navigator.storage.persisted) {
        persisted = await navigator.storage.persisted();
      }
    } catch {
      // Browser permissions or container limit
    }
  }

  // Vault metrics from real storage
  let vaultDocsCount = 0;
  let vaultVectorsCount = 0;
  let vaultSizeBytes = 0;
  let connectedFolder: string | null = null;

  try {
    const [docs, vectors, folder] = await Promise.all([
      storageEngine.getAllDocuments(null),
      storageEngine.getAllVectors(),
      storageEngine.getSetting<{ name: string; path?: string }>('connected_folder'),
    ]);

    vaultDocsCount = docs.length;
    vaultVectorsCount = vectors.length;
    vaultSizeBytes = docs.reduce((acc, d) => acc + (d.fileSize || d.content.length || 0), 0);
    connectedFolder = folder ? `${folder.name}${folder.path ? ` (${folder.path})` : ''}` : null;
  } catch {
    // Graceful fallback
  }

  const freeBytes = Math.max(0, quotaBytes - usedBytes);
  const percentUsed = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0;

  return {
    usedBytes,
    quotaBytes,
    usedFormatted: formatBytes(usedBytes),
    quotaFormatted: formatBytes(quotaBytes),
    freeFormatted: formatBytes(freeBytes),
    percentUsed: Math.round(percentUsed * 100) / 100,
    persisted,
    vaultDocsCount,
    vaultVectorsCount,
    vaultSizeBytes,
    vaultSizeFormatted: formatBytes(vaultSizeBytes),
    connectedFolder,
  };
}

/**
 * Query full machine system specs and telemetry
 */
export async function getMachineSystemInfo(): Promise<SystemDetails> {
  const storage = await getMachineStorageInfo();
  const os = detectOperatingSystem();
  const browser = detectBrowser();

  const cpuCores =
    typeof navigator !== 'undefined' && navigator.hardwareConcurrency
      ? navigator.hardwareConcurrency
      : 4;

  const deviceMemoryGb =
    typeof navigator !== 'undefined' && (navigator as any).deviceMemory
      ? `${(navigator as any).deviceMemory} GB`
      : undefined;

  const width = typeof window !== 'undefined' ? window.screen.width : 1920;
  const height = typeof window !== 'undefined' ? window.screen.height : 1080;
  const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const colorDepth = typeof window !== 'undefined' ? window.screen.colorDepth || 24 : 24;

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  let connectionType: string | undefined = undefined;
  if (typeof navigator !== 'undefined' && (navigator as any).connection) {
    const conn = (navigator as any).connection;
    connectionType = conn.effectiveType ? `${conn.effectiveType.toUpperCase()} (${conn.downlink || 0} Mbps)` : undefined;
  }

  return {
    os,
    browser,
    cpuCores,
    deviceMemoryGb,
    screenResolution: `${width} × ${height}`,
    pixelRatio,
    colorDepth,
    isOnline,
    connectionType,
    storage,
  };
}

/**
 * Query what the user has done / changed from the tamper-evident audit log
 */
export async function getMachineActivityInfo(): Promise<ActivityDetails> {
  try {
    const allLogs = await storageEngine.getAuditLogs();
    const totalEvents = allLogs.length;

    let ingestCount = 0;
    let queryCount = 0;
    let purgeCount = 0;
    let syncCount = 0;

    for (const log of allLogs) {
      if (log.action === 'INGEST') ingestCount++;
      else if (log.action === 'QUERY') queryCount++;
      else if (log.action === 'PURGE') purgeCount++;
      else if (log.action === 'SYNC' || log.action === 'EXPORT') syncCount++;
    }

    // Latest entries first
    const sorted = [...allLogs].reverse();
    const recentChanges: ActivityChangeItem[] = sorted.slice(0, 10).map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      relativeTime: formatRelativeTime(log.timestamp),
      action: log.action,
      actorRole: log.actorRole,
      details: log.details,
      hashShort: `${log.hash.slice(0, 8)}...${log.hash.slice(-6)}`,
    }));

    const lastAction = recentChanges[0];
    const lastActionSummary = lastAction
      ? `${lastAction.action}: ${lastAction.details} (${lastAction.relativeTime})`
      : 'No actions recorded yet on this machine session.';

    return {
      totalEvents,
      ingestCount,
      queryCount,
      purgeCount,
      syncCount,
      recentChanges,
      lastActionSummary,
    };
  } catch (err) {
    return {
      totalEvents: 0,
      ingestCount: 0,
      queryCount: 0,
      purgeCount: 0,
      syncCount: 0,
      recentChanges: [],
      lastActionSummary: 'Audit log is initializing.',
    };
  }
}

/**
 * Get comprehensive date, day of year, week number, and calendar metrics
 */
export function getDateCalendarInfo(): DateCalendarDetails {
  const now = new Date();
  const year = now.getFullYear();

  // Day of Year calculation
  const startOfYear = new Date(year, 0, 1);
  const diffMs = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

  // Leap Year check
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const totalDaysInYear = isLeapYear ? 366 : 365;
  const daysRemainingInYear = totalDaysInYear - dayOfYear;
  const percentOfYear = Math.round((dayOfYear / totalDaysInYear) * 1000) / 10;

  // ISO Week Number calculation
  const tempDate = new Date(now.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  const weekNumber =
    1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);

  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(now);

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    weekday,
    formattedDate,
    dayOfYear,
    totalDaysInYear,
    percentOfYear,
    weekNumber,
    daysRemainingInYear,
    isLeapYear,
    isoString: now.toISOString(),
    unixSeconds: Math.floor(now.getTime() / 1000),
    timeZone,
  };
}
