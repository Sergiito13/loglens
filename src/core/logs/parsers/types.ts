/* ==========================================================
   LOGLENS — LOG PARSER TYPES
========================================================== */

/**
 * Additional metadata provided by individual log formats.
 */
export type LogMetadataValue = string | number | boolean | null;

/**
 * Common representation of a parsed log entry.
 *
 * Every parser should return entries following
 * this structure.
 */
export interface LogEntry {
  /**
   * Original line number in the log file.
   */
  lineNumber: number;

  /**
   * Identifier of the source format.
   */
  format: string;

  /**
   * Timestamp without an assumed timezone.
   *
   * Example: 2026-11-13T08:15:32
   */
  timestamp: string | null;

  /**
   * Original severity level.
   */
  level: string;

  /**
   * Main log message.
   */
  message: string;

  /**
   * Original unmodified log line.
   */
  raw: string;

  /**
   * Format-specific structured information.
   */
  metadata: Record<string, LogMetadataValue>;
}

/**
 * Information about a line that could not be parsed.
 */
export interface LogParseIssue {
  lineNumber: number;

  raw: string;

  reason: string;
}

/**
 * Contract implemented by every log parser.
 */
export interface LogParser {
  readonly format: string;

  /**
   * Parse a single log entry.
   *
   * Returns null when the line is invalid
   * or does not match the expected format.
   */
  parseLine(line: string, lineNumber: number): LogEntry | null;
}

/**
 * Result returned by the parsing engine.
 */
export interface LogParseResult {
  format: string;

  entries: LogEntry[];

  issues: LogParseIssue[];

  totalNonEmptyLines: number;
}
