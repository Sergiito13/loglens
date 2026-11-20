import type { LogEntry } from '../parsers/types';

import type { LogTimeCounts, LogTimeData, LogTimeSeries } from '../processing/types';

/* ==========================================================
   LOGLENS — TEMPORAL AGGREGATOR
========================================================== */

type Group = keyof LogTimeCounts;

/* ==========================================================
   CONSTANTS
========================================================== */

const SECOND_MS = 1000;

const HOUR_SECONDS = 3600;
const DAY_SECONDS = 24 * HOUR_SECONDS;
const WEEK_SECONDS = 7 * DAY_SECONDS;

const WINDOW_SIZE = WEEK_SECONDS + 1;

const MAX_ALL_BUCKETS = 2048;
const TARGET_CHART_BUCKETS = 64;

const NICE_STEPS_SECONDS = [
  1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14400, 21600, 43200, 86400,
];

/* ==========================================================
   EMPTY COUNTS
========================================================== */

function empty(): LogTimeCounts {
  return {
    error: 0,
    warn: 0,
    critical: 0,
    other: 0,
  };
}

/* ==========================================================
   SEVERITY CLASSIFICATION
========================================================== */

function category(level: string): Group {
  if (level === 'error') {
    return 'error';
  }

  if (level === 'warn') {
    return 'warn';
  }

  if (level === 'crit' || level === 'alert' || level === 'emerg') {
    return 'critical';
  }

  return 'other';
}

/* ==========================================================
   TIMESTAMP PARSING
========================================================== */

function parseTime(value: string | null): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));

  const hour = Number(value.slice(11, 13));
  const minute = Number(value.slice(14, 16));
  const second = Number(value.slice(17, 19));

  /*
   * Nginx timestamps have no timezone.
   *
   * Date.UTC is used only to build a stable numeric
   * timeline without applying browser timezone shifts.
   */

  const time = Date.UTC(year, month - 1, day, hour, minute, second);

  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 19) !== value) {
    return null;
  }

  return time;
}

/* ==========================================================
   ADD TO AGGREGATED MAP
========================================================== */

function add(map: Map<number, LogTimeCounts>, time: number, stepMs: number, level: Group): void {
  const key = Math.floor(time / stepMs) * stepMs;

  let row = map.get(key);

  if (!row) {
    row = empty();
    map.set(key, row);
  }

  row[level]++;
}

/* ==========================================================
   CONVERT MAP TO SERIES
========================================================== */

function series(map: Map<number, LogTimeCounts>, stepMs: number): LogTimeSeries {
  return {
    stepMs,

    buckets: [...map]
      .sort(([a], [b]) => a - b)
      .map(([time, counts]) => ({
        time,
        counts: { ...counts },
      })),
  };
}

/* ==========================================================
   TEMPORAL AGGREGATOR CLASS
========================================================== */

/**
 * All dated events contribute to full-file statistics.
 *
 * Recent events are stored in a fixed-size, second-resolution
 * circular buffer covering the latest seven days.
 *
 * This allows accurate range boundaries without retaining
 * individual log messages.
 */
export class LogTimeAggregator {
  /* ========================================================
     FULL FILE
  ======================================================== */

  private fullStep = SECOND_MS;

  private readonly full = new Map<number, LogTimeCounts>();

  /* ========================================================
     SEVEN-DAY CIRCULAR BUFFER
  ======================================================== */

  private readonly stamps = new Float64Array(WINDOW_SIZE).fill(Number.NaN);

  private readonly errors = new Uint32Array(WINDOW_SIZE);

  private readonly warns = new Uint32Array(WINDOW_SIZE);

  private readonly criticals = new Uint32Array(WINDOW_SIZE);

  private readonly others = new Uint32Array(WINDOW_SIZE);

  /* ========================================================
     TEMPORAL BOUNDARIES
  ======================================================== */

  private firstSecond = Infinity;
  private lastSecond = -Infinity;

  private dated = 0;

  /* ========================================================
     ADD LOG ENTRY
  ======================================================== */

