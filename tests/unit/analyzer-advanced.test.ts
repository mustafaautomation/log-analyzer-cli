import { describe, it, expect } from 'vitest';
import { analyzeEntries, AnalysisReport } from '../../src/analyzers/analyzer';
import { LogEntry } from '../../src/parsers/types';

function makeEntry(
  level: LogEntry['level'],
  message: string,
  timestamp = '2026-04-06T10:00:00Z',
  source?: string,
): LogEntry {
  return { timestamp, level, message, raw: message, lineNumber: 1, source };
}

describe('analyzeEntries — error grouping', () => {
  it('should group similar errors with different UUIDs', () => {
    const entries = [
      makeEntry('error', 'User a1b2c3d4-e5f6-7890-abcd-ef1234567890 not found'),
      makeEntry('error', 'User f1e2d3c4-b5a6-7890-1234-567890abcdef not found'),
      makeEntry('error', 'User 11111111-2222-3333-4444-555555555555 not found'),
    ];

    const report = analyzeEntries(entries);
    expect(report.errorGroups).toHaveLength(1);
    expect(report.errorGroups[0].count).toBe(3);
    expect(report.errorGroups[0].pattern).toContain('<UUID>');
  });

  it('should group errors with different IPs', () => {
    const entries = [
      makeEntry('error', 'Connection refused from 192.168.1.100'),
      makeEntry('error', 'Connection refused from 10.0.0.50'),
    ];

    const report = analyzeEntries(entries);
    expect(report.errorGroups).toHaveLength(1);
    expect(report.errorGroups[0].pattern).toContain('<IP>');
  });

  it('should group errors with different timestamps', () => {
    const entries = [
      makeEntry('error', 'Timeout at 2026-04-06T10:00:00Z'),
      makeEntry('error', 'Timeout at 2026-04-06T11:30:00Z'),
    ];

    const report = analyzeEntries(entries);
    expect(report.errorGroups).toHaveLength(1);
    expect(report.errorGroups[0].pattern).toContain('<TIMESTAMP>');
  });

  it('should group errors with different ports', () => {
    const entries = [
      makeEntry('error', 'Failed to connect to :5432'),
      makeEntry('error', 'Failed to connect to :3306'),
    ];

    const report = analyzeEntries(entries);
    expect(report.errorGroups).toHaveLength(1);
    expect(report.errorGroups[0].pattern).toContain('<PORT>');
  });

  it('should keep max 3 samples per group', () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      makeEntry('error', `Error on request ${1000000000 + i}`),
    );

    const report = analyzeEntries(entries);
    expect(report.errorGroups[0].count).toBe(10);
    expect(report.errorGroups[0].samples).toHaveLength(3);
  });

  it('should sort error groups by count descending', () => {
    const entries = [
      ...Array.from({ length: 5 }, () => makeEntry('error', 'Timeout')),
      ...Array.from({ length: 2 }, () => makeEntry('error', 'Auth failed')),
      ...Array.from({ length: 8 }, () => makeEntry('error', 'DB error')),
    ];

    const report = analyzeEntries(entries);
    expect(report.errorGroups[0].pattern).toContain('DB');
    expect(report.errorGroups[0].count).toBe(8);
    expect(report.errorGroups[1].count).toBe(5);
  });
});

describe('analyzeEntries — level counting', () => {
  it('should count all log levels', () => {
    const entries = [
      makeEntry('error', 'err'),
      makeEntry('error', 'err2'),
      makeEntry('warn', 'w'),
      makeEntry('info', 'i'),
      makeEntry('info', 'i2'),
      makeEntry('info', 'i3'),
      makeEntry('debug', 'd'),
      makeEntry('trace', 't'),
    ];

    const report = analyzeEntries(entries);
    expect(report.byLevel.error).toBe(2);
    expect(report.byLevel.warn).toBe(1);
    expect(report.byLevel.info).toBe(3);
    expect(report.byLevel.debug).toBe(1);
    expect(report.byLevel.trace).toBe(1);
    expect(report.totalEntries).toBe(8);
  });

  it('should calculate error rate', () => {
    const entries = [
      makeEntry('error', 'e1'),
      makeEntry('error', 'e2'),
      makeEntry('info', 'i1'),
      makeEntry('info', 'i2'),
      makeEntry('info', 'i3'),
    ];

    const report = analyzeEntries(entries);
    expect(report.errorRate).toBeCloseTo(0.4, 1); // 2/5
  });

  it('should handle 0 entries', () => {
    const report = analyzeEntries([]);
    expect(report.totalEntries).toBe(0);
    expect(report.errorRate).toBe(0);
    expect(report.errorGroups).toHaveLength(0);
    expect(report.timeRange).toBeNull();
  });
});

describe('analyzeEntries — source tracking', () => {
  it('should track top sources', () => {
    const entries = [
      makeEntry('info', 'm1', '2026-04-06T10:00:00Z', 'api-gateway'),
      makeEntry('info', 'm2', '2026-04-06T10:00:01Z', 'api-gateway'),
      makeEntry('info', 'm3', '2026-04-06T10:00:02Z', 'api-gateway'),
      makeEntry('error', 'm4', '2026-04-06T10:00:03Z', 'auth-service'),
      makeEntry('info', 'm5', '2026-04-06T10:00:04Z', 'auth-service'),
      makeEntry('warn', 'm6', '2026-04-06T10:00:05Z', 'db-pool'),
    ];

    const report = analyzeEntries(entries);
    expect(report.topSources[0].source).toBe('api-gateway');
    expect(report.topSources[0].count).toBe(3);
    expect(report.topSources[1].source).toBe('auth-service');
    expect(report.topSources[1].count).toBe(2);
  });

  it('should limit to top 10 sources', () => {
    const entries = Array.from({ length: 15 }, (_, i) =>
      makeEntry('info', `m${i}`, '2026-04-06T10:00:00Z', `source-${i}`),
    );

    const report = analyzeEntries(entries);
    expect(report.topSources.length).toBeLessThanOrEqual(10);
  });
});

describe('analyzeEntries — time analysis', () => {
  it('should detect time range', () => {
    const entries = [
      makeEntry('info', 'start', '2026-04-06T10:00:00Z'),
      makeEntry('info', 'middle', '2026-04-06T10:30:00Z'),
      makeEntry('info', 'end', '2026-04-06T11:00:00Z'),
    ];

    const report = analyzeEntries(entries);
    expect(report.timeRange).not.toBeNull();
    expect(report.timeRange!.start).toBe('2026-04-06T10:00:00Z');
    expect(report.timeRange!.end).toBe('2026-04-06T11:00:00Z');
  });

  it('should calculate entries per minute', () => {
    // 60 entries over 1 hour = 1 per minute
    const entries = Array.from({ length: 60 }, (_, i) =>
      makeEntry('info', `m${i}`, `2026-04-06T10:${String(i).padStart(2, '0')}:00Z`),
    );

    const report = analyzeEntries(entries);
    expect(report.entriesPerMinute).toBeGreaterThan(0);
    expect(report.entriesPerMinute).toBeLessThanOrEqual(2); // ~1/min
  });

  it('should return null timeRange for single entry', () => {
    const entries = [makeEntry('info', 'only one')];
    const report = analyzeEntries(entries);
    expect(report.timeRange).toBeNull();
  });
});
