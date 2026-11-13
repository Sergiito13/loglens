import { describe, expect, it } from 'vitest';

import { parseLogText } from './parseLogText';

/* ==========================================================
   LOGLENS — PARSING ENGINE TESTS
========================================================== */

describe('parseLogText', () => {
  it('parses multiple Nginx entries', () => {
    const content = [
      '2026/11/13 08:15:32 [error] 1234#0: *15 connection failed',
      '2026/11/13 08:16:01 [warn] 1234#0: response buffered',
      '2026/11/13 08:16:45 [crit] 1234#0: permission denied',
    ].join('\n');

    const result = parseLogText(content, 'nginx-error');

    expect(result.format).toBe('nginx-error');

    expect(result.entries).toHaveLength(3);

    expect(result.issues).toHaveLength(0);

    expect(result.totalNonEmptyLines).toBe(3);
  });

  it('preserves original line numbers', () => {
    const content = [
      '',
      '2026/11/13 08:15:32 [error] 1234#0: first error',
      '',
      '2026/11/13 08:16:01 [warn] 1234#0: second error',
    ].join('\n');

    const result = parseLogText(content, 'nginx-error');

    expect(result.entries[0].lineNumber).toBe(2);

    expect(result.entries[1].lineNumber).toBe(4);
  });

  it('collects invalid lines as issues', () => {
    const content = [
      '2026/11/13 08:15:32 [error] 1234#0: connection failed',
      'Invalid log line',
    ].join('\n');

    const result = parseLogText(content, 'nginx-error');

    expect(result.entries).toHaveLength(1);

    expect(result.issues).toHaveLength(1);

    expect(result.issues[0].lineNumber).toBe(2);

    expect(result.issues[0].raw).toBe('Invalid log line');
  });

  it('ignores empty lines', () => {
    const content = '\n\n   \n';

    const result = parseLogText(content, 'nginx-error');

    expect(result.entries).toHaveLength(0);

    expect(result.issues).toHaveLength(0);

    expect(result.totalNonEmptyLines).toBe(0);
  });

  it('supports Windows line endings', () => {
    const content = [
      '2026/11/13 08:15:32 [error] 1234#0: first error',
      '2026/11/13 08:16:01 [warn] 1234#0: second error',
    ].join('\r\n');

    const result = parseLogText(content, 'nginx-error');

    expect(result.entries).toHaveLength(2);
  });

  it('supports UTF-8 BOM', () => {
    const content = '\uFEFF2026/11/13 08:15:32 [error] 1234#0: connection failed';

    const result = parseLogText(content, 'nginx-error');

    expect(result.entries).toHaveLength(1);
  });

  it('rejects unsupported log formats', () => {
    expect(() => parseLogText('Some log content', 'unsupported-format')).toThrow(
      'Unsupported log format: unsupported-format',
    );
  });
});
