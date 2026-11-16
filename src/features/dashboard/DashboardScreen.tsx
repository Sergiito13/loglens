import { useMemo, useState } from 'react';

import { AmbientBackground } from '../../components/ui/AmbientBackground';
import type { LogEntry } from '../../core/logs/parsers/types';
import type { LogProcessingResult } from '../../core/logs/processing/types';
import { formatFileSize } from '../../core/utils/formatFileSize';

import './DashboardScreen.css';

interface DashboardScreenProps {
  file: File;
  result: LogProcessingResult;
  onNewFile: () => void;
}

const nf = new Intl.NumberFormat('es-ES');

const severities = [
  { id: 'error', name: 'Errores', color: '#ee258f' },
  { id: 'warn', name: 'Advertencias', color: '#ff9850' },
  { id: 'critical', name: 'Críticos', color: '#b24bff' },
  { id: 'other', name: 'Otros', color: '#ffc448' },
] as const;

type Category = (typeof severities)[number]['id'];

function categorize(level: string): Category {
  if (level === 'error') return 'error';
  if (level === 'warn' || level === 'warning') return 'warn';
  if (['crit', 'alert', 'emerg', 'fatal'].includes(level)) return 'critical';
  return 'other';
}

function getCategories(result: LogProcessingResult) {
  const counts: Record<Category, number> = { error: 0, warn: 0, critical: 0, other: 0 };
  Object.entries(result.levelCounts).forEach(([level, count]) => {
    counts[categorize(level)] += count;
  });
  return counts;
}

function toUnzonedMilliseconds(timestamp: string | null): number | null {
  if (!timestamp) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(timestamp);
  if (!match) return null;
  // UTC arithmetic groups wall-clock timestamps without asserting their timezone.
  return Date.UTC(
    ...([+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6]] as [
      number,
      number,
      number,
      number,
      number,
      number,
    ]),
  );
}

function buildTimeline(entries: readonly LogEntry[]) {
  const dated = entries
    .map((entry) => ({
      ms: toUnzonedMilliseconds(entry.timestamp),
      category: categorize(entry.level),
    }))
    .filter((row): row is { ms: number; category: Category } => row.ms !== null);
  if (!dated.length) return null;
  const values = dated.map((row) => row.ms);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const bins = Array.from({ length: 24 }, () => ({ error: 0, warn: 0, critical: 0, other: 0 }));
  for (const row of dated) {
    const bucket = max === min ? 0 : Math.min(23, Math.floor(((row.ms - min) / (max - min)) * 24));
    bins[bucket][row.category]++;
  }
  return {
    bins,
    maxCount: Math.max(1, ...bins.flatMap((bin) => Object.values(bin))),
    from: entries.find((entry) => toUnzonedMilliseconds(entry.timestamp) === min)?.timestamp,
    to: entries.find((entry) => toUnzonedMilliseconds(entry.timestamp) === max)?.timestamp,
  };
}

function TrendChart({ entries }: { entries: readonly LogEntry[] }) {
  const timeline = useMemo(() => buildTimeline(entries), [entries]);
  if (!timeline)
    return <p className="ll-dash-muted">No hay marcas de tiempo válidas para representar.</p>;
  const { bins, maxCount, from, to } = timeline;
  const x = (i: number) => 28 + (i / 23) * 930;
  const y = (count: number) => 216 - (count / maxCount) * 168;
  const buildLine = (category: Category) =>
    bins
      .map((bin, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(bin[category]).toFixed(1)}`)
      .join(' ');
  const buildArea = (category: Category) => `${buildLine(category)} L ${x(23)} 216 L ${x(0)} 216 Z`;
  const label = (stamp: string | null | undefined) =>
    stamp ? stamp.slice(5, 16).replace('T', ' · ') : '';

  return (
    <>
      <div className="ll-dash-legend">
        {severities.map(({ id, name, color }) => (
          <span key={id}>
            <i style={{ background: color }} />
            {name}
          </span>
        ))}
      </div>
      <div
        className="ll-dash-chart"
        aria-label="Evolución temporal de eventos según los registros almacenados"
      >
        <svg
          viewBox="0 0 985 245"
          role="img"
          aria-label="Gráfico de áreas de eventos por severidad a lo largo del tiempo"
          preserveAspectRatio="none"
        >
          <defs>
            {severities.map(({ id, color }) => (
              <linearGradient id={`ll-area-${id}`} key={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {[0, 1, 2, 3, 4].map((n) => (
            <line
              key={n}
              x1="28"
              x2="958"
              y1={48 + n * 42}
              y2={48 + n * 42}
              stroke="#65709c"
              strokeOpacity="0.16"
              strokeDasharray="4 8"
            />
          ))}
          {severities.map(({ id, color }) => (
            <g key={id}>
              <path d={buildArea(id)} fill={`url(#ll-area-${id})`} />
              <path
                d={buildLine(id)}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          ))}
        </svg>
      </div>
      <div className="ll-dash-chart-labels">
        <span>{label(from)}</span>
        <span>{label(to)}</span>
      </div>
    </>
  );
}

