import type { LogEntry } from '../parsers/types';

/**
 * Catálogo cerrado y determinista de incidencias de Nginx.
 * El orden es importante: una entrada puede coincidir con varios patrones
 * (p. ej. open() failed + Permission denied), pero se clasifica una sola vez.
 * Conservamos el mismo orden y expresiones que la tarjeta anterior.
 */
export const NGINX_PROBLEM_PATTERNS = [
  { id: 'upstream-timeout', label: 'upstream timed out', test: /upstream timed out/i },
  { id: 'connection-failed', label: 'connect() failed', test: /connect\(\) failed/i },
  { id: 'permission-denied', label: 'permission denied', test: /permission denied/i },
  { id: 'no-live-upstreams', label: 'no live upstreams', test: /no live upstreams/i },
  { id: 'open-failed', label: 'open() failed', test: /open\(\).*failed/i },
  { id: 'recv-failed', label: 'recv() failed', test: /recv\(\).*failed/i },
  {
    id: 'ssl-handshake-failed',
    label: 'SSL_do_handshake() failed',
    test: /SSL_do_handshake\(\) failed/i,
  },
  {
    id: 'body-too-large',
    label: 'client intended to send too large body',
    test: /client intended to send too large body/i,
  },
] as const;

export type NginxProblemId = (typeof NGINX_PROBLEM_PATTERNS)[number]['id'];

/** Estadísticas por patrón: tamaño acotado al número fijo de patrones. */
export interface NginxProblemSummary {
  id: NginxProblemId;
  count: number;
  firstSeen: string | null;
  lastSeen: string | null;
  levelCounts: Record<string, number>;
  exampleMessage: string;
}

export class NginxProblemAggregator {
  private readonly counts = new Map<NginxProblemId, NginxProblemSummary>();

  add(entry: LogEntry): void {
    const pattern = NGINX_PROBLEM_PATTERNS.find(({ test }) => test.test(entry.message));

    if (!pattern) return;

    const current = this.counts.get(pattern.id);

    if (!current) {
      this.counts.set(pattern.id, {
        id: pattern.id,
        count: 1,
        firstSeen: entry.timestamp,
        lastSeen: entry.timestamp,
        levelCounts: { [entry.level]: 1 },
        exampleMessage: entry.message.slice(0, 500),
      });
      return;
    }

    current.count++;
    current.levelCounts[entry.level] = (current.levelCounts[entry.level] ?? 0) + 1;

    if (entry.timestamp !== null) {
      if (current.firstSeen === null || entry.timestamp < current.firstSeen) {
        current.firstSeen = entry.timestamp;
      }
      if (current.lastSeen === null || entry.timestamp > current.lastSeen) {
        current.lastSeen = entry.timestamp;
      }
    }
  }

  result(): NginxProblemSummary[] {
    return [...this.counts.values()]
      .map((item) => ({ ...item, levelCounts: { ...item.levelCounts } }))
      .sort((a, b) => b.count - a.count);
  }
}

/** Compatibilidad para resultados previos o tests que no traigan nginxProblems. */
export function aggregateRetainedNginxProblems(
  entries: readonly LogEntry[],
): NginxProblemSummary[] {
  const aggregator = new NginxProblemAggregator();
  for (const entry of entries) aggregator.add(entry);
  return aggregator.result();
}
