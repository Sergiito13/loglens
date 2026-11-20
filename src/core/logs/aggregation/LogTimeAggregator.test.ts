import { describe, expect, it } from 'vitest';
import type { LogEntry } from '../parsers/types';
import { LogTimeAggregator } from './LogTimeAggregator';

function entry(timestamp: string, level: string): LogEntry {
  return {
    lineNumber: 1,
    format: 'nginx-error',
    timestamp,
    level,
    message: 'Test event',
    raw: 'Test event',
    metadata: {},
  };
}

function sum(series: ReturnType<LogTimeAggregator['result']>['all']): number {
  return series.buckets.reduce(
    (total, bucket) =>
      total +
      bucket.counts.error +
      bucket.counts.warn +
      bucket.counts.critical +
      bucket.counts.other,
    0,
  );
}

describe('LogTimeAggregator', () => {
  it('counts the entire file, not just records retained in the explorer', () => {
    const accumulator = new LogTimeAggregator();
    for (let index = 0; index < 15_000; index++) {
      const time = new Date(Date.UTC(2026, 10, 4, 9, 0, 0) + index * 1000)
        .toISOString()
        .slice(0, 19);
      accumulator.add(entry(time, index % 2 ? 'warn' : 'error'));
    }
    const data = accumulator.result();
    expect(data.totalDated).toBe(15_000);
    expect(sum(data.all)).toBe(15_000);
    expect(data.all.buckets.length).toBeLessThanOrEqual(2048);
  });

  it('keeps critical and other nginx levels grouped correctly', () => {
    const accumulator = new LogTimeAggregator();
    accumulator.add(entry('2026-11-04T10:00:00', 'crit'));
    accumulator.add(entry('2026-11-04T10:00:00', 'alert'));
    accumulator.add(entry('2026-11-04T10:00:00', 'info'));
    const first = accumulator.result().all.buckets[0];
    expect(first.counts.critical).toBe(2);
    expect(first.counts.other).toBe(1);
  });
});
