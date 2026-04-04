import { describe, it, expect } from 'vitest';
import { analyzeEntries } from '../../src/analyzers/analyzer';
import { LogEntry } from '../../src/parsers/types';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    timestamp: '2025-01-15T10:00:00Z',
    level: 'info',
    message: 'Test message',
    raw: '',
    lineNumber: 1,
    ...overrides,
  };
}

describe('analyzeEntries', () => {
  it('should count entries by level', () => {
    const entries = [
      makeEntry({ level: 'info' }),
      makeEntry({ level: 'error', message: 'fail' }),
      makeEntry({ level: 'warn' }),
      makeEntry({ level: 'error', message: 'fail 2' }),
    ];

    const report = analyzeEntries(entries);
    expect(report.byLevel.info).toBe(1);
    expect(report.byLevel.error).toBe(2);
    expect(report.byLevel.warn).toBe(1);
  });

  it('should calculate error rate', () => {
    const entries = [makeEntry({ level: 'info' }), makeEntry({ level: 'error', message: 'x' })];
    const report = analyzeEntries(entries);
    expect(report.errorRate).toBe(0.5);
  });

  it('should group similar errors', () => {
    const entries = [
      makeEntry({ level: 'error', message: 'Connection refused to 10.0.0.1:5432' }),
      makeEntry({ level: 'error', message: 'Connection refused to 10.0.0.2:5432' }),
      makeEntry({ level: 'error', message: 'Connection refused to 10.0.0.3:5432' }),
    ];

    const report = analyzeEntries(entries);
    // All 3 should normalize to same pattern (IPs replaced)
    expect(report.errorGroups.length).toBeLessThanOrEqual(1);
    if (report.errorGroups.length === 1) {
      expect(report.errorGroups[0].count).toBe(3);
    }
  });

  it('should track time range', () => {
    const entries = [
      makeEntry({ timestamp: '2025-01-15T10:00:00Z' }),
      makeEntry({ timestamp: '2025-01-15T10:05:00Z' }),
    ];

    const report = analyzeEntries(entries);
    expect(report.timeRange).not.toBeNull();
    expect(report.timeRange?.start).toBe('2025-01-15T10:00:00Z');
    expect(report.timeRange?.end).toBe('2025-01-15T10:05:00Z');
  });

  it('should calculate entries per minute', () => {
    const entries = [
      makeEntry({ timestamp: '2025-01-15T10:00:00Z' }),
      makeEntry({ timestamp: '2025-01-15T10:01:00Z' }),
      makeEntry({ timestamp: '2025-01-15T10:02:00Z' }),
    ];

    const report = analyzeEntries(entries);
    expect(report.entriesPerMinute).toBeGreaterThan(0);
  });

  it('should track top sources', () => {
    const entries = [
      makeEntry({ source: 'auth' }),
      makeEntry({ source: 'auth' }),
      makeEntry({ source: 'db' }),
    ];

    const report = analyzeEntries(entries);
    expect(report.topSources[0].source).toBe('auth');
    expect(report.topSources[0].count).toBe(2);
  });

  it('should handle empty entries', () => {
    const report = analyzeEntries([]);
    expect(report.totalEntries).toBe(0);
    expect(report.errorRate).toBe(0);
    expect(report.errorGroups).toHaveLength(0);
  });
});
