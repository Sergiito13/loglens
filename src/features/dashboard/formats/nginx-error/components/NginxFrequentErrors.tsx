import { useMemo, useState } from 'react';

import {
  NGINX_PROBLEM_PATTERNS,
  aggregateRetainedNginxProblems,
} from '../../../../../core/logs/analysis/nginxProblemPatterns';
import type {
  NginxProblemId,
  NginxProblemSummary,
} from '../../../../../core/logs/analysis/nginxProblemPatterns';
import type { LogProcessingResult } from '../../../../../core/logs/processing/types';

import { NginxProblemDialog } from './NginxProblemDialog';

const nf = new Intl.NumberFormat('es-ES');

interface Props {
  result: LogProcessingResult;
  onExplore: (problem: NginxProblemSummary) => void;
}

/** Mantiene el listado con el contador rosa a la derecha. */
export function NginxFrequentErrors({ result, onExplore }: Props) {
  const complete = result.nginxProblems !== undefined;
  const [selectedId, setSelectedId] = useState<NginxProblemId | null>(null);

  const frequent = useMemo(() => {
    const items = result.nginxProblems ?? aggregateRetainedNginxProblems(result.entries);
    return items.slice(0, 6).map((item) => ({
      ...item,
      name: NGINX_PROBLEM_PATTERNS.find((pattern) => pattern.id === item.id)?.label ?? item.id,
    }));
  }, [result.entries, result.nginxProblems]);

  const selected = selectedId ? (frequent.find((item) => item.id === selectedId) ?? null) : null;

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
      {frequent.length ? (
        <div className="ll-nginx-frequent-list">
          {frequent.map(({ id, name, count }) => (
            <button
              key={id}
              type="button"
              className="ll-nginx-frequent-item"
              aria-haspopup="dialog"
              aria-label={`Investigar ${name}: ${nf.format(count)} coincidencias`}
              title={`Investigar ${name}`}
              onClick={() => setSelectedId(id)}
            >
              <code>{name}</code>
              <strong>{nf.format(count)}</strong>
            </button>
          ))}
        </div>
      ) : (
        <p className="ll-dash-muted">
          No se encontraron coincidencias con los patrones disponibles.
        </p>
      )}
      {!complete && result.truncatedEntries && (
        <p className="ll-nginx-chart-note">
          Los recuentos corresponden a los registros conservados, no a todo el archivo.
        </p>
      )}
      {selected && (
        <NginxProblemDialog
          problem={selected}
          totalRecords={complete ? result.parsedLines : result.entries.length}
          complete={complete || !result.truncatedEntries}
          onClose={() => setSelectedId(null)}
          onExplore={() => {
            setSelectedId(null);
            onExplore(selected);
          }}
        />
      )}
    </section>
  );
}
