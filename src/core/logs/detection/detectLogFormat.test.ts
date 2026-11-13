import { describe, expect, it } from 'vitest';

import {
  detectFileFormat,
  detectLogFormat,
} from './detectLogFormat';

/* ==========================================================
   LOGLENS — LOG DETECTION TESTS
========================================================== */

const NGINX_ERROR_LINE =
  '2026/11/13 08:15:32 [error] 1234#0: *15 connect() failed';

/* ==========================================================
   TEXT DETECTION TESTS
========================================================== */

describe('detectLogFormat', () => {
  it('detects a valid Nginx error log', () => {
    const content = `
2026/11/13 08:15:32 [error] 1234#0: *15 connect() failed
2026/11/13 08:16:01 [warn] 1234#0: upstream response buffered
2026/11/13 08:16:45 [crit] 1234#0: permission denied
`;

    const result = detectLogFormat(content);

    expect(result.format).toBe('nginx-error');

    expect(result.name).toBe('Nginx Error Log');

    expect(result.confidence).toBe(1);

    expect(result.matchedLines).toBe(3);

    expect(result.sampledLines).toBe(3);
  });

  it('detects a single Nginx log entry', () => {
    const result = detectLogFormat(NGINX_ERROR_LINE);

    expect(result.format).toBe('nginx-error');

    expect(result.confidence).toBe(1);
  });

  it('returns unknown for unsupported formats', () => {
    const content = `
[2026-11-13 08:15:32] production.ERROR: Database connection failed
[2026-11-13 08:15:35] production.WARNING: Slow query
`;

    const result = detectLogFormat(content);

    expect(result.format).toBe('unknown');

    expect(result.confidence).toBe(0);
  });

  it('returns unknown for empty content', () => {
    const result = detectLogFormat('');

    expect(result.format).toBe('unknown');

    expect(result.sampledLines).toBe(0);
  });

  it('ignores blank lines', () => {
    const content = `


${NGINX_ERROR_LINE}


`;

    const result = detectLogFormat(content);

    expect(result.format).toBe('nginx-error');

    expect(result.sampledLines).toBe(1);
  });

  it('supports Windows line endings', () => {
    const content = [
      NGINX_ERROR_LINE,
      NGINX_ERROR_LINE,
    ].join('\r\n');

    const result = detectLogFormat(content);

    expect(result.format).toBe('nginx-error');

    expect(result.sampledLines).toBe(2);
  });

  it('handles UTF-8 BOM', () => {
    const result = detectLogFormat(
      `\uFEFF${NGINX_ERROR_LINE}`,
    );

    expect(result.format).toBe('nginx-error');
  });

  it('rejects samples below the confidence threshold', () => {
    const content = `
${NGINX_ERROR_LINE}
Unrelated message
Another unrelated message
Another unsupported message
`;

    const result = detectLogFormat(content);

    expect(result.format).toBe('unknown');

    expect(result.confidence).toBe(0.25);
  });

  it('analyzes a maximum of 50 lines', () => {
    const content = Array(100)
      .fill(NGINX_ERROR_LINE)
      .join('\n');

    const result = detectLogFormat(content);

    expect(result.format).toBe('nginx-error');

    expect(result.sampledLines).toBe(50);

    expect(result.matchedLines).toBe(50);
  });
});

/* ==========================================================
   FILE DETECTION TESTS
========================================================== */

describe('detectFileFormat', () => {
  it('detects a log from a Blob', async () => {
    const file = new Blob([NGINX_ERROR_LINE], {
      type: 'text/plain',
    });

    const result = await detectFileFormat(file);

    expect(result.format).toBe('nginx-error');
  });

  it('returns unknown for an empty file', async () => {
    const file = new Blob([]);

    const result = await detectFileFormat(file);

    expect(result.format).toBe('unknown');

    expect(result.sampledLines).toBe(0);
  });
});