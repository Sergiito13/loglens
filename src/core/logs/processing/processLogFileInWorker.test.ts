import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { processLogFileInWorker } from './processLogFileInWorker';

import type { LogProcessingProgress, LogProcessingResult } from './types';

import type { WorkerRequest, WorkerResponse } from '../../../workers/logProcessing.types';

/* ==========================================================
   LOGLENS — MOCK WEB WORKER
========================================================== */

/**
 * Simulate the browser Worker API for unit tests.
 */
class MockWorker {
  static instances: MockWorker[] = [];

  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;

  onerror: ((event: ErrorEvent) => void) | null = null;

  onmessageerror: (() => void) | null = null;

  messages: WorkerRequest[] = [];

  terminated = false;

  constructor() {
    MockWorker.instances.push(this);
  }

  /**
   * Capture messages sent to the Worker.
   */
  postMessage(message: WorkerRequest): void {
    this.messages.push(message);
  }

  /**
   * Simulate Worker termination.
   */
  terminate(): void {
    this.terminated = true;
  }

  /**
   * Simulate a message sent from the Worker.
   */
  emit(message: WorkerResponse): void {
    this.onmessage?.({
      data: message,
    } as MessageEvent<WorkerResponse>);
  }
}

/* ==========================================================
   TEST DATA
========================================================== */

const TEST_FILE = new Blob(['2026/11/13 08:15:32 [error] 1234#0: *15 connection failed']);

const TEST_RESULT: LogProcessingResult = {
  detection: {
    format: 'nginx-error',
    name: 'Nginx Error Log',
    confidence: 1,
    matchedLines: 1,
    sampledLines: 1,
  },

  format: 'nginx-error',

  entries: [],

  issues: [],

  totalNonEmptyLines: 1,

  parsedLines: 1,

  invalidLines: 0,

  levelCounts: {
    error: 1,
  },

  truncatedEntries: false,

  truncatedIssues: false,
};

const TEST_PROGRESS: LogProcessingProgress = {
  stage: 'parsing',

  bytesRead: 100,

  totalBytes: 200,

  percent: 50,

  processedLines: 1,

  parsedLines: 1,

  invalidLines: 0,
};

/* ==========================================================
   TEST SETUP
========================================================== */

beforeEach(() => {
  MockWorker.instances = [];

  vi.stubGlobal('Worker', MockWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/* ==========================================================
   WORKER CONTROLLER TESTS
========================================================== */

describe('processLogFileInWorker', () => {
  /* --------------------------------------------------------
     TEST 1 — WORKER CREATION
  -------------------------------------------------------- */

  it('creates a Worker and sends a start message', async () => {
    const promise = processLogFileInWorker(TEST_FILE);

    expect(MockWorker.instances).toHaveLength(1);

    const worker = MockWorker.instances[0];

    expect(worker.messages).toHaveLength(1);

    expect(worker.messages[0].type).toBe('start');

    expect(worker.messages[0].file).toBe(TEST_FILE);

    worker.emit({
      type: 'completed',
      result: TEST_RESULT,
    });

    await expect(promise).resolves.toEqual(TEST_RESULT);
  });

  /* --------------------------------------------------------
     TEST 2 — PROCESSING OPTIONS
  -------------------------------------------------------- */

  it('forwards processing options to the Worker', async () => {
    const promise = processLogFileInWorker(TEST_FILE, {
      chunkSizeBytes: 1024,
      maxStoredEntries: 500,
      maxStoredIssues: 25,
    });

    const worker = MockWorker.instances[0];

    expect(worker.messages[0].options).toEqual({
      chunkSizeBytes: 1024,
      maxStoredEntries: 500,
      maxStoredIssues: 25,
    });

    worker.emit({
      type: 'completed',
      result: TEST_RESULT,
    });

    await promise;
  });

  /* --------------------------------------------------------
     TEST 3 — PROGRESS REPORTING
  -------------------------------------------------------- */

  it('forwards progress updates', async () => {
    const onProgress = vi.fn();

    const promise = processLogFileInWorker(TEST_FILE, {
      onProgress,
    });

    const worker = MockWorker.instances[0];

    worker.emit({
      type: 'progress',
      progress: TEST_PROGRESS,
    });

    expect(onProgress).toHaveBeenCalledWith(TEST_PROGRESS);

    worker.emit({
      type: 'completed',
      result: TEST_RESULT,
    });

    await promise;
  });

  /* --------------------------------------------------------
     TEST 4 — SUCCESSFUL COMPLETION
  -------------------------------------------------------- */

  it('returns results and terminates the Worker', async () => {
    const promise = processLogFileInWorker(TEST_FILE);

    const worker = MockWorker.instances[0];

    worker.emit({
      type: 'completed',
      result: TEST_RESULT,
    });

    const result = await promise;

    expect(result.format).toBe('nginx-error');

    expect(worker.terminated).toBe(true);
  });

  /* --------------------------------------------------------
     TEST 5 — PROCESSING ERRORS
  -------------------------------------------------------- */

  it('handles processing errors', async () => {
    const promise = processLogFileInWorker(TEST_FILE);

    const worker = MockWorker.instances[0];

    worker.emit({
      type: 'error',

      error: {
        name: 'Error',
        message: 'Unsupported log format',
      },
    });

    await expect(promise).rejects.toThrow('Unsupported log format');

    expect(worker.terminated).toBe(true);
  });

  /* --------------------------------------------------------
     TEST 6 — CANCELLATION
  -------------------------------------------------------- */

  it('supports cancellation during processing', async () => {
    const controller = new AbortController();

    const promise = processLogFileInWorker(TEST_FILE, {
      signal: controller.signal,
    });

    const worker = MockWorker.instances[0];

    controller.abort();

    await expect(promise).rejects.toMatchObject({
      name: 'AbortError',
    });

    expect(worker.terminated).toBe(true);
  });

  /* --------------------------------------------------------
     TEST 7 — ALREADY CANCELLED
  -------------------------------------------------------- */

  it('rejects immediately if already cancelled', async () => {
    const controller = new AbortController();

    controller.abort();

    await expect(
      processLogFileInWorker(TEST_FILE, {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({
      name: 'AbortError',
    });

    expect(MockWorker.instances).toHaveLength(0);
  });

  /* --------------------------------------------------------
     TEST 8 — UNEXPECTED WORKER ERRORS
  -------------------------------------------------------- */

  it('handles unexpected Worker errors', async () => {
    const promise = processLogFileInWorker(TEST_FILE);

    const worker = MockWorker.instances[0];

    worker.onerror?.({
      message: 'Worker execution failed',
    } as ErrorEvent);

    await expect(promise).rejects.toThrow('Worker execution failed');

    expect(worker.terminated).toBe(true);
  });
});
