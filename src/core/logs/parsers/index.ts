import type { LogParser } from './types';

import { nginxErrorParser } from './nginxError.parser';

/* ==========================================================
   LOGLENS — PARSER REGISTRY
========================================================== */

/**
 * Registry of supported log parsers.
 *
 * Adding a new format:
 *
 * 1. Implement the LogParser interface.
 * 2. Import the parser here.
 * 3. Register it in this array.
 *
 * No changes to the parsing engine are required.
 */

export const logParsers: readonly LogParser[] = [nginxErrorParser];
