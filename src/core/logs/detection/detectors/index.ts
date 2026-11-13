import type { LogDetector } from '../types';

import { nginxErrorDetector } from './nginxError.detector';

/* ==========================================================
   LOGLENS — LOG DETECTOR REGISTRY
========================================================== */

/**
 * Central registry of supported log formats.
 *
 * To add a new format:
 *
 * 1. Create a detector implementing LogDetector.
 * 2. Import it here.
 * 3. Register it in this array.
 *
 * The main detection engine does not need changes.
 */
export const logDetectors: readonly LogDetector[] = [
  nginxErrorDetector,
];