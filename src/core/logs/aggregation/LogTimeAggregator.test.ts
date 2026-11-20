import { describe, expect, it } from 'vitest';

import type { LogEntry } from '../parsers/types';

import { LogTimeAggregator } from './LogTimeAggregator';

/* ==========================================================
   TEST HELPERS
========================================================== */

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

/* ==========================================================
   TESTS
========================================================== */

describe('LogTimeAggregator', () => {
  it('counts the entire file', () => {
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

  it('groups critical and other nginx levels correctly', () => {
    const accumulator = new LogTimeAggregator();

    accumulator.add(entry('2026-11-04T10:00:00', 'crit'));

    accumulator.add(entry('2026-11-04T10:00:00', 'alert'));

    accumulator.add(entry('2026-11-04T10:00:00', 'info'));

    const first = accumulator.result().all.buckets[0];

    expect(first.counts.critical).toBe(2);
    expect(first.counts.other).toBe(1);
  });
});

/* ==========================================================
   EXACT TEMPORAL BOUNDARIES
========================================================== */

describe('exact temporal range boundaries', () => {
  const base = Date.UTC(2026, 10, 9, 12, 34, 30);

  const iso = (time: number) => new Date(time).toISOString().slice(0, 19);

  const sumCounts = (rows: ReturnType<LogTimeAggregator['result']>['all']) =>
    rows.buckets.reduce(
      (total, bucket) =>
        total +
        bucket.counts.error +
        bucket.counts.warn +
        bucket.counts.critical +
        bucket.counts.other,
      0,
    );

  it('excludes one second before a boundary', () => {
    const accumulator = new LogTimeAggregator();

    const hour = 3_600_000;

    /*
     * Insert events out of chronological order.
     */

    accumulator.add(entry(iso(base), 'error'));

    accumulator.add(entry(iso(base - hour - 1000), 'warn'));

    accumulator.add(entry(iso(base - hour), 'crit'));

    const result = accumulator.result();

    expect(sumCounts(result.lastHour)).toBe(2);

    expect(sumCounts(result.lastSixHours)).toBe(3);

    expect(sumCounts(result.all)).toBe(3);
  });

  it('counts exact cutoffs for all recent ranges', () => {
    const accumulator = new LogTimeAggregator();

    const hour = 3_600_000;
    const day = 24 * hour;

    const timestamps = [
      base,

      base - hour,

      base - 6 * hour - 1000,
      base - 6 * hour,

      base - day - 1000,
      base - day,

      base - 7 * day - 1000,
      base - 7 * day,
    ];

    for (const timestamp of timestamps) {
      accumulator.add(entry(iso(timestamp), 'error'));
    }

    const data = accumulator.result();

    expect(sumCounts(data.lastHour)).toBe(2);

    expect(sumCounts(data.lastSixHours)).toBe(3);

    expect(sumCounts(data.lastDay)).toBe(5);

    expect(sumCounts(data.lastWeek)).toBe(7);

    expect(sumCounts(data.all)).toBe(8);
  });

  it('preserves all events despite bounded chart buckets', () => {
    const accumulator = new LogTimeAggregator();

    for (let index = 0; index < 15_000; index++) {
      accumulator.add(
        entry(iso(base - 15_000_000 + index * 1000), index % 3 === 0 ? 'warn' : 'error'),
      );
    }

    const data = accumulator.result();

    expect(data.totalDated).toBe(15_000);

    expect(sumCounts(data.all)).toBe(15_000);

    expect(sumCounts(data.lastSixHours)).toBe(15_000);

    expect(data.all.buckets.length).toBeLessThanOrEqual(2048);
  });
});
