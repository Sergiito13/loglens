import { logDetectors } from './detectors';

import type {
  LogDetectionResult,
  LogDetector,
} from './types';

/* ==========================================================
   LOGLENS — LOG FORMAT DETECTION ENGINE
========================================================== */

/**
 * Maximum number of bytes read from a browser file.
 */
const MAX_SAMPLE_BYTES = 64 * 1024;

/**
 * Maximum number of non-empty lines analyzed.
 */
const MAX_SAMPLE_LINES = 50;

/**
 * Minimum match ratio required to identify a format.
 */
const MIN_CONFIDENCE = 0.6;

/**
 * Minimum difference between the top two detector scores.
 */
const MIN_SCORE_MARGIN = 0.15;

/* ==========================================================
   INTERNAL TYPES
========================================================== */

interface DetectorScore {
  detector: LogDetector;

  matchedLines: number;

  confidence: number;
}

/* ==========================================================
   SAMPLE EXTRACTION
========================================================== */

/**
 * Extract a bounded sample of non-empty log lines.
 */
function getSampleLines(content: string): string[] {
  return content
    .slice(0, MAX_SAMPLE_BYTES)
    .replace(/^\uFEFF/, '')
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, MAX_SAMPLE_LINES);
}

/* ==========================================================
   DETECTOR EVALUATION
========================================================== */

/**
 * Calculate the match ratio for a detector.
 */
function evaluateDetector(
  detector: LogDetector,
  lines: readonly string[],
): DetectorScore {
  const matchedLines = lines.filter((line) =>
    detector.matches(line),
  ).length;

  return {
    detector,
    matchedLines,
    confidence: matchedLines / lines.length,
  };
}

/* ==========================================================
   MAIN DETECTION FUNCTION
========================================================== */

/**
 * Detect the most likely supported log format.
 *
 * All registered detectors are evaluated independently.
 */
export function detectLogFormat(
  content: string,
): LogDetectionResult {
  const lines = getSampleLines(content);

  const sampledLines = lines.length;

  /* --------------------------------------------------------
     EMPTY CONTENT
  -------------------------------------------------------- */

  if (sampledLines === 0) {
    return {
      format: 'unknown',
      name: null,
      confidence: 0,
      matchedLines: 0,
      sampledLines: 0,
    };
  }

  /* --------------------------------------------------------
     EVALUATE REGISTERED DETECTORS
  -------------------------------------------------------- */

  const scores = logDetectors
    .map((detector) => evaluateDetector(detector, lines))
    .sort((a, b) => b.confidence - a.confidence);

  const best = scores[0];

  /* --------------------------------------------------------
     NO DETECTORS REGISTERED
  -------------------------------------------------------- */

  if (!best) {
    return {
      format: 'unknown',
      name: null,
      confidence: 0,
      matchedLines: 0,
      sampledLines,
    };
  }

  /* --------------------------------------------------------
     CHECK CONFIDENCE
  -------------------------------------------------------- */

  const secondBest = scores[1];

  const belowThreshold =
    best.confidence < MIN_CONFIDENCE;

  const ambiguous =
    secondBest !== undefined &&
    best.confidence - secondBest.confidence < MIN_SCORE_MARGIN;

  /* --------------------------------------------------------
     UNKNOWN OR AMBIGUOUS FORMAT
  -------------------------------------------------------- */

  if (belowThreshold || ambiguous) {
    return {
      format: 'unknown',
      name: null,
      confidence: best.confidence,
      matchedLines: best.matchedLines,
      sampledLines,
    };
  }

  /* --------------------------------------------------------
     SUCCESSFUL DETECTION
  -------------------------------------------------------- */

  return {
    format: best.detector.id,
    name: best.detector.name,
    confidence: best.confidence,
    matchedLines: best.matchedLines,
    sampledLines,
  };
}

/* ==========================================================
   BROWSER FILE DETECTION
========================================================== */

/**
 * Detect the format of a File or Blob.
 *
 * Reads up to 64 KiB instead of loading the entire
 * file into memory.
 */
export async function detectFileFormat(
  file: Blob,
): Promise<LogDetectionResult> {
  if (file.size === 0) {
    return detectLogFormat('');
  }

  let sample = await file
    .slice(0, MAX_SAMPLE_BYTES)
    .text();

  /*
   * Remove the potentially incomplete final line
   * when the sample does not include the whole file.
   */
  if (file.size > MAX_SAMPLE_BYTES) {
    const lastNewline = Math.max(
      sample.lastIndexOf('\n'),
      sample.lastIndexOf('\r'),
    );

    if (lastNewline >= 0) {
      sample = sample.slice(0, lastNewline);
    } else {
      sample = '';
    }
  }

  return detectLogFormat(sample);
}