/* ==========================================================
   LOGLENS — LOG DETECTION TYPES
========================================================== */

/**
 * Contract implemented by every log format detector.
 *
 * Each format has its own independent detector.
 */
export interface LogDetector {
  /**
   * Unique identifier.
   *
   * Examples:
   * - nginx-error
   * - apache-error
   * - laravel
   */
  readonly id: string;

  /**
   * Human-readable format name.
   */
  readonly name: string;

  /**
   * Check whether a line matches this log format.
   */
  matches(line: string): boolean;
}

/**
 * Result returned by the detection engine.
 */
export interface LogDetectionResult {
  /**
   * Detected format identifier or 'unknown'.
   */
  format: string;

  /**
   * Human-readable format name.
   */
  name: string | null;

  /**
   * Heuristic match ratio between 0 and 1.
   *
   * This is not a calibrated probability.
   */
  confidence: number;

  /**
   * Number of lines matching the detected format.
   */
  matchedLines: number;

  /**
   * Number of non-empty lines analyzed.
   */
  sampledLines: number;
}