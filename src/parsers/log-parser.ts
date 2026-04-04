import { LogEntry, LogLevel, ParseResult } from './types';

const LEVEL_MAP: Record<string, LogLevel> = {
  error: 'error',
  err: 'error',
  fatal: 'error',
  critical: 'error',
  warn: 'warn',
  warning: 'warn',
  info: 'info',
  log: 'info',
  debug: 'debug',
  dbg: 'debug',
  trace: 'trace',
  verbose: 'trace',
};

const TEXT_LOG_REGEX =
  /^\[?(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.\d]*Z?)\]?\s*\[?(ERROR|WARN|INFO|DEBUG|TRACE|FATAL|WARNING|ERR)\]?\s*(.+)$/i;

export function parseLogContent(content: string): ParseResult {
  const lines = content.split('\n').filter((l) => l.trim());
  const entries: LogEntry[] = [];
  let format: ParseResult['format'] = 'unknown';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Try JSON first
    if (line.trim().startsWith('{')) {
      const entry = parseJsonLine(line, i + 1);
      if (entry) {
        entries.push(entry);
        if (format === 'unknown') format = 'json';
        continue;
      }
    }

    // Try text format
    const entry = parseTextLine(line, i + 1);
    if (entry) {
      entries.push(entry);
      if (format === 'unknown') format = 'text';
    }
  }

  return {
    entries,
    totalLines: lines.length,
    parsedLines: entries.length,
    format,
  };
}

function parseJsonLine(line: string, lineNumber: number): LogEntry | null {
  try {
    const obj = JSON.parse(line);
    const level = normalizeLevel(obj.level || obj.severity || 'info');
    return {
      timestamp: obj.timestamp || obj.time || obj.ts || new Date().toISOString(),
      level,
      message: obj.message || obj.msg || obj.error || JSON.stringify(obj),
      source: obj.source || obj.logger || obj.module,
      metadata: obj,
      raw: line,
      lineNumber,
    };
  } catch {
    return null;
  }
}

function parseTextLine(line: string, lineNumber: number): LogEntry | null {
  const match = TEXT_LOG_REGEX.exec(line);
  if (!match) return null;

  return {
    timestamp: match[1],
    level: normalizeLevel(match[2]),
    message: match[3].trim(),
    raw: line,
    lineNumber,
  };
}

function normalizeLevel(raw: string): LogLevel {
  return LEVEL_MAP[raw.toLowerCase()] || 'info';
}
