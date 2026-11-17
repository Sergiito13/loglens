import { useMemo, useState } from 'react';

import type { LogEntry } from '../../../../../core/logs/parsers/types';

import type { LogProcessingResult } from '../../../../../core/logs/processing/types';

const nf = new Intl.NumberFormat('es-ES');

function badge(level: string) {
  if (level === 'error') return 'error';

  if (level === 'warn') return 'warn';

  if (level === 'crit' || level === 'alert' || level === 'emerg') {
    return 'critical';
  }

  return 'other';
}

export function NginxErrorTable({ result }: { result: LogProcessingResult }) {
  const [search, setSearch] = useState('');

  const [level, setLevel] = useState('all');

  const [limit, setLimit] = useState(25);

  const [selected, setSelected] = useState<LogEntry | null>(null);

  const levels = useMemo(
    () =>
      Object.keys(result.levelCounts).sort((a, b) => result.levelCounts[b] - result.levelCounts[a]),
    [result.levelCounts],
  );

  const rows = useMemo(() => {
    const text = search.trim().toLocaleLowerCase('es');

    return result.entries.filter(
      (entry) =>
        (level === 'all' || entry.level === level) &&
        (!text ||
          `${entry.message} ${entry.raw} ${entry.timestamp ?? ''}`
            .toLocaleLowerCase('es')
            .includes(text)),
    );
  }, [result.entries, level, search]);

  return (
    <section className="ll-dash-panel ll-dash-table-panel">
      {/* CABECERA */}

      <div className="ll-dash-table-heading">
        <div>
          <h2>Explorador de registros</h2>

          <p>
            {nf.format(rows.length)} coincidencias entre {nf.format(result.entries.length)}{' '}
            registros conservados
          </p>
        </div>

        {/* FILTROS */}

        <div className="ll-dash-controls">
          <input
            type="search"
            value={search}
            placeholder="Buscar mensaje..."
            aria-label="Buscar registros"
            onChange={(event) => {
              setSearch(event.target.value);
              setLimit(25);
              setSelected(null);
            }}
          />

          <select
            aria-label="Filtrar por severidad"
            value={level}
            onChange={(event) => {
              setLevel(event.target.value);
              setLimit(25);
              setSelected(null);
            }}
          >
            <option value="all">Todas las severidades</option>

            {levels.map((item) => (
              <option key={item} value={item}>
                {item.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLA */}

      <div className="ll-dash-table-scroller">
        <table>
          <thead>
            <tr>
              <th>FECHA Y HORA</th>
              <th>NIVEL</th>
              <th>MENSAJE</th>
              <th>PID</th>
              <th>DETALLE</th>
            </tr>
          </thead>

          <tbody>
            {rows.slice(0, limit).map((entry) => (
              <tr key={entry.lineNumber}>
                <td className="ll-dash-nowrap">{entry.timestamp?.replace('T', ' ') ?? '—'}</td>

                <td>
                  <span className={`ll-dash-severity ll-dash-severity--${badge(entry.level)}`}>
                    {entry.level}
                  </span>
                </td>

                <td className="ll-dash-message">{entry.message}</td>

                <td>{entry.metadata.processId ?? '—'}</td>

                <td>
                  <button
                    type="button"
                    className="ll-nginx-detail-button"
                    onClick={() => setSelected(entry)}
                  >
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="ll-dash-empty">No se encontraron registros con estos filtros.</p>
        )}
      </div>

      {/* CARGAR MÁS */}

      {rows.length > limit && (
        <button
          type="button"
          className="ll-dash-showmore"
          onClick={() => setLimit((previous) => previous + 25)}
        >
          Mostrar más registros
        </button>
      )}

      {/* DETALLE DEL REGISTRO */}

      {selected && (
        <div
          className="ll-nginx-detail"
          role="region"
          aria-label="Detalle del registro seleccionado"
        >
          <div className="ll-nginx-detail-heading">
            <h3>Registro — línea {selected.lineNumber}</h3>

            <button
              type="button"
              className="ll-nginx-detail-button"
              onClick={() => setSelected(null)}
            >
              Cerrar
            </button>
          </div>

          <p>
            <strong>Fecha:</strong> {selected.timestamp?.replace('T', ' ') ?? '—'}
            {' · '}
            <strong>Nivel:</strong> {selected.level}
          </p>

          <p>
            <strong>PID:</strong> {selected.metadata.processId ?? '—'}
            {' · '}
            <strong>Hilo:</strong> {selected.metadata.threadId ?? '—'}
            {' · '}
            <strong>Conexión:</strong> {selected.metadata.connectionId ?? '—'}
          </p>

          <pre>{selected.raw}</pre>
        </div>
      )}

      {/* LÍMITE DE MEMORIA */}

      {(result.truncatedEntries || result.truncatedIssues) && (
        <p className="ll-dash-note">
          El archivo completo se procesó, pero la búsqueda y esta tabla solo incluyen{' '}
          {nf.format(result.entries.length)} registros conservados. Los indicadores y las
          severidades abarcan todo el archivo.
        </p>
      )}
    </section>
  );
}
