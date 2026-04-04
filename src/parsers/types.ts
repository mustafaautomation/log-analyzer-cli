export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  source?: string;
  metadata?: Record<string, unknown>;
  raw: string;
  lineNumber: number;
}

export interface ParseResult {
  entries: LogEntry[];
  totalLines: number;
  parsedLines: number;
  format: 'json' | 'text' | 'unknown';
}