export function DashboardScreen({ file, result, onNewFile }: DashboardScreenProps) {
  const [level, setLevel] = useState('all');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(25);
  const counts = useMemo(() => getCategories(result), [result]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('es');
    return result.entries.filter(
      (entry) =>
        (level === 'all' || entry.level === level) &&
        (!needle ||
          `${entry.message} ${entry.timestamp ?? ''} ${entry.level} ${entry.raw}`
            .toLocaleLowerCase('es')
            .includes(needle)),
    );
  }, [level, query, result.entries]);
  const levels = Object.keys(result.levelCounts).sort(
    (a, b) => result.levelCounts[b] - result.levelCounts[a],
  );
  const formatLabel = result.detection.name ?? result.format;

  return (
    <main className="ll-dash-page">
      <AmbientBackground />
      <div className="ll-dash-container">
        <header className="ll-dash-header">
          <div className="ll-dash-identity">
            <img src="/LogLens_loglens-horizontal.svg" alt="LogLens" />
            <span className="ll-dash-title-pill">Resultados del análisis</span>
          </div>
          <button type="button" className="ll-dash-new" onClick={onNewFile}>
            ＋ Importar otro archivo
          </button>
        </header>

        <section className="ll-dash-intro">
          <div>
            <p className="ll-dash-eyebrow">ANÁLISIS COMPLETADO</p>
            <h1>Resumen del archivo</h1>
            <p>
              Resultados calculados a partir del contenido del log, sin subir datos a ningún
              servidor.
            </p>
          </div>
          <div className="ll-dash-file">
            <strong>{file.name}</strong>
            <span>
              {formatFileSize(file.size)} <b>·</b> {formatLabel}
            </span>
          </div>
        </section>

        <section className="ll-dash-metrics" aria-label="Indicadores principales">
          <article>
            <span>LÍNEAS ANALIZADAS</span>
            <strong>{nf.format(result.totalNonEmptyLines)}</strong>
            <small>Contenido completo</small>
          </article>
          <article>
            <span>ERRORES</span>
            <strong>{nf.format(counts.error)}</strong>
            <small>Severidad error</small>
          </article>
          <article>
            <span>ADVERTENCIAS</span>
            <strong>{nf.format(counts.warn)}</strong>
            <small>Severidad warn / warning</small>
          </article>
          <article>
            <span>NO INTERPRETADAS</span>
            <strong>{nf.format(result.invalidLines)}</strong>
            <small>{nf.format(result.parsedLines)} entradas válidas</small>
          </article>
        </section>

        <section className="ll-dash-visuals">
          <article className="ll-dash-panel ll-dash-panel--chart">
            <div className="ll-dash-panel-heading">
              <div>
                <h2>Evolución de eventos</h2>
                <p>Distribución temporal por severidad</p>
              </div>
              <span className="ll-dash-mini-tag">Registros almacenados</span>
            </div>
            <TrendChart entries={result.entries} />
          </article>
          <article className="ll-dash-panel ll-dash-panel--levels">
            <div className="ll-dash-panel-heading">
              <div>
                <h2>Severidades</h2>
                <p>Recuento de todo el archivo</p>
              </div>
            </div>
            <div className="ll-dash-level-list">
              {severities.map(({ id, name, color }) => {
                const count = counts[id];
                const pct = result.parsedLines ? (count / result.parsedLines) * 100 : 0;
                return (
                  <div key={id} className="ll-dash-level">
                    <div>
                      <span>
                        <i style={{ background: color }} />
                        {name}
                      </span>
                      <strong>{nf.format(count)}</strong>
                    </div>
                    <div className="ll-dash-level__track">
                      <span style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <small>{pct.toFixed(1).replace('.', ',')} %</small>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <section className="ll-dash-panel ll-dash-table-panel">
          <div className="ll-dash-table-heading">
            <div>
              <h2>Registros interpretados</h2>
              <p>
                {nf.format(filtered.length)} coincidencias entre {nf.format(result.entries.length)}{' '}
                registros almacenados
              </p>
            </div>
            <div className="ll-dash-controls">
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleCount(25);
                }}
                placeholder="Buscar mensaje..."
                aria-label="Buscar entre los registros"
              />
              <select
                value={level}
                onChange={(event) => {
                  setLevel(event.target.value);
                  setVisibleCount(25);
                }}
                aria-label="Filtrar por severidad"
              >
                <option value="all">Todos los niveles</option>
                {levels.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="ll-dash-table-scroller">
            <table>
              <thead>
                <tr>
                  <th>FECHA Y HORA</th>
                  <th>NIVEL</th>
                  <th>MENSAJE</th>
                  <th>PROCESO</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, visibleCount).map((entry) => (
                  <tr key={`${entry.lineNumber}-${entry.raw}`}>
                    <td className="ll-dash-nowrap">{entry.timestamp?.replace('T', ' ') ?? '—'}</td>
                    <td>
                      <span
                        className={`ll-dash-severity ll-dash-severity--${categorize(entry.level)}`}
                      >
                        {entry.level}
                      </span>
                    </td>
                    <td className="ll-dash-message" title={entry.message}>
                      {entry.message}
                    </td>
                    <td>{entry.metadata.processId ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="ll-dash-empty">No se encontraron registros con estos filtros.</p>
            )}
          </div>
          {filtered.length > visibleCount && (
            <button
              type="button"
              className="ll-dash-showmore"
              onClick={() => setVisibleCount((count) => count + 25)}
            >
              Mostrar más registros
            </button>
          )}
          {(result.truncatedEntries || result.truncatedIssues) && (
            <p className="ll-dash-note">
              Se analizaron todas las líneas del archivo. Por motivos de memoria, la tabla y el
              gráfico muestran una muestra de los registros conservados (
              {nf.format(result.entries.length)}). Los contadores incluyen todo el archivo.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
