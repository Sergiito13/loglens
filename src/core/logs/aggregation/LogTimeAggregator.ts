import type { LogEntry } from '../parsers/types';
import type { LogTimeData, LogTimeSeries, LogTimeCounts, LogTimeBucket } from '../processing/types';

type Group = keyof LogTimeCounts;

const MAX_ALL_BUCKETS = 2048;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function empty(): LogTimeCounts {
  return { error: 0, warn: 0, critical: 0, other: 0 };
}

function group(level: string): Group {
  if (level === 'error') return 'error';
  if (level === 'warn') return 'warn';
  if (level === 'crit' || level === 'alert' || level === 'emerg') return 'critical';
  return 'other';
}

function parseTime(value: string | null): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const hour = Number(value.slice(11, 13));
  const minute = Number(value.slice(14, 16));
  const second = Number(value.slice(17, 19));
  const time = Date.UTC(year, month - 1, day, hour, minute, second);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 19) !== value) return null;
  return time;
}

function add(map: Map<number, LogTimeCounts>, time: number, step: number, key: Group): void {
  const bucket = Math.floor(time / step) * step;
  let counts = map.get(bucket);
  if (!counts) {
    counts = empty();
    map.set(bucket, counts);
  }
  counts[key]++;
}

function prune(map: Map<number, LogTimeCounts>, cutoff: number): void {
  for (const time of map.keys()) {
    if (time < cutoff) map.delete(time);
  }
}

function series(map: Map<number, LogTimeCounts>, stepMs: number): LogTimeSeries {
  const buckets: LogTimeBucket[] = [...map]
    .sort(([a], [b]) => a - b)
    .map(([time, counts]) => ({ time, counts: { ...counts } }));
  return { stepMs, buckets };
}

/** Count every timestamped event without retaining its original log message. */
export class LogTimeAggregator {
  private fullStep = 1000;
  private full = new Map<number, LogTimeCounts>();
  private second = new Map<number, LogTimeCounts>();
  private minute = new Map<number, LogTimeCounts>();
  private fiveMinutes = new Map<number, LogTimeCounts>();
  private first = Infinity;
  private last = -Infinity;
  private total = 0;
  private lastPruneSecond = -Infinity;
  private lastPruneMinute = -Infinity;
  private lastPruneFive = -Infinity;

  add(entry: LogEntry): void {
    const time = parseTime(entry.timestamp);
    if (time === null) return;

    const category = group(entry.level);
    this.total++;
    this.first = Math.min(this.first, time);
    this.last = Math.max(this.last, time);

    add(this.full, time, this.fullStep, category);
    while (this.full.size > MAX_ALL_BUCKETS) {
      this.fullStep *= 2;
      const next = new Map<number, LogTimeCounts>();
      for (const [oldTime, counts] of this.full) {
        const key = Math.floor(oldTime / this.fullStep) * this.fullStep;
        const target = next.get(key) ?? empty();
        target.error += counts.error;
        target.warn += counts.warn;
        target.critical += counts.critical;
        target.other += counts.other;
        next.set(key, target);
      }
      this.full = next;
    }

    if (time >= this.last - HOUR) add(this.second, time, 1000, category);
    if (time >= this.last - DAY) add(this.minute, time, 60_000, category);
    if (time >= this.last - 7 * DAY) add(this.fiveMinutes, time, 300_000, category);

    if (this.last - this.lastPruneSecond >= 60_000) {
      prune(this.second, this.last - HOUR - 1000);
      this.lastPruneSecond = this.last;
    }
    if (this.last - this.lastPruneMinute >= 1_800_000) {
      prune(this.minute, this.last - DAY - 60_000);
      this.lastPruneMinute = this.last;
    }
    if (this.last - this.lastPruneFive >= 3_600_000) {
      prune(this.fiveMinutes, this.last - 7 * DAY - 300_000);
      this.lastPruneFive = this.last;
    }
  }

  result(): LogTimeData {
    return {
      firstTime: this.total ? this.first : null,
      lastTime: this.total ? this.last : null,
      totalDated: this.total,
      all: series(this.full, this.fullStep),
      lastHour: series(this.second, 1000),
      lastDay: series(this.minute, 60_000),
      lastWeek: series(this.fiveMinutes, 300_000),
    };
  }
}
