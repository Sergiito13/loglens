import { detectFileFormat } from '../detection/detectLogFormat';

import { logParsers } from '../parsers';

import type { LogEntry, LogParseIssue } from '../parsers/types';

import type {
  LogProcessingProgress,
  LogProcessingResult,
  ProcessLogFileOptions,
  ProcessingStage,
} from './types';

/* ==========================================================
   LOGLENS — FILE PROCESSING ENGINE
========================================================== */

/**
 * Default reading chunk: 256 KiB.
 */
const DEFAULT_CHUNK_BYTES = 256 * 1024;

/**
 * Maximum configurable chunk: 1 MiB.
 */
const MAX_CHUNK_BYTES = 1024 * 1024;

/**
 * Maximum individual log line length.
 */
const MAX_LINE_CHARACTERS = 1024 * 1024;

/**
 * Default memory retention limits.
 */
const DEFAULT_STORED_ENTRIES = 10_000;

const DEFAULT_STORED_ISSUES = 250;

/* ==========================================================
   OPTION VALIDATION
========================================================== */

function validateLimit(value: number, name: string, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer between ${minimum} and ${maximum}`);
  }

  return value;
}

/* ==========================================================
   CANCELLATION
========================================================== */

function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Log processing cancelled', 'AbortError');
  }
}

/* ==========================================================
   MAIN PROCESSING FUNCTION
========================================================== */

/**
 * Process a browser File or Blob.
 *
 * Features:
 *
 * - Automatic format detection.
 * - Chunk-based file reading.
 * - Registered parser selection.
 * - Real progress reporting.
 * - Cancellation support.
 * - Bounded result retention.
 *
 * The complete file is not loaded into memory
 * as one large string.
 */
export async function processLogFile(
  file: Blob,
  options: ProcessLogFileOptions = {},
): Promise<LogProcessingResult> {
  /* ========================================================
     1. CONFIGURATION
  ======================================================== */

  const chunkSize = validateLimit(
    options.chunkSizeBytes ?? DEFAULT_CHUNK_BYTES,
    'chunkSizeBytes',
    1,
    MAX_CHUNK_BYTES,
  );

  const maxEntries = validateLimit(
    options.maxStoredEntries ?? DEFAULT_STORED_ENTRIES,
    'maxStoredEntries',
    0,
    Number.MAX_SAFE_INTEGER,
  );

  const maxIssues = validateLimit(
    options.maxStoredIssues ?? DEFAULT_STORED_ISSUES,
    'maxStoredIssues',
    0,
    Number.MAX_SAFE_INTEGER,
  );

  /* ========================================================
     2. PROCESSING STATE
  ======================================================== */

  let totalNonEmptyLines = 0;

  let parsedLines = 0;

  let invalidLines = 0;

  let bytesRead = 0;

  let lineNumber = 0;

  let pending = '';

  const entries: LogEntry[] = [];

  const issues: LogParseIssue[] = [];

  const levelCounts: Record<string, number> = {};

  /* ========================================================
     3. PROGRESS REPORTING
  ======================================================== */

  const report = (stage: ProcessingStage): void => {
    const progress: LogProcessingProgress = {
      stage,

      bytesRead,

      totalBytes: file.size,

      percent: file.size === 0 ? 0 : Math.round((bytesRead / file.size) * 100),

      processedLines: totalNonEmptyLines,

      parsedLines,

      invalidLines,
    };

    options.onProgress?.(progress);
  };

  /* ========================================================
     4. FORMAT DETECTION
  ======================================================== */

  checkAborted(options.signal);

  report('detecting');

  checkAborted(options.signal);

  const detection = await detectFileFormat(file);

  checkAborted(options.signal);

  if (detection.format === 'unknown') {
    throw new Error('LogLens no reconoce el formato de este archivo.');
  }

  /* ========================================================
     5. FIND REGISTERED PARSER
  ======================================================== */

  const parser = logParsers.find((candidate) => candidate.format === detection.format);

  if (!parser) {
    throw new Error(`No hay un parser registrado para el formato: ${detection.format}`);
  }

  /* ========================================================
     6. PROCESS A SINGLE LINE
  ======================================================== */

  const handleLine = (raw: string): void => {
    lineNumber++;

    if (!raw.trim()) {
      return;
    }

    totalNonEmptyLines++;

    const entry = parser.parseLine(raw, lineNumber);

    if (entry) {
      parsedLines++;

      levelCounts[entry.level] = (levelCounts[entry.level] ?? 0) + 1;

      /*
       * Keep only a bounded number of entries.
       *
       * All entries are counted, even when
       * the retention limit has been reached.
       */
      if (entries.length < maxEntries) {
        entries.push(entry);
      }
    } else {
      invalidLines++;

      if (issues.length < maxIssues) {
        issues.push({
          lineNumber,

          raw,

          reason: 'Unrecognized or invalid log entry',
        });
      }
    }
  };

  /* ========================================================
     7. HANDLE TEXT AND LINE BOUNDARIES
  ======================================================== */

  const consume = (decoded: string, final = false): void => {
    const text = pending + decoded;

    let start = 0;

    for (let i = 0; i < text.length; i++) {
      const character = text[i];

      if (character !== '\r' && character !== '\n') {
        continue;
      }

      /*
       * Wait for the next chunk when a CR
       * is the final character.
       *
       * This preserves CRLF boundaries.
       */
      if (character === '\r' && i === text.length - 1 && !final) {
        break;
      }

      const line = text.slice(start, i);

      if (line.length > MAX_LINE_CHARACTERS) {
        throw new RangeError('A log line exceeds the maximum supported length (1 MiB).');
      }

      handleLine(line);

      /*
       * Treat CRLF as one line ending.
       */
      if (character === '\r' && text[i + 1] === '\n') {
        i++;
      }

      start = i + 1;
    }

    /*
     * Preserve incomplete lines between chunks.
     */
    pending = text.slice(start);

    if (pending.length > MAX_LINE_CHARACTERS) {
      throw new RangeError('A log line exceeds the maximum supported length (1 MiB).');
    }

    /*
     * Process the final line even when the file
     * does not end with a newline.
     */
    if (final && pending.length > 0) {
      handleLine(pending);

      pending = '';
    }
  };

  /* ========================================================
     8. CHUNK-BASED FILE READING
  ======================================================== */

  report('parsing');

  const decoder = new TextDecoder('utf-8');

  for (let offset = 0; offset < file.size; offset += chunkSize) {
    checkAborted(options.signal);

    const end = Math.min(offset + chunkSize, file.size);

    const chunk = await file.slice(offset, end).arrayBuffer();

    checkAborted(options.signal);

    /*
     * Streaming decoding preserves UTF-8
     * characters split across chunks.
     */
    consume(decoder.decode(new Uint8Array(chunk), { stream: true }));

    bytesRead = end;

    report('parsing');

    checkAborted(options.signal);
  }

  /* ========================================================
     9. FINALIZE DECODING
  ======================================================== */

  consume(decoder.decode(), true);

  checkAborted(options.signal);

  report('completed');

  /* ========================================================
     10. RETURN FINAL RESULT
  ======================================================== */

  return {
    detection,

    format: detection.format,

    entries,

    issues,

    totalNonEmptyLines,

    parsedLines,

    invalidLines,

    levelCounts,

    truncatedEntries: entries.length < parsedLines,

    truncatedIssues: issues.length < invalidLines,
  };
}
