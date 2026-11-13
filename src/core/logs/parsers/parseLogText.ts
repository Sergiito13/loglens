import { logParsers } from './index';

import type { LogEntry, LogParseIssue, LogParseResult } from './types';

/* ==========================================================
   LOGLENS — LOG PARSING ENGINE
========================================================== */

/**
 * Parse log text using the registered parser
 * corresponding to the detected format.
 *
 * This implementation processes text already loaded
 * in memory. Streaming support will be added later.
 */
export function parseLogText(content: string, format: string): LogParseResult {
  /* --------------------------------------------------------
     FIND PARSER
  -------------------------------------------------------- */

  const parser = logParsers.find((item) => item.format === format);

  if (!parser) {
    throw new Error(`Unsupported log format: ${format}`);
  }

  /* --------------------------------------------------------
     PREPARE RESULT
  -------------------------------------------------------- */

  const entries: LogEntry[] = [];

  const issues: LogParseIssue[] = [];

  let totalNonEmptyLines = 0;

  /* --------------------------------------------------------
     SPLIT CONTENT INTO LINES
  -------------------------------------------------------- */

  const lines = content.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);

  /* --------------------------------------------------------
     PROCESS EVERY LINE
  -------------------------------------------------------- */

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index];

    const lineNumber = index + 1;

    // Ignore empty lines

    if (!raw.trim()) {
      continue;
    }

    totalNonEmptyLines++;

    // Parse using the selected parser

    const entry = parser.parseLine(raw, lineNumber);

    if (entry) {
      entries.push(entry);
    } else {
      issues.push({
        lineNumber,
        raw,
        reason: 'Unrecognized or invalid log entry',
      });
    }
  }

  /* --------------------------------------------------------
     RETURN RESULT
  -------------------------------------------------------- */

  return {
    format,

    entries,

    issues,

    totalNonEmptyLines,
  };
}
