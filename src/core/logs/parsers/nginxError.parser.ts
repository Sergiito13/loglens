import type { LogEntry, LogParser } from './types';

/* ==========================================================
   LOGLENS — NGINX ERROR LOG PARSER
========================================================== */

/**
 * Standard Nginx error log structure.
 *
 * Example:
 *
 * 2026/11/13 08:15:32 [error] 1234#0: *15 connect() failed
 *
 * The connection identifier (*15) is optional.
 */
const NGINX_ERROR_PATTERN =
  /^(?<year>\d{4})\/(?<month>\d{2})\/(?<day>\d{2})\s+(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})\s+\[(?<level>debug|info|notice|warn|error|crit|alert|emerg)\]\s+(?<processId>\d+)#(?<threadId>\d+):\s*(?:\*(?<connectionId>\d+)\s+)?(?<message>.*)$/;

/* ==========================================================
   HELPERS
========================================================== */

/**
 * Validate the date and time components.
 *
 * Date.UTC is used only for validation.
 * We do not interpret the Nginx timestamp as UTC.
 */
function isValidTimestamp(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): boolean {
  if (year < 1) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  );
}

/**
 * Convert an integer identifier safely.
 */
function parseIdentifier(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }

  const number = Number(value);

  return Number.isSafeInteger(number) ? number : null;
}

/* ==========================================================
   SINGLE LINE PARSER
========================================================== */

/**
 * Parse one standard Nginx error log entry.
 */
export function parseNginxErrorLine(raw: string, lineNumber: number): LogEntry | null {
  const line = raw.replace(/^\uFEFF/, '').trim();

  const match = NGINX_ERROR_PATTERN.exec(line);

  if (!match?.groups) {
    return null;
  }

  const {
    year,
    month,
    day,
    hour,
    minute,
    second,
    level,
    processId,
    threadId,
    connectionId,
    message,
  } = match.groups;

  /* --------------------------------------------------------
     TIMESTAMP VALIDATION
  -------------------------------------------------------- */

  const validTimestamp = isValidTimestamp(
    Number(year),
    Number(month),
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  if (!validTimestamp) {
    return null;
  }

  /* --------------------------------------------------------
     IDENTIFIER VALIDATION
  -------------------------------------------------------- */

  const parsedProcessId = parseIdentifier(processId);

  const parsedThreadId = parseIdentifier(threadId);

  const parsedConnectionId = parseIdentifier(connectionId);

  if (
    parsedProcessId === null ||
    parsedThreadId === null ||
    (connectionId !== undefined && parsedConnectionId === null)
  ) {
    return null;
  }

  /* --------------------------------------------------------
     MESSAGE VALIDATION
  -------------------------------------------------------- */

  const parsedMessage = message.trim();

  if (!parsedMessage) {
    return null;
  }

  /* --------------------------------------------------------
     STRUCTURED RESULT
  -------------------------------------------------------- */

  return {
    lineNumber,

    format: 'nginx-error',

    timestamp: `${year}-${month}-${day}T${hour}:${minute}:${second}`,

    level,

    message: parsedMessage,

    raw,

    metadata: {
      processId: parsedProcessId,
      threadId: parsedThreadId,
      connectionId: parsedConnectionId,
    },
  };
}

/* ==========================================================
   PARSER IMPLEMENTATION
========================================================== */

/**
 * Nginx parser implementing the common
 * LogParser contract.
 */
export const nginxErrorParser: LogParser = {
  format: 'nginx-error',

  parseLine(line: string, lineNumber: number): LogEntry | null {
    return parseNginxErrorLine(line, lineNumber);
  },
};
