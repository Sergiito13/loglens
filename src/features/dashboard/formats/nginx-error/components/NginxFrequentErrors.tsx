import { useMemo } from 'react';

import type { LogEntry } from '../../../../../core/logs/parsers/types';

const nf = new Intl.NumberFormat('es-ES');

/**
 * Patrones conocidos de Nginx.
 * No modificamos los mensajes originales.
 */
const patterns = [
  {
    name: 'upstream timed out',
    test: /upstream timed out/i,
  },
  {
    name: 'connect() failed',
    test: /connect\(\) failed/i,
  },
  {
    name: 'permission denied',
    test: /permission denied/i,
  },
  {
    name: 'no live upstreams',
    test: /no live upstreams/i,
  },
  {
    name: 'open() failed',
    test: /open\(\).*failed/i,
  },
  {
    name: 'recv() failed',
    test: /recv\(\).*failed/i,
  },
  {
    name: 'SSL_do_handshake() failed',
    test: /SSL_do_handshake\(\) failed/i,
  },
  {
    name: 'client intended to send too large body',
    test: /client intended to send too large body/i,
  },
] as const;

interface NginxFrequentErrorsProps {
  entries: readonly LogEntry[];
  truncated: boolean;
}

export function NginxFrequentErrors({ entries, truncated }: NginxFrequentErrorsProps) {
  const frequent = useMemo(() => {
    const counts = new Map<string, number>();

    for (const entry of entries) {
      const pattern = patterns.find(({ test }) => test.test(entry.message));

      if (pattern) {
        counts.set(pattern.name, (counts.get(pattern.name) ?? 0) + 1);
      }
    }

    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [entries]);

  return (
    <section className="ll-dash-panel ll-nginx-frequent">
      <div className="ll-dash-panel-heading">
        <div>
          <h2>Problemas frecuentes</h2>

          <p>Coincidencias con patrones conocidos de Nginx en los registros conservados</p>
        </div>
      </div>

      {frequent.length === 0 ? (
        <p className="ll-dash-muted">
          No se detectaron coincidencias con los patrones disponibles.
        </p>
      ) : (
        <div className="ll-nginx-frequent-list">
          {frequent.map(([name, count]) => (
            <div className="ll-nginx-frequent-item" key={name}>
              <code>{name}</code>

              <strong>{nf.format(count)}</strong>
            </div>
          ))}
        </div>
      )}

      {truncated && (
        <p className="ll-nginx-chart-note">
          Estos recuentos corresponden a los registros conservados, no a todo el archivo.
        </p>
      )}
    </section>
  );
}
