import { LogEntry, LogLevel } from '../parsers/types';

export interface ErrorGroup {
  pattern: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  samples: string[];
}

export interface AnalysisReport {
  totalEntries: number;
  byLevel: Record<LogLevel, number>;
  errorRate: number;
  errorGroups: ErrorGroup[];
  timeRange: { start: string; end: string } | null;
  topSources: Array<{ source: string; count: number }>;
  entriesPerMinute: number;
}

export function analyzeEntries(entries: LogEntry[]): AnalysisReport {
  const byLevel: Record<LogLevel, number> = {
    error: 0,
    warn: 0,
    info: 0,
    debug: 0,
    trace: 0,
  };

  const errorMessages = new Map<
    string,
    { count: number; firstSeen: string; lastSeen: string; samples: string[] }
  >();
  const sourceCounts = new Map<string, number>();

  for (const entry of entries) {
    byLevel[entry.level]++;

    if (entry.source) {
      sourceCounts.set(entry.source, (sourceCounts.get(entry.source) || 0) + 1);
    }

    if (entry.level === 'error') {
      const pattern = normalizeErrorMessage(entry.message);
      const existing = errorMessages.get(pattern);
      if (existing) {
        existing.count++;
        existing.lastSeen = entry.timestamp;
        if (existing.samples.length < 3) existing.samples.push(entry.message);
      } else {
        errorMessages.set(pattern, {
          count: 1,
          firstSeen: entry.timestamp,
          lastSeen: entry.timestamp,
          samples: [entry.message],
        });
      }
    }
  }

  const errorGroups: ErrorGroup[] = [...errorMessages.entries()]
    .map(([pattern, data]) => ({ pattern, ...data }))
    .sort((a, b) => b.count - a.count);

  const timestamps = entries
    .map((e) => e.timestamp)
    .filter(Boolean)
    .sort();
  const timeRange =
    timestamps.length >= 2
      ? { start: timestamps[0], end: timestamps[timestamps.length - 1] }
      : null;

  let entriesPerMinute = 0;
  if (timeRange) {
    const durationMs = new Date(timeRange.end).getTime() - new Date(timeRange.start).getTime();
    const durationMin = durationMs / 60000;
    entriesPerMinute = durationMin > 0 ? Math.round(entries.length / durationMin) : entries.length;
  }

  const topSources = [...sourceCounts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalEntries: entries.length,
    byLevel,
    errorRate: entries.length > 0 ? byLevel.error / entries.length : 0,
    errorGroups,
    timeRange,
    topSources,
    entriesPerMinute,
  };
}

function normalizeErrorMessage(message: string): string {
  return message
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<UUID>')
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[.\dZ]*/g, '<TIMESTAMP>')
    .replace(/\b\d+\.\d+\.\d+\.\d+\b/g, '<IP>')
    .replace(/:\d{4,5}\b/g, ':<PORT>')
    .replace(/\b\d{10,}\b/g, '<ID>')
    .substring(0, 200);
}
