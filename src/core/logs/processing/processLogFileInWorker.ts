import type { LogProcessingResult, ProcessLogFileOptions } from './types';

import type { WorkerRequest, WorkerResponse } from '../../../workers/logProcessing.types';

/* ==========================================================
   LOGLENS — WEB WORKER CONTROLLER
========================================================== */

/**
 * Create a standardized cancellation error.
 */
function createAbortError(): DOMException {
  return new DOMException('Log processing cancelled', 'AbortError');
}

/* ==========================================================
   MAIN CONTROLLER
========================================================== */

/**
 * Process a log file inside a Web Worker.
 *
 * Features:
 *
 * - Background processing.
 * - Progress reporting.
 * - Cancellation using AbortSignal.
 * - Error handling.
 * - Automatic Worker cleanup.
 *
 * Each invocation creates a dedicated Worker.
 */
export function processLogFileInWorker(
  file: Blob,
  options: ProcessLogFileOptions = {},
): Promise<LogProcessingResult> {
  return new Promise<LogProcessingResult>((resolve, reject) => {
    /* ======================================================
       1. INITIAL CANCELLATION CHECK
    ====================================================== */

    if (options.signal?.aborted) {
      reject(createAbortError());
      return;
    }

    /* ======================================================
       2. CREATE WEB WORKER
    ====================================================== */

    const worker = new Worker(
      new URL('../../../workers/logProcessing.worker.ts', import.meta.url),
      {
        type: 'module',
      },
    );

    let settled = false;

    /* ======================================================
       3. CLEANUP
    ====================================================== */

    /**
     * Release Worker resources and listeners.
     */
    function cleanup(): void {
      options.signal?.removeEventListener('abort', handleAbort);

      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;

      worker.terminate();
    }

    /* ======================================================
       4. SUCCESS
    ====================================================== */

    function finishSuccess(result: LogProcessingResult): void {
      if (settled) {
        return;
      }

      settled = true;

      cleanup();

      resolve(result);
    }

    /* ======================================================
       5. ERROR
    ====================================================== */

    function finishError(error: unknown): void {
      if (settled) {
        return;
      }

      settled = true;

      cleanup();

      reject(error);
    }

    /* ======================================================
       6. CANCELLATION
    ====================================================== */

    function handleAbort(): void {
      finishError(createAbortError());
    }

    /* ======================================================
       7. WORKER MESSAGES
    ====================================================== */

    worker.onmessage = (event: MessageEvent<WorkerResponse>): void => {
      if (settled) {
        return;
      }

      const message = event.data;

      switch (message.type) {
        /* --------------------------------------------------
           PROGRESS
        -------------------------------------------------- */

        case 'progress': {
          try {
            options.onProgress?.(message.progress);
          } catch (error) {
            finishError(error);
          }

          break;
        }

        /* --------------------------------------------------
           COMPLETED
        -------------------------------------------------- */

        case 'completed': {
          finishSuccess(message.result);
          break;
        }

        /* --------------------------------------------------
           PROCESSING ERROR
        -------------------------------------------------- */

        case 'error': {
          const error = new Error(message.error.message);

          error.name = message.error.name;

          finishError(error);
          break;
        }
      }
    };

    /* ======================================================
       8. WORKER EXECUTION ERROR
    ====================================================== */

    worker.onerror = (event: ErrorEvent): void => {
      finishError(new Error(event.message || 'Error al ejecutar el Web Worker.'));
    };

    /* ======================================================
       9. MESSAGE DESERIALIZATION ERROR
    ====================================================== */

    worker.onmessageerror = (): void => {
      finishError(new Error('No se pudo interpretar un mensaje del Web Worker.'));
    };

    /* ======================================================
       10. REGISTER CANCELLATION
    ====================================================== */

    options.signal?.addEventListener('abort', handleAbort, {
      once: true,
    });

    /*
     * Detect cancellation during Worker initialization.
     */
    if (options.signal?.aborted) {
      handleAbort();
      return;
    }

    /* ======================================================
       11. CREATE PROCESSING REQUEST
    ====================================================== */

    const request: WorkerRequest = {
      type: 'start',

      file,

      options: {
        chunkSizeBytes: options.chunkSizeBytes,

        maxStoredEntries: options.maxStoredEntries,

        maxStoredIssues: options.maxStoredIssues,
      },
    };

    /* ======================================================
       12. START WORKER
    ====================================================== */

    try {
      worker.postMessage(request);
    } catch (error) {
      finishError(error);
    }
  });
}
