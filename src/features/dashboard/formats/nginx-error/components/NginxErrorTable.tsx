import { useMemo, useState } from 'react';

import type { LogEntry } from '../../../../../core/logs/parsers/types';

import type { LogProcessingResult } from '../../../../../core/logs/processing/types';

/* ==========================================================
   TYPES
========================================================== */

interface NginxErrorTableProps {
  result: LogProcessingResult;

  selectedSeverities: readonly string[];

  onSelectSeverity: (severity: string) => void;

  onClearSeverityFilters: () => void;
}

/* ==========================================================
   FORMATTER
========================================================== */

const nf = new Intl.NumberFormat('es-ES');

/* ==========================================================
   BADGE
========================================================== */

function badge(level: string) {
  if (level === 'error') return 'error';

  if (level === 'warn') return 'warn';

  if (level === 'crit' || level === 'alert' || level === 'emerg') {
    return 'critical';
  }

  return 'other';
}

/* ==========================================================
   COMPONENT
========================================================== */

export function NginxErrorTable({
  result,
  selectedSeverities,
  onSelectSeverity,
  onClearSeverityFilters,
}: NginxErrorTableProps) {
  const [search, setSearch] = useState('');

  const [limit, setLimit] = useState(25);

  const [selected, setSelected] = useState<LogEntry | null>(null);

  /* ========================================================
     AVAILABLE LEVELS
  ======================================================== */

  const levels = useMemo(() => {
    return Object.keys(result.levelCounts)
      .filter((level) => result.levelCounts[level] > 0)
      .sort((a, b) => result.levelCounts[b] - result.levelCounts[a]);
  }, [result.levelCounts]);

  /* ========================================================
     FILTERED ROWS
  ======================================================== */

  const rows = useMemo(() => {
    const text = search.trim().toLocaleLowerCase('es');

    const activeLevels = new Set(selectedSeverities);

    return result.entries.filter((entry) => {
      const matchesSeverity = activeLevels.size === 0 || activeLevels.has(entry.level);

      const matchesText =
        !text ||
        `${entry.message} ${entry.raw} ${entry.timestamp ?? ''}`
          .toLocaleLowerCase('es')
          .includes(text);

      return matchesSeverity && matchesText;
    });
  }, [result.entries, selectedSeverities, search]);

  /* ========================================================
     SELECT VALUE
  ======================================================== */

  const selectValue =
    selectedSeverities.length === 0
      ? 'all'
      : selectedSeverities.length === 1
        ? selectedSeverities[0]
        : 'multiple';

  /* ========================================================
     FULL FILE SELECTED COUNT
  ======================================================== */

  const selectedTotal =
    selectedSeverities.length === 0
      ? result.parsedLines
      : selectedSeverities.reduce(
          (total, severity) => total + (result.levelCounts[severity] ?? 0),
          0,
        );

  /* ========================================================
     SELECTED ROW DETAILS
  ======================================================== */

  const visibleSelected =
    selected !== null && rows.some((entry) => entry.lineNumber === selected.lineNumber)
      ? selected
      : null;

  /* ========================================================
     RENDER
  ======================================================== */

  return (
    <section className="ll-dash-panel ll-dash-table-panel" id="ll-nginx-records">
      {/* HEADER */}

      <div className="ll-dash-table-heading">
        <div>
          <h2>Explorador de registros</h2>

          <p>
            {nf.format(rows.length)} coincidencias entre {nf.format(result.entries.length)}{' '}
            registros conservados
          </p>
        </div>

        {/* FILTERS */}

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
            value={selectValue}
            onChange={(event) => {
              const value = event.target.value;

              if (value === 'all') {
                onClearSeverityFilters();
              } else {
                onSelectSeverity(value);
              }

              setLimit(25);
              setSelected(null);
            }}
          >
            <option value="all">Todas las severidades</option>

            {selectedSeverities.length > 1 && (
              <option value="multiple" disabled>
                {selectedSeverities.length} severidades seleccionadas
              </option>
            )}

            {levels.map((level) => (
              <option key={level} value={level}>
                {level.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ACTIVE FILTER INFORMATION */}

      {selectedSeverities.length > 0 && (
        <div className="ll-nginx-table-active-filter">
          <span>
            Filtrando:{' '}
            <strong>{selectedSeverities.map((level) => level.toUpperCase()).join(' + ')}</strong>
          </span>

          <span>{nf.format(selectedTotal)} eventos en el archivo completo</span>

          <button type="button" onClick={onClearSeverityFilters}>
            Limpiar filtros
          </button>
        </div>
      )}

      {/* TABLE */}

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

      {/* LOAD MORE */}

      {rows.length > limit && (
        <button
          type="button"
          className="ll-dash-showmore"
          onClick={() => setLimit((previous) => previous + 25)}
        >
          Mostrar más registros
        </button>
      )}

      {/* RECORD DETAILS */}

      {visibleSelected && (
        <div
          className="ll-nginx-detail"
          role="region"
          aria-label="Detalle del registro seleccionado"
        >
          <div className="ll-nginx-detail-heading">
            <h3>Registro — línea {visibleSelected.lineNumber}</h3>

            <button
              type="button"
              className="ll-nginx-detail-button"
              onClick={() => setSelected(null)}
            >
              Cerrar
            </button>
          </div>

          <p>
            <strong>Fecha:</strong> {visibleSelected.timestamp?.replace('T', ' ') ?? '—'}
            {' · '}
            <strong>Nivel:</strong> {visibleSelected.level}
          </p>

          <p>
            <strong>PID:</strong> {visibleSelected.metadata.processId ?? '—'}
            {' · '}
            <strong>Hilo:</strong> {visibleSelected.metadata.threadId ?? '—'}
            {' · '}
            <strong>Conexión:</strong> {visibleSelected.metadata.connectionId ?? '—'}
          </p>

          <pre>{visibleSelected.raw}</pre>
        </div>
      )}

      {/* RETENTION LIMIT */}

      {(result.truncatedEntries || result.truncatedIssues) && (
        <p className="ll-dash-note">
          El archivo completo se procesó, pero la búsqueda y los filtros de esta tabla solo incluyen{' '}
          {nf.format(result.entries.length)} registros conservados. Los contadores y el gráfico de
          severidades representan el archivo completo.
        </p>
      )}
    </section>
  );
}
