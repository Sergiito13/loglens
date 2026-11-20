import { describe, expect, it } from 'vitest';

import type { LogEntry } from '../parsers/types';

import { LogTimeAggregator } from './LogTimeAggregator';

import { buildTimelineView, isRangeAvailable, summarizeTimelineView } from './temporalView';

/* ==========================================================
   HELPERS
========================================================== */

function entry(timestamp: string, level: string): LogEntry {
  return {
    lineNumber: 1,

    format: 'nginx-error',

    timestamp,
    level,

    message: 'test',
    raw: 'test',

    metadata: {},
  };
}

function iso(time: number): string {
  return new Date(time).toISOString().slice(0, 19);
}

/* ==========================================================
   TESTS
========================================================== */

describe('temporal view ranges and zoom', () => {
  const base = Date.UTC(2026, 10, 6, 16, 33, 29);

  const oneHour = 3_600_000;

  /* ========================================================
     RANGE AVAILABILITY
  ======================================================== */

  it('disables 7 d when the file is shorter than seven days', () => {
    const aggregator = new LogTimeAggregator();

    aggregator.add(entry(iso(base - 2 * 24 * oneHour), 'error'));

    aggregator.add(entry(iso(base), 'error'));

    const data = aggregator.result();

    expect(isRangeAvailable(data, '1h')).toBe(true);

    expect(isRangeAvailable(data, '6h')).toBe(true);

    expect(isRangeAvailable(data, '24h')).toBe(true);

    expect(isRangeAvailable(data, '7d')).toBe(false);

    expect(isRangeAvailable(data, 'all')).toBe(true);
  });

  /* ========================================================
     EXACT TOTALS
  ======================================================== */

  it('returns correct totals for each temporal range', () => {
    const aggregator = new LogTimeAggregator();

    aggregator.add(entry(iso(base), 'error'));

    aggregator.add(entry(iso(base - oneHour), 'warn'));

    aggregator.add(entry(iso(base - oneHour - 1000), 'error'));

    aggregator.add(entry(iso(base - 6 * oneHour), 'crit'));

    aggregator.add(entry(iso(base - 2 * 24 * oneHour), 'info'));

    const data = aggregator.result();

    expect(buildTimelineView(data, '1h')?.total).toBe(2);

    expect(buildTimelineView(data, '6h')?.total).toBe(4);

    expect(buildTimelineView(data, '24h')?.total).toBe(4);

    expect(buildTimelineView(data, 'all')?.total).toBe(5);
  });

  /* ========================================================
     DATAZOOM
  ======================================================== */

  it('updates zoom totals and restores full selection', () => {
    const aggregator = new LogTimeAggregator();

    for (let index = 0; index < 200; index++) {
      aggregator.add(entry(iso(base - (200 - index) * 60_000), 'error'));
    }

    const view = buildTimelineView(aggregator.result(), '1h');

    expect(view).not.toBeNull();

    if (!view) {
      return;
    }

    const all = summarizeTimelineView(view, {
      start: 0,
      end: 100,
    });

    const half = summarizeTimelineView(view, {
      start: 50,
      end: 100,
    });

    expect(all.total).toBe(view.total);

    expect(all.first).toBe(view.start);
    expect(all.last).toBe(view.end);

    expect(half.total).toBeGreaterThan(0);

    expect(half.total).toBeLessThan(all.total);
  });
});
