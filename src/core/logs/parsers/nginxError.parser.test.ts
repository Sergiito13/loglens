import { describe, expect, it } from 'vitest';

import { parseNginxErrorLine } from './nginxError.parser';

/* ==========================================================
   LOGLENS — NGINX PARSER TESTS
========================================================== */

describe('parseNginxErrorLine', () => {
  it('parses a standard Nginx error entry', () => {
    const line = '2026/11/13 08:15:32 [error] 1234#0: *15 connect() failed';

    const result = parseNginxErrorLine(line, 1);

    expect(result).not.toBeNull();

    expect(result?.format).toBe('nginx-error');

    expect(result?.timestamp).toBe('2026-11-13T08:15:32');

    expect(result?.level).toBe('error');

    expect(result?.message).toBe('connect() failed');

    expect(result?.metadata).toEqual({
      processId: 1234,
      threadId: 0,
      connectionId: 15,
    });
  });

  it('supports entries without a connection ID', () => {
    const line = '2026/11/13 08:15:32 [warn] 1234#0: upstream response buffered';

    const result = parseNginxErrorLine(line, 2);

    expect(result?.level).toBe('warn');

    expect(result?.metadata.connectionId).toBeNull();
  });

  it.each(['debug', 'info', 'notice', 'warn', 'error', 'crit', 'alert', 'emerg'])(
    'supports the %s severity level',
    (level) => {
      const line = `2026/11/13 08:15:32 [${level}] 1234#0: test message`;

      const result = parseNginxErrorLine(line, 1);

      expect(result?.level).toBe(level);
    },
  );

  it('preserves the original log line', () => {
    const line = '2026/11/13 08:15:32 [error] 1234#0: *15 connection failed';

    const result = parseNginxErrorLine(line, 5);

    expect(result?.raw).toBe(line);
    expect(result?.lineNumber).toBe(5);
  });

  it('rejects unsupported formats', () => {
    const line = '[2026-11-13 08:15:32] production.ERROR: Failed';

    expect(parseNginxErrorLine(line, 1)).toBeNull();
  });

  it('rejects invalid calendar dates', () => {
    const line = '2026/02/30 08:15:32 [error] 1234#0: invalid date';

    expect(parseNginxErrorLine(line, 1)).toBeNull();
  });

  it('rejects empty messages', () => {
    const line = '2026/11/13 08:15:32 [error] 1234#0:';

    expect(parseNginxErrorLine(line, 1)).toBeNull();
  });

  it('rejects unsupported severity levels', () => {
    const line = '2026/11/13 08:15:32 [fatal] 1234#0: test';

    expect(parseNginxErrorLine(line, 1)).toBeNull();
  });

  it('preserves the complete error message', () => {
    const line =
      '2026/11/13 08:15:32 [error] 1234#0: *15 connect() failed (111: Connection refused) while connecting to upstream';

    const result = parseNginxErrorLine(line, 1);

    expect(result?.message).toBe(
      'connect() failed (111: Connection refused) while connecting to upstream',
    );
  });
});
