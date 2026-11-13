import { processLogFile } from '../core/logs/processing/processLogFile';

import type { WorkerRequest, WorkerResponse } from './logProcessing.types';

/* ==========================================================
   LOGLENS — LOG PROCESSING WEB WORKER
========================================================== */

/**
 * Minimum interval between regular progress updates.
 *
 * Prevents excessive messages from being sent to
 * the main thread.
 */
const PROGRESS_INTERVAL_MS = 50;

/**
 * Each Worker instance processes one file.
 */
let started = false;

/* ==========================================================
   MESSAGE SENDER
========================================================== */

/**
 * Send a typed message to the main thread.
 */
function sendMessage(message: WorkerResponse): void {
  self.postMessage(message);
}

/* ==========================================================
   PROCESSING ENGINE
========================================================== */

/**
 * Execute log processing inside the Web Worker.
 */
async function runProcessing(request: WorkerRequest): Promise<void> {
  let lastProgressTime = -Infinity;

  try {
    const result = await processLogFile(request.file, {
      ...request.options,

      onProgress(progress) {
        const now = performance.now();

        /*
         * Always report important processing stages.
         */
        const isImportantStage = progress.stage !== 'parsing';

        /*
         * Always report the final parsed chunk.
         */
        const isFinalChunk = progress.bytesRead === progress.totalBytes;

        /*
         * Throttle regular progress messages.
         */
        const shouldReport =
          isImportantStage || isFinalChunk || now - lastProgressTime >= PROGRESS_INTERVAL_MS;

        if (!shouldReport) {
          return;
        }

        lastProgressTime = now;

        sendMessage({
          type: 'progress',
          progress,
        });
      },
    });

    /* ------------------------------------------------------
       PROCESSING COMPLETED
    ------------------------------------------------------ */

    sendMessage({
      type: 'completed',
      result,
    });
  } catch (error: unknown) {
    /* ------------------------------------------------------
       PROCESSING FAILED
    ------------------------------------------------------ */

    const name = error instanceof Error ? error.name : 'Error';

    const message =
      error instanceof Error ? error.message : 'Error desconocido durante el procesamiento.';

    sendMessage({
      type: 'error',

      error: {
        name,
        message,
      },
    });
  }
}

/* ==========================================================
   WORKER MESSAGE LISTENER
========================================================== */

/**
 * Receive processing requests from the main thread.
 */
self.onmessage = (event: MessageEvent<WorkerRequest>): void => {
  const message = event.data;

  /*
   * Prevent multiple jobs from running
   * inside the same Worker instance.
   */
  if (started) {
    return;
  }

  if (message.type === 'start') {
    started = true;

    void runProcessing(message);
  }
};