  add(entry: LogEntry): void {
    const timestamp = parseTime(entry.timestamp);

    if (timestamp === null) {
      return;
    }

    const second = Math.floor(timestamp / SECOND_MS);

    const level = category(entry.level);

    this.dated++;

    this.firstSecond = Math.min(this.firstSecond, second);

    this.lastSecond = Math.max(this.lastSecond, second);

    /* ======================================================
       FULL FILE AGGREGATION
    ====================================================== */

    add(this.full, timestamp, this.fullStep, level);

    /*
     * Merge adjacent buckets when exceeding the
     * maximum number of historical intervals.
     */

    while (this.full.size > MAX_ALL_BUCKETS) {
      this.fullStep *= 2;

      const merged = new Map<number, LogTimeCounts>();

      for (const [time, counts] of this.full) {
        const key = Math.floor(time / this.fullStep) * this.fullStep;

        let target = merged.get(key);

        if (!target) {
          target = empty();
          merged.set(key, target);
        }

        target.error += counts.error;
        target.warn += counts.warn;
        target.critical += counts.critical;
        target.other += counts.other;
      }

      this.full.clear();

      for (const [time, counts] of merged) {
        this.full.set(time, counts);
      }
    }

    /* ======================================================
       RECENT EVENTS
    ====================================================== */

    /*
     * Ignore events outside the latest seven-day
     * window for the high-resolution buffer.
     *
     * They have already been counted in the
     * complete historical aggregation.
     */

    if (second < this.lastSecond - WEEK_SECONDS) {
      return;
    }

    /* ======================================================
       CIRCULAR BUFFER POSITION
    ====================================================== */

    const slot = ((second % WINDOW_SIZE) + WINDOW_SIZE) % WINDOW_SIZE;

    if (this.stamps[slot] !== second) {
      this.stamps[slot] = second;

      this.errors[slot] = 0;
      this.warns[slot] = 0;
      this.criticals[slot] = 0;
      this.others[slot] = 0;
    }

    /* ======================================================
       INCREMENT SEVERITY
    ====================================================== */

    if (level === 'error') {
      this.errors[slot]++;
    } else if (level === 'warn') {
      this.warns[slot]++;
    } else if (level === 'critical') {
      this.criticals[slot]++;
    } else {
      this.others[slot]++;
    }
  }

  /* ========================================================
     BUILD RECENT TEMPORAL SERIES
  ======================================================== */

  private recent(durationSeconds: number): LogTimeSeries {
    if (this.dated === 0) {
      return {
        stepMs: SECOND_MS,
        buckets: [],
      };
    }

    /* ======================================================
       EXACT PERIOD
    ====================================================== */

    const start = Math.max(this.firstSecond, this.lastSecond - durationSeconds);

    const seconds = this.lastSecond - start + 1;

    /* ======================================================
       ADAPTIVE GRANULARITY
    ====================================================== */

    const required = Math.ceil(seconds / TARGET_CHART_BUCKETS);

    const step = NICE_STEPS_SECONDS.find((value) => value >= required) ?? required;

    const count = Math.ceil(seconds / step);

    /* ======================================================
       CREATE BUCKETS
    ====================================================== */

    const buckets = Array.from({ length: count }, (_, index) => ({
      time: (start + index * step) * SECOND_MS,

      counts: empty(),
    }));

    /* ======================================================
       AGGREGATE EVERY SECOND
    ====================================================== */

    for (let second = start; second <= this.lastSecond; second++) {
      const slot = ((second % WINDOW_SIZE) + WINDOW_SIZE) % WINDOW_SIZE;

      if (this.stamps[slot] !== second) {
        continue;
      }

      const index = Math.floor((second - start) / step);

      const target = buckets[index].counts;

      target.error += this.errors[slot];
      target.warn += this.warns[slot];

      target.critical += this.criticals[slot];

      target.other += this.others[slot];
    }

    return {
      stepMs: step * SECOND_MS,
      buckets,
    };
  }

  /* ========================================================
     FINAL RESULT
  ======================================================== */

  result(): LogTimeData {
    return {
      firstTime: this.dated ? this.firstSecond * SECOND_MS : null,

      lastTime: this.dated ? this.lastSecond * SECOND_MS : null,

      totalDated: this.dated,

      all: series(this.full, this.fullStep),

      lastHour: this.recent(HOUR_SECONDS),

      lastSixHours: this.recent(6 * HOUR_SECONDS),

      lastDay: this.recent(DAY_SECONDS),

      lastWeek: this.recent(WEEK_SECONDS),
    };
  }
}
