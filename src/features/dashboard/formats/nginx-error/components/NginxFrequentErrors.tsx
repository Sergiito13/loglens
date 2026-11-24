import { useMemo } from 'react';

import {
  NGINX_PROBLEM_PATTERNS,
  aggregateRetainedNginxProblems,
} from '../../../../../core/logs/analysis/nginxProblemPatterns';
import type { LogProcessingResult } from '../../../../../core/logs/processing/types';

const nf = new Intl.NumberFormat('es-ES');

interface NginxFrequentErrorsProps {
  result: LogProcessingResult;
}

/**
 * Mantiene el diseño original de LogLens, pero usa coincidencias de TODO
 * el archivo calculadas en el Worker, no solo las 10.000 entradas retenidas.
 */
export function NginxFrequentErrors({ result }: NginxFrequentErrorsProps) {
  const complete = result.nginxProblems !== undefined;

  const frequent = useMemo(() => {
    const items = result.nginxProblems ?? aggregateRetainedNginxProblems(result.entries);
    return items.slice(0, 6).map((item) => ({
      ...item,
      name: NGINX_PROBLEM_PATTERNS.find((pattern) => pattern.id === item.id)?.label ?? item.id,
    }));
  }, [result.entries, result.nginxProblems]);

  return (
    <section className="ll-dash-panel ll-nginx-frequent">
      <div className="ll-dash-panel-heading">
        <div>
          <h2>Problemas frecuentes</h2>
          <p>
            Coincidencias con patrones conocidos de Nginx en{' '}
            {complete ? 'el archivo completo' : 'los registros conservados'}
          </p>
        </div>
      </div>

      {frequent.length === 0 ? (
        <p className="ll-dash-muted">
          No se encontraron coincidencias con los patrones disponibles.
        </p>
      ) : (
        <div className="ll-nginx-frequent-list">
          {frequent.map(({ id, name, count }) => (
            <div className="ll-nginx-frequent-item" key={id}>
              <code>{name}</code>
              <strong>{nf.format(count)}</strong>
            </div>
          ))}
        </div>
      )}

      {!complete && result.truncatedEntries && (
        <p className="ll-nginx-chart-note">
          Estos recuentos corresponden a los registros conservados, no a todo el archivo.
        </p>
      )}
    </section>
  );
}
