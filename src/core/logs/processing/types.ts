import type { LogDetectionResult } from '../detection/types';

import type { LogEntry, LogParseIssue } from '../parsers/types';

/* ==========================================================
   PROCESSING TYPES
========================================================== */

export type ProcessingStage = 'detecting' | 'parsing' | 'completed';

export interface LogProcessingProgress {
  stage: ProcessingStage;

  bytesRead: number;

  totalBytes: number;

  percent: number;

  processedLines: number;

  parsedLines: number;

  invalidLines: number;
}

/* ==========================================================
   PROCESSING OPTIONS
========================================================== */

export interface ProcessLogFileOptions {
  signal?: AbortSignal;

  onProgress?: (progress: LogProcessingProgress) => void;

  chunkSizeBytes?: number;

  maxStoredEntries?: number;

  maxStoredIssues?: number;
}

/* ==========================================================
   TEMPORAL AGGREGATION
========================================================== */

export interface LogTimeCounts {
  error: number;

  warn: number;

  critical: number;

  other: number;
}

export interface LogTimeBucket {
  time: number;

  counts: LogTimeCounts;
}

export interface LogTimeSeries {
  stepMs: number;

  buckets: LogTimeBucket[];
}

export interface LogTimeData {
  firstTime: number | null;

  lastTime: number | null;

  totalDated: number;

  all: LogTimeSeries;

  lastHour: LogTimeSeries;

  lastDay: LogTimeSeries;

  lastWeek: LogTimeSeries;
}

/* ==========================================================
   PROCESSING RESULT
========================================================== */

export interface LogProcessingResult {
  detection: LogDetectionResult;

  format: string;

  entries: LogEntry[];

  issues: LogParseIssue[];

  totalNonEmptyLines: number;

  parsedLines: number;

  invalidLines: number;

  levelCounts: Record<string, number>;

  /** Temporal statistics from the complete parsed file. */
  temporal?: LogTimeData;

  truncatedEntries: boolean;

  truncatedIssues: boolean;
}
