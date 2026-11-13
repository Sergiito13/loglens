import type { LogDetectionResult } from '../detection/types';

import type { LogEntry, LogParseIssue } from '../parsers/types';

/* ==========================================================
   LOGLENS — PROCESSING TYPES
========================================================== */

/**
 * Current processing stage.
 */
export type ProcessingStage = 'detecting' | 'parsing' | 'completed';

/**
 * Progress information emitted during processing.
 */
export interface LogProcessingProgress {
  stage: ProcessingStage;

  bytesRead: number;

  totalBytes: number;

  percent: number;

  processedLines: number;

  parsedLines: number;

  invalidLines: number;
}

/**
 * Processing configuration.
 */
export interface ProcessLogFileOptions {
  /**
   * Allows cancelling the operation.
   */
  signal?: AbortSignal;

  /**
   * Reports real processing progress.
   */
  onProgress?: (progress: LogProcessingProgress) => void;

  /**
   * Number of bytes read per chunk.
   */
  chunkSizeBytes?: number;

  /**
   * Maximum number of parsed entries retained in memory.
   */
  maxStoredEntries?: number;

  /**
   * Maximum number of parsing issues retained in memory.
   */
  maxStoredIssues?: number;
}

/**
 * Final processing result.
 */
export interface LogProcessingResult {
  detection: LogDetectionResult;

  format: string;

  /**
   * Retained parsed entries.
   */
  entries: LogEntry[];

  /**
   * Retained invalid entries.
   */
  issues: LogParseIssue[];

  /**
   * Actual counts across the processed file.
   */
  totalNonEmptyLines: number;

  parsedLines: number;

  invalidLines: number;

  /**
   * Number of entries grouped by severity.
   */
  levelCounts: Record<string, number>;

  /**
   * Indicates whether retention limits were reached.
   */
  truncatedEntries: boolean;

  truncatedIssues: boolean;
}
