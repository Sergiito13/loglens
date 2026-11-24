import type { LogEntry } from '../../../../../core/logs/parsers/types';

/** Each page displays up to PAGE_SIZE matching events; context rows are folded. */
export const CONSOLE_PAGE_SIZE = 40;

export type NginxConsoleBlock =
  { kind: 'match'; entry: LogEntry } | { kind: 'gap'; id: string; entries: readonly LogEntry[] };

/**
 * Build a chronological log excerpt while keeping NON-matching records folded.
 * Every retained record belongs to exactly one page, including the gaps.
 * Original line numbers are preserved even if parsing discarded invalid lines.
 */
export function buildNginxConsolePage(
  entries: readonly LogEntry[],
  matchIndices: readonly number[],
  page: number,
  pageSize = CONSOLE_PAGE_SIZE,
): NginxConsoleBlock[] {
  if (matchIndices.length === 0) return [];

  const pages = Math.ceil(matchIndices.length / pageSize);
  const currentPage = Math.min(Math.max(1, page), pages);
  const startMatch = (currentPage - 1) * pageSize;
  const endMatch = Math.min(startMatch + pageSize, matchIndices.length);
  const startIndex = startMatch === 0 ? 0 : matchIndices[startMatch - 1] + 1;
  const endIndex =
    endMatch === matchIndices.length ? entries.length : matchIndices[endMatch - 1] + 1;
  const blocks: NginxConsoleBlock[] = [];

  const addGap = (from: number, to: number) => {
    if (to <= from) return;
    const first = entries[from];
    const last = entries[to - 1];
    blocks.push({
      kind: 'gap',
      id: `${first.lineNumber}-${last.lineNumber}`,
      entries: entries.slice(from, to),
    });
  };

  let cursor = startIndex;
  for (let i = startMatch; i < endMatch; i++) {
    const matchIndex = matchIndices[i];
    addGap(cursor, matchIndex);
    blocks.push({ kind: 'match', entry: entries[matchIndex] });
    cursor = matchIndex + 1;
  }
  addGap(cursor, endIndex);
  return blocks;
}
