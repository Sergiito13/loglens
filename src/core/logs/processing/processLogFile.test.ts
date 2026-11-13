import { describe, expect, it } from 'vitest';

import { processLogFile } from './processLogFile';

import type { LogProcessingProgress } from './types';

/* ==========================================================
   LOGLENS — PROCESSING ENGINE TESTS
========================================================== */

const ERROR_LINE = '2026/11/13 08:15:32 [error] 1234#0: *15 connect() failed';

const WARN_LINE = '2026/11/13 08:16:01 [warn] 1234#0: *16 response buffered';

const CRIT_LINE = '2026/11/13 08:16:45 [crit] 1234#0: *17 permission denied';

/* ==========================================================
   TEST SUITE
========================================================== */

describe('processLogFile', () => {
  it('detects and processes Nginx logs', async () => {
    const content = [ERROR_LINE, WARN_LINE, CRIT_LINE].join('\n');

    const file = new Blob([content]);

    const result = await processLogFile(file);

    expect(result.format).toBe('nginx-error');

    expect(result.detection.format).toBe('nginx-error');

    expect(result.entries).toHaveLength(3);

    expect(result.parsedLines).toBe(3);

    expect(result.invalidLines).toBe(0);

    expect(result.levelCounts).toEqual({
      error: 1,
      warn: 1,
      crit: 1,
    });
  });

  it('processes the last line without a newline', async () => {
    const file = new Blob([ERROR_LINE]);

    const result = await processLogFile(file);

    expect(result.entries).toHaveLength(1);

    expect(result.entries[0].message).toBe('connect() failed');
  });

  it('handles UTF-8 and CRLF across chunk boundaries', async () => {
    const content = [`${ERROR_LINE} conexión`, WARN_LINE].join('\r\n');

    const file = new Blob([content]);

    const result = await processLogFile(file, {
      chunkSizeBytes: 1,
    });

    expect(result.entries).toHaveLength(2);

    expect(result.entries[0].message).toContain('conexión');

    expect(result.entries[1].lineNumber).toBe(2);
  });

  it('collects invalid lines', async () => {
    const content = [ERROR_LINE, 'Invalid log line', WARN_LINE].join('\n');

    const file = new Blob([content]);

    const result = await processLogFile(file);

    expect(result.parsedLines).toBe(2);

    expect(result.invalidLines).toBe(1);

    expect(result.issues).toHaveLength(1);

    expect(result.issues[0].lineNumber).toBe(2);
  });

  it('respects memory retention limits', async () => {
    const content = [ERROR_LINE, WARN_LINE, CRIT_LINE].join('\n');

    const file = new Blob([content]);

    const result = await processLogFile(file, {
      maxStoredEntries: 1,
    });

    expect(result.parsedLines).toBe(3);

    expect(result.entries).toHaveLength(1);

    expect(result.truncatedEntries).toBe(true);

    expect(result.levelCounts.error).toBe(1);

    expect(result.levelCounts.warn).toBe(1);

    expect(result.levelCounts.crit).toBe(1);
  });

  it('rejects unsupported formats', async () => {
    const file = new Blob(['This is not a supported log format']);

    await expect(processLogFile(file)).rejects.toThrow('LogLens no reconoce el formato');
  });

  it('rejects an empty file', async () => {
    const file = new Blob([]);

    await expect(processLogFile(file)).rejects.toThrow('LogLens no reconoce el formato');
  });

  it('supports cancellation before processing', async () => {
    const controller = new AbortController();

    controller.abort();

    const file = new Blob([ERROR_LINE]);

    await expect(
      processLogFile(file, {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('supports cancellation during processing', async () => {
    const controller = new AbortController();

    const file = new Blob([Array(100).fill(ERROR_LINE).join('\n')]);

    await expect(
      processLogFile(file, {
        signal: controller.signal,

        chunkSizeBytes: 64,

        onProgress(progress) {
          if (progress.stage === 'parsing' && progress.bytesRead > 0) {
            controller.abort();
          }
        },
      }),
    ).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('reports real processing progress', async () => {
    const file = new Blob([ERROR_LINE, '\n', WARN_LINE]);

    const progressEvents: LogProcessingProgress[] = [];

    const result = await processLogFile(file, {
      chunkSizeBytes: 16,

      onProgress(progress) {
        progressEvents.push(progress);
      },
    });

    expect(result.parsedLines).toBe(2);

    expect(progressEvents[0].stage).toBe('detecting');

    const lastProgress = progressEvents.at(-1);

    expect(lastProgress?.stage).toBe('completed');

    expect(lastProgress?.percent).toBe(100);

    expect(lastProgress?.bytesRead).toBe(file.size);
  });
});
