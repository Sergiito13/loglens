import type { LogTimeCounts, LogTimeData, LogTimeSeries } from '../processing/types';

/* ==========================================================
   LOGLENS — TEMPORAL VIEW UTILITIES
========================================================== */

export type TemporalRange = '1h' | '6h' | '24h' | '7d' | 'all';

export interface ZoomWindow {
  start: number;
  end: number;
}

export interface TimelineView {
  times: number[];
  labels: string[];
  bins: LogTimeCounts[];

  stepMs: number;
  total: number;

  start: number;
  end: number;
}

/* ==========================================================
   CONSTANTS
========================================================== */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/* ==========================================================
   TIME RANGES
========================================================== */

export const TEMPORAL_RANGES: ReadonlyArray<{
  id: TemporalRange;
  label: string;
  duration: number | null;
}> = [
  {
    id: '1h',
    label: '1 h',
    duration: HOUR,
  },
  {
    id: '6h',
    label: '6 h',
    duration: 6 * HOUR,
  },
  {
    id: '24h',
    label: '24 h',
    duration: DAY,
  },
  {
    id: '7d',
    label: '7 d',
    duration: 7 * DAY,
  },
  {
    id: 'all',
    label: 'Todo',
    duration: null,
  },
];

/* ==========================================================
   HELPERS
========================================================== */

function empty(): LogTimeCounts {
  return {
    error: 0,
    warn: 0,
    critical: 0,
    other: 0,
  };
}

function totalOf(row: LogTimeCounts): number {
  return row.error + row.warn + row.critical + row.other;
}

/* ==========================================================
   SELECT SOURCE SERIES
========================================================== */

function pickSeries(data: LogTimeData, range: TemporalRange): LogTimeSeries {
  switch (range) {
    case '1h':
      return data.lastHour;

    case '6h':
      return data.lastSixHours;

    case '24h':
      return data.lastDay;

    case '7d':
      return data.lastWeek;

    default:
      return data.all;
  }
}

/* ==========================================================
   RANGE AVAILABILITY
========================================================== */

export function isRangeAvailable(data: LogTimeData | undefined, range: TemporalRange): boolean {
  if (!data || data.firstTime === null || data.lastTime === null) {
    return false;
  }

  if (range === 'all') {
    return true;
  }

  const duration = TEMPORAL_RANGES.find((item) => item.id === range)?.duration;

  return duration !== null && duration !== undefined && data.lastTime - data.firstTime > duration;
}

/* ==========================================================
   AXIS LABELS
========================================================== */

function axisLabel(time: number, showSeconds: boolean): string {
  const iso = new Date(time).toISOString();

  return showSeconds ? iso.slice(5, 19).replace('T', ' ') : iso.slice(5, 16).replace('T', ' ');
}

/**
 * Los buckets siguen alineados internamente para mantener
 * correctas las agrupaciones y los totales.
 *
 * Para la presentación del eje X, sustituimos únicamente
 * las etiquetas de los extremos por las fechas reales
 * del archivo / período seleccionado.
 */
function buildAxisLabels(
  times: readonly number[],
  stepMs: number,
  start: number,
  end: number,
): string[] {
  const showSeconds = stepMs < 60_000;

  return times.map((time, index) => {
    if (index === 0) {
      return axisLabel(start, showSeconds);
    }

    if (index === times.length - 1) {
      return axisLabel(end, showSeconds);
    }

    return axisLabel(time, showSeconds);
  });
}

/* ==========================================================
   BUILD TIMELINE VIEW
========================================================== */

export function buildTimelineView(
  data: LogTimeData | undefined,
  range: TemporalRange,
): TimelineView | null {
  if (!data || data.firstTime === null || data.lastTime === null) {
    return null;
  }

  /* ========================================================
     UNAVAILABLE RANGE
  ======================================================== */

  if (!isRangeAvailable(data, range)) {
    return range === 'all' ? null : buildTimelineView(data, 'all');
  }

  /* ========================================================
     TEMPORAL BOUNDARIES
  ======================================================== */

  const duration = TEMPORAL_RANGES.find((item) => item.id === range)?.duration ?? null;

  const start = duration === null ? data.firstTime : data.lastTime - duration;

  const end = data.lastTime;

  /* ========================================================
     SOURCE DATA
  ======================================================== */

  const source = pickSeries(data, range);

  if (source.buckets.length === 0) {
    return null;
  }

  /* ========================================================
     EXACT RECENT RANGE
  ======================================================== */

  if (range !== 'all') {
    const times = source.buckets.map((bucket) => bucket.time);

    const bins = source.buckets.map((bucket) => ({
      ...bucket.counts,
    }));

    return {
      times,

      labels: buildAxisLabels(times, source.stepMs, start, end),

      bins,

      stepMs: source.stepMs,

      total: bins.reduce((sum, counts) => sum + totalOf(counts), 0),

      start,
      end,
    };
  }

  /* ========================================================
     FULL FILE ADAPTIVE GRANULARITY
  ======================================================== */

  const units = Math.max(1, Math.ceil((end - start + source.stepMs) / source.stepMs / 64));

  const stepMs = units * source.stepMs;

  const firstBucket = Math.floor(start / stepMs) * stepMs;

  const bucketMap = new Map<number, LogTimeCounts>();

  /* ========================================================
     MERGE EXISTING BUCKETS
  ======================================================== */

  for (const bucket of source.buckets) {
    const key = Math.floor(bucket.time / stepMs) * stepMs;

    let target = bucketMap.get(key);

    if (!target) {
      target = empty();

      bucketMap.set(key, target);
    }

    target.error += bucket.counts.error;

    target.warn += bucket.counts.warn;

    target.critical += bucket.counts.critical;

    target.other += bucket.counts.other;
  }

  /* ========================================================
     BUILD RESULT
  ======================================================== */

  const lastBucket = Math.floor(end / stepMs) * stepMs;

  const count = Math.floor((lastBucket - firstBucket) / stepMs) + 1;

  const times = Array.from({ length: count }, (_, index) => firstBucket + index * stepMs);

  const bins = times.map((time) => ({
    ...(bucketMap.get(time) ?? empty()),
  }));

  return {
    times,

    labels: buildAxisLabels(times, stepMs, start, end),

    bins,
    stepMs,

    total: bins.reduce((sum, row) => sum + totalOf(row), 0),

    start,
    end,
  };
}

/* ==========================================================
   SUMMARIZE ZOOM WINDOW
========================================================== */

export function summarizeTimelineView(
  view: TimelineView,
  zoom: ZoomWindow,
): LogTimeCounts & {
  total: number;
  first: number;
  last: number;
} {
  const maxIndex = view.bins.length - 1;

  const from = Math.max(0, Math.min(maxIndex, Math.ceil((zoom.start / 100) * maxIndex - 1e-6)));

  const to = Math.max(from, Math.min(maxIndex, Math.floor((zoom.end / 100) * maxIndex + 1e-6)));

  const counts = empty();

  for (let index = from; index <= to; index++) {
    const row = view.bins[index];

    counts.error += row.error;
    counts.warn += row.warn;

    counts.critical += row.critical;
    counts.other += row.other;
  }

  return {
    ...counts,

    total: totalOf(counts),

    first: from === 0 ? view.start : view.times[from],

    last: to === maxIndex ? view.end : Math.min(view.end, view.times[to] + view.stepMs - 1000),
  };
}
