import type { LogDetector } from '../types';

/* ==========================================================
   LOGLENS — NGINX ERROR LOG DETECTOR
========================================================== */

/**
 * Standard Nginx error log pattern.
 *
 * Example:
 *
 * 2026/11/13 08:15:32 [error] 1234#0: *15 connect() failed
 *
 * Supported severity levels:
 * debug, info, notice, warn, error, crit, alert, emerg
 */
const NGINX_ERROR_PATTERN =
  /^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\s+\[(?:debug|info|notice|warn|error|crit|alert|emerg)\]\s+\d+#\d+:/;

/**
 * Detects standard Nginx error log entries.
 */
export const nginxErrorDetector: LogDetector = {
  id: 'nginx-error',

  name: 'Nginx Error Log',

  matches(line: string): boolean {
    return NGINX_ERROR_PATTERN.test(line);
  },
};