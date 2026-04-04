import { describe, it, expect } from 'vitest';
import { parseLogContent } from '../../src/parsers/log-parser';

describe('parseLogContent', () => {
  it('should parse JSON log lines', () => {
    const content = [
      '{"timestamp":"2025-01-15T10:00:00Z","level":"info","message":"Server started"}',
      '{"timestamp":"2025-01-15T10:00:01Z","level":"error","message":"Connection refused"}',
    ].join('\n');

    const result = parseLogContent(content);
    expect(result.entries).toHaveLength(2);
    expect(result.format).toBe('json');
    expect(result.entries[0].level).toBe('info');
    expect(result.entries[1].level).toBe('error');
  });

  it('should parse text log lines', () => {
    const content = [
      '2025-01-15T10:00:00Z INFO Server started on port 3000',
      '2025-01-15T10:00:05Z ERROR Database connection failed',
      '2025-01-15T10:00:06Z WARN Retrying in 5 seconds',
    ].join('\n');

    const result = parseLogContent(content);
    expect(result.entries).toHaveLength(3);
    expect(result.format).toBe('text');
    expect(result.entries[0].level).toBe('info');
    expect(result.entries[1].level).toBe('error');
    expect(result.entries[2].level).toBe('warn');
  });

  it('should parse bracketed text format', () => {
    const content = '[2025-01-15 10:00:00] [ERROR] Something went wrong';
    const result = parseLogContent(content);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].level).toBe('error');
  });

  it('should handle empty content', () => {
    const result = parseLogContent('');
    expect(result.entries).toHaveLength(0);
    expect(result.totalLines).toBe(0);
  });

  it('should skip unparseable lines', () => {
    const content = 'random text\n{"level":"info","message":"valid"}\nmore random';
    const result = parseLogContent(content);
    expect(result.parsedLines).toBe(1);
    expect(result.totalLines).toBe(3);
  });

  it('should extract source from JSON logs', () => {
    const content = '{"level":"info","message":"test","source":"auth-service"}';
    const result = parseLogContent(content);
    expect(result.entries[0].source).toBe('auth-service');
  });

  it('should normalize level aliases', () => {
    const content = [
      '{"level":"fatal","message":"crash"}',
      '{"level":"warning","message":"slow"}',
      '{"level":"dbg","message":"trace"}',
    ].join('\n');

    const result = parseLogContent(content);
    expect(result.entries[0].level).toBe('error');
    expect(result.entries[1].level).toBe('warn');
    expect(result.entries[2].level).toBe('debug');
  });

  it('should include line numbers', () => {
    const content = '{"level":"info","message":"a"}\n{"level":"info","message":"b"}';
    const result = parseLogContent(content);
    expect(result.entries[0].lineNumber).toBe(1);
    expect(result.entries[1].lineNumber).toBe(2);
  });
});
