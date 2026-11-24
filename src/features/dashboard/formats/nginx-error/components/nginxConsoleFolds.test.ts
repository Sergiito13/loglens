import { describe, expect, it } from 'vitest';

import type { LogEntry } from '../../../../../core/logs/parsers/types';
import { buildNginxConsolePage } from './nginxConsoleFolds';

const entry = (lineNumber: number): LogEntry => ({
  lineNumber,
  format: 'nginx-error',
  timestamp: '2026-11-24T09:00:00',
  level: 'notice',
  message: `line ${lineNumber}`,
  raw: `line ${lineNumber}`,
  metadata: {},
});

describe('buildNginxConsolePage', () => {
  it('preserves matching rows and folds intervening context', () => {
    const blocks = buildNginxConsolePage([1, 2, 3, 4, 5, 6].map(entry), [1, 4], 1);
    expect(blocks.map((item) => item.kind)).toEqual(['gap', 'match', 'gap', 'match', 'gap']);
    expect(blocks.filter((item) => item.kind === 'gap').map((item) => item.entries.length)).toEqual(
      [1, 2, 1],
    );
    expect(
      blocks.filter((item) => item.kind === 'match').map((item) => item.entry.lineNumber),
    ).toEqual([2, 5]);
  });

  it('keeps chronological context on consecutive pages without duplicating records', () => {
    const entries = [1, 2, 3, 4, 5, 6, 7, 8].map(entry);
    const matches = [1, 4, 6];
    const first = buildNginxConsolePage(entries, matches, 1, 2);
    const second = buildNginxConsolePage(entries, matches, 2, 2);
    const flatten = (blocks: ReturnType<typeof buildNginxConsolePage>) =>
      blocks
        .flatMap((block) => (block.kind === 'gap' ? block.entries : [block.entry]))
        .map((item) => item.lineNumber);
    expect([...flatten(first), ...flatten(second)]).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('shows empty results when nothing matches', () => {
    expect(buildNginxConsolePage([entry(1)], [], 1)).toEqual([]);
  });

  it('preserves original line numbers with gaps from invalid records', () => {
    const blocks = buildNginxConsolePage([entry(3), entry(7), entry(9)], [1], 1);
    expect(blocks[0]).toMatchObject({ kind: 'gap', id: '3-3' });
    expect(blocks[2]).toMatchObject({ kind: 'gap', id: '9-9' });
  });
});
