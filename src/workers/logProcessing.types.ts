import type {
  LogProcessingProgress,
  LogProcessingResult,
  ProcessLogFileOptions,
} from '../core/logs/processing/types';

/* ==========================================================
   LOGLENS — WEB WORKER COMMUNICATION TYPES
========================================================== */

/**
 * Options that can be transferred to the Worker.
 *
 * Functions and AbortSignal are intentionally excluded
 * because they are handled by the main thread.
 */
export type WorkerProcessingOptions = Pick<
  ProcessLogFileOptions,
  'chunkSizeBytes' | 'maxStoredEntries' | 'maxStoredIssues'
>;

/* ==========================================================
   MAIN THREAD → WORKER
========================================================== */

/**
 * Start a new log processing operation.
 */
export interface WorkerStartMessage {
  type: 'start';

  file: Blob;

  options: WorkerProcessingOptions;
}

/**
 * Messages accepted by the Worker.
 */
export type WorkerRequest = WorkerStartMessage;

/* ==========================================================
   WORKER → MAIN THREAD
========================================================== */

/**
 * Report processing progress.
 */
export interface WorkerProgressMessage {
  type: 'progress';

  progress: LogProcessingProgress;
}

/**
 * Return the final processing result.
 */
export interface WorkerCompletedMessage {
  type: 'completed';

  result: LogProcessingResult;
}

/**
 * Report an error during processing.
 */
export interface WorkerErrorMessage {
  type: 'error';

  error: {
    name: string;
    message: string;
  };
}

/**
 * Messages returned by the Worker.
 */
export type WorkerResponse = WorkerProgressMessage | WorkerCompletedMessage | WorkerErrorMessage;
