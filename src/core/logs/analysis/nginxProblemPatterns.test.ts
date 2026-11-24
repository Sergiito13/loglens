import { describe, expect, it } from 'vitest';

import { NginxProblemAggregator } from './nginxProblemPatterns';
import { processLogFile } from '../processing/processLogFile';
import type { LogEntry } from '../parsers/types';

const makeLine = (level: string, message: string, second = 0) =>
  `2026/11/13 08:15:${String(second).padStart(2, '0')} [${level}] 1234#0: ${message}`;

const makeEntry = (level: string, message: string, timestamp: string): LogEntry => ({
  lineNumber: 1,
  format: 'nginx-error',
  level,
  message,
  timestamp,
  raw: message,
  metadata: {},
});

describe('NginxProblemAggregator', () => {
  it('counts a message only once when patterns overlap', () => {
    const aggregator = new NginxProblemAggregator();
    aggregator.add(
      makeEntry(
        'error',
        'open() "/index.html" failed (13: Permission denied)',
        '2026-11-13T08:15:00',
      ),
    );

    expect(aggregator.result()).toMatchObject([
      { id: 'permission-denied', count: 1, levelCounts: { error: 1 } },
    ]);
  });

  it('tracks pattern time limits regardless of entry order', () => {
    const aggregator = new NginxProblemAggregator();
    aggregator.add(makeEntry('error', 'connect() failed', '2026-11-13T08:30:00'));
    aggregator.add(makeEntry('warn', 'connect() failed', '2026-11-13T08:10:00'));

    expect(aggregator.result()[0]).toMatchObject({
      id: 'connection-failed',
      count: 2,
      firstSeen: '2026-11-13T08:10:00',
      lastSeen: '2026-11-13T08:30:00',
      levelCounts: { error: 1, warn: 1 },
    });
  });

  it('counts the full file even when only one entry is retained', async () => {
    const content = [
      makeLine('error', 'connect() failed', 0),
      makeLine('notice', 'start worker process 21', 1),
      makeLine('error', 'connect() failed', 2),
      makeLine('crit', 'open() "/etc/nginx.conf" failed', 3),
    ].join('\n');

    const result = await processLogFile(new Blob([content]), {
      maxStoredEntries: 1,
    });

    expect(result.entries).toHaveLength(1);
    expect(result.parsedLines).toBe(4);
    expect(result.truncatedEntries).toBe(true);
    expect(result.nginxProblems).toMatchObject([
      { id: 'connection-failed', count: 2 },
      { id: 'open-failed', count: 1 },
    ]);
  });

  it('keeps empty problem results for informative-only logs', async () => {
    const content = [
      makeLine('notice', 'start worker processes', 0),
      makeLine('info', 'client connected', 1),
    ].join('\n');

    const result = await processLogFile(new Blob([content]));

    expect(result.nginxProblems).toEqual([]);
    expect(result.parsedLines).toBe(2);
  });
});
