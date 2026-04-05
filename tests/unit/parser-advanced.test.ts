import { describe, it, expect } from 'vitest';
import { parseLogContent } from '../../src/parsers/log-parser';

describe('parseLogContent — JSON logs', () => {
  it('should parse structured JSON log lines', () => {
    const content = [
      '{"timestamp":"2026-04-06T10:00:00Z","level":"info","message":"Server started","module":"app"}',
      '{"timestamp":"2026-04-06T10:00:01Z","level":"error","message":"DB connection failed","module":"db"}',
      '{"timestamp":"2026-04-06T10:00:02Z","level":"warn","message":"Cache miss rate high","module":"cache"}',
    ].join('\n');

    const result = parseLogContent(content);
    expect(result.format).toBe('json');
    expect(result.entries).toHaveLength(3);
    expect(result.entries[0].level).toBe('info');
    expect(result.entries[0].source).toBe('app');
    expect(result.entries[1].level).toBe('error');
    expect(result.entries[2].level).toBe('warn');
  });

  it('should handle various JSON timestamp fields', () => {
    const lines = [
      '{"time":"2026-01-01T00:00:00Z","level":"info","msg":"using time field"}',
      '{"ts":"2026-01-01T00:00:01Z","severity":"warn","message":"using ts and severity"}',
    ].join('\n');

    const result = parseLogContent(lines);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].message).toBe('using time field');
    expect(result.entries[1].level).toBe('warn');
  });

  it('should handle JSON with error field as message', () => {
    const line = '{"timestamp":"2026-01-01T00:00:00Z","level":"error","error":"ECONNREFUSED"}';
    const result = parseLogContent(line);
    expect(result.entries[0].message).toBe('ECONNREFUSED');
  });

  it('should preserve full metadata', () => {
    const line =
      '{"timestamp":"2026-01-01T00:00:00Z","level":"info","message":"test","requestId":"abc-123","statusCode":200}';
    const result = parseLogContent(line);
    expect(result.entries[0].metadata).toBeDefined();
    expect(result.entries[0].metadata!.requestId).toBe('abc-123');
    expect(result.entries[0].metadata!.statusCode).toBe(200);
  });
});

describe('parseLogContent — text logs', () => {
  it('should parse standard text log format', () => {
    const content = [
      '2026-04-06T10:00:00Z INFO Application started successfully',
      '2026-04-06T10:00:01Z ERROR Failed to connect to database',
      '2026-04-06T10:00:02Z WARN Disk usage above 80%',
    ].join('\n');

    const result = parseLogContent(content);
    expect(result.format).toBe('text');
    expect(result.entries).toHaveLength(3);
    expect(result.entries[0].level).toBe('info');
    expect(result.entries[1].level).toBe('error');
    expect(result.entries[1].message).toContain('database');
  });

  it('should parse bracketed timestamp format', () => {
    const content = '[2026-04-06T10:00:00Z] [ERROR] Something went wrong';
    const result = parseLogContent(content);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].level).toBe('error');
  });

  it('should handle FATAL as error level', () => {
    const content = '2026-04-06T10:00:00Z FATAL Out of memory';
    const result = parseLogContent(content);
    expect(result.entries[0].level).toBe('error');
  });

  it('should handle WARNING as warn level', () => {
    const content = '2026-04-06T10:00:00Z WARNING Connection pool exhausted';
    const result = parseLogContent(content);
    expect(result.entries[0].level).toBe('warn');
  });

  it('should track line numbers', () => {
    const content =
      'line one is not a log\n2026-04-06T10:00:00Z INFO This is a log\nline three is not';
    const result = parseLogContent(content);
    expect(result.entries[0].lineNumber).toBe(2); // second non-empty line
  });
});

describe('parseLogContent — mixed and edge cases', () => {
  it('should handle empty content', () => {
    const result = parseLogContent('');
    expect(result.entries).toHaveLength(0);
    expect(result.totalLines).toBe(0);
    expect(result.format).toBe('unknown');
  });

  it('should skip unparseable lines', () => {
    const content = [
      'random text with no format',
      '2026-04-06T10:00:00Z INFO Valid log line',
      'another random line',
    ].join('\n');

    const result = parseLogContent(content);
    expect(result.parsedLines).toBe(1);
    expect(result.totalLines).toBe(3);
  });

  it('should handle mixed JSON and text logs', () => {
    const content = [
      '{"timestamp":"2026-01-01T00:00:00Z","level":"info","message":"json line"}',
      '2026-04-06T10:00:00Z ERROR text line',
    ].join('\n');

    const result = parseLogContent(content);
    expect(result.entries).toHaveLength(2);
    // First line sets format to json
    expect(result.format).toBe('json');
  });

  it('should handle large log volume', () => {
    const lines = Array.from(
      { length: 1000 },
      (_, i) =>
        `2026-04-06T10:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}Z INFO Request ${i} processed`,
    );
    const result = parseLogContent(lines.join('\n'));
    expect(result.entries).toHaveLength(1000);
    expect(result.parsedLines).toBe(1000);
  });
});
