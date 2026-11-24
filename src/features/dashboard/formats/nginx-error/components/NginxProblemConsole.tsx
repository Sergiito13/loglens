import { useEffect, useMemo, useRef, useState } from 'react';

import { AmbientBackground } from '../../../../../components/ui/AmbientBackground';
import { NGINX_PROBLEM_PATTERNS } from '../../../../../core/logs/analysis/nginxProblemPatterns';
import type { NginxProblemSummary } from '../../../../../core/logs/analysis/nginxProblemPatterns';
import type { LogEntry } from '../../../../../core/logs/parsers/types';
import type { LogProcessingResult } from '../../../../../core/logs/processing/types';

import { NginxCopyButton } from './NginxCopyButton';
import { buildNginxConsolePage, CONSOLE_PAGE_SIZE } from './nginxConsoleFolds';
import './NginxProblemConsole.css';

const nf = new Intl.NumberFormat('es-ES');
const EXPAND_STEP = 80;

type LineKind = 'match' | 'context';

interface Props {
  result: LogProcessingResult;
  problem: NginxProblemSummary;
  onBack: () => void;
}

function highlightPattern(entry: LogEntry, regex: RegExp | undefined) {
  if (!regex) return entry.raw;
  const match = regex.exec(entry.raw);
  if (!match || match[0].length === 0) return entry.raw;

  return (
    <>
      {entry.raw.slice(0, match.index)}
      <mark>{match[0]}</mark>
      {entry.raw.slice(match.index + match[0].length)}
    </>
  );
}

function LogLine({ entry, kind, pattern }: { entry: LogEntry; kind: LineKind; pattern?: RegExp }) {
  return (
    <div className={`ll-console__line ll-console__line--${kind}`} data-level={entry.level}>
      <span className="ll-console__line-number" title={`Línea original ${entry.lineNumber}`}>
        {nf.format(entry.lineNumber)}
      </span>
      <span className="ll-console__line-meta">
        <time>{entry.timestamp?.replace('T', ' ') ?? 'Sin fecha'}</time>
        <span className="ll-console__severity" data-level={entry.level}>
          {entry.level.toUpperCase()}
        </span>
      </span>
      <span className="ll-console__line-code">
        <code>{kind === 'match' ? highlightPattern(entry, pattern) : entry.raw}</code>
        <NginxCopyButton value={entry.raw} compact label={`Copiar línea ${entry.lineNumber}`} />
      </span>
    </div>
  );
}

/**
 * Solo lectura. Fase actual: líneas conservadas en memoria (hasta 10.000).
 * Se muestran coincidencias y se pueden desplegar bloques del contexto real.
 */
export function NginxProblemConsole({ result, problem, onBack }: Props) {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Record<string, number>>({});
  const panelRef = useRef<HTMLElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const pattern = NGINX_PROBLEM_PATTERNS.find((candidate) => candidate.id === problem.id);
  const name = pattern?.label ?? problem.id;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onBack();
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [onBack]);

  const matchingIndices = useMemo(() => {
    const indices: number[] = [];
    const query = search.trim().toLocaleLowerCase('es');

    result.entries.forEach((entry, index) => {
      // Clasificación idéntica a la del agregador: gana el primer patrón.
      const firstPattern = NGINX_PROBLEM_PATTERNS.find(({ test }) => test.test(entry.message));
      if (firstPattern?.id !== problem.id) return;
      if (level !== 'all' && entry.level !== level) return;
      if (query && !entry.raw.toLocaleLowerCase('es').includes(query)) return;
      indices.push(index);
    });
    return indices;
  }, [result.entries, problem.id, level, search]);

  const severities = useMemo(
    () =>
      Object.entries(problem.levelCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([severity]) => severity),
    [problem.levelCounts],
  );

  const totalPages = Math.max(1, Math.ceil(matchingIndices.length / CONSOLE_PAGE_SIZE));
  const blocks = useMemo(
    () => buildNginxConsolePage(result.entries, matchingIndices, page),
    [result.entries, matchingIndices, page],
  );

  const changePage = (next: number) => {
    setPage(Math.min(totalPages, Math.max(1, next)));
    setExpanded({});
    editorRef.current?.scrollTo({ top: 0 });
  };

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    setExpanded({});
  };

  const changeLevel = (value: string) => {
    setLevel(value);
    setPage(1);
    setExpanded({});
  };

  const toggleGap = (id: string, total: number) => {
    setExpanded((previous) => ({
      ...previous,
      [id]: previous[id] ? 0 : Math.min(EXPAND_STEP, total),
    }));
  };

  return (
    <section
      ref={panelRef}
      className="ll-console"
      role="dialog"
      aria-modal="true"
      aria-label={`Explorador de registros: ${name}`}
      tabIndex={-1}
    >
      <AmbientBackground />
      <div className="ll-console__content">
        <header className="ll-console__header">
          <div className="ll-console__heading">
            <button type="button" className="ll-console__back" onClick={onBack}>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m14 6-6 6 6 6M8 12h13" />
              </svg>
              Volver al dashboard
            </button>
            <h1>Explorador de registros</h1>
            <p>
              <code>{name}</code>
              <span aria-hidden="true">·</span>
              {nf.format(problem.count)} coincidencias{' '}
              {result.nginxProblems ? 'en el archivo completo' : 'en la muestra'}
            </p>
          </div>
          <span className="ll-console__readonly">
            SOLO LECTURA <span aria-hidden="true">·</span> LOCAL
          </span>
        </header>

        <div className="ll-console__notice" role="note">
          <strong>Contexto del archivo:</strong> los eventos destacados son coincidencias de{' '}
          <code>{name}</code>. Los demás registros conservados aparecen agrupados y puedes
          desplegarlos.
          {result.truncatedEntries && (
            <span>
              {' '}
              Esta versión solo consulta {nf.format(result.entries.length)} registros conservados de{' '}
              {nf.format(result.parsedLines)} válidos; las coincidencias globales no están todavía
              disponibles para lectura paginada.
            </span>
          )}
        </div>

        <div className="ll-console__toolbar">
          <label className="ll-console__search">
            <span>Buscar dentro del problema</span>
            <input
              type="search"
              placeholder="Filtrar por IP, ruta, mensaje..."
              value={search}
              onChange={(event) => changeSearch(event.target.value)}
            />
          </label>
          <label className="ll-console__filter">
            <span>Severidad</span>
            <select value={level} onChange={(event) => changeLevel(event.target.value)}>
              <option value="all">Todas</option>
              {severities.map((severity) => (
                <option value={severity} key={severity}>
                  {severity.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <div className="ll-console__matches" aria-live="polite">
            <strong>{nf.format(matchingIndices.length)}</strong> coincidencias en la muestra
          </div>
        </div>

        <div
          className="ll-console__editor"
          ref={editorRef}
          aria-label="Vista de logs con contexto plegable"
        >
          <div className="ll-console__editor-head">
            <span>LÍNEA</span>
            <span>FECHA / NIVEL</span>
            <span>REGISTRO ORIGINAL</span>
          </div>

          {blocks.map((block) => {
            if (block.kind === 'match') {
              return (
                <LogLine
                  key={block.entry.lineNumber}
                  entry={block.entry}
                  kind="match"
                  pattern={pattern?.test}
                />
              );
            }

            const total = block.entries.length;
            const visibleCount = expanded[block.id] ?? 0;
            const first = block.entries[0].lineNumber;
            const last = block.entries[total - 1].lineNumber;

            return (
              <div className="ll-console__fold-group" key={block.id}>
                <button
                  type="button"
                  className="ll-console__fold-toggle"
                  onClick={() => toggleGap(block.id, total)}
                  aria-expanded={visibleCount > 0}
                  title={visibleCount > 0 ? 'Ocultar contexto' : 'Mostrar líneas de contexto'}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={visibleCount > 0 ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
                  </svg>
                  <span className="ll-console__fold-rule" />
                  <span>
                    {visibleCount > 0
                      ? 'Ocultar contexto'
                      : `Mostrar ${nf.format(total)} ${total === 1 ? 'registro' : 'registros'} de contexto`}
                    <small>
                      {' '}
                      · líneas {nf.format(first)}–{nf.format(last)}
                    </small>
                  </span>
                  <span className="ll-console__fold-rule" />
                </button>
                {visibleCount > 0 && (
                  <>
                    {block.entries.slice(0, visibleCount).map((entry) => (
                      <LogLine key={entry.lineNumber} entry={entry} kind="context" />
                    ))}
                    {visibleCount < total && (
                      <button
                        type="button"
                        className="ll-console__more-context"
                        onClick={() =>
                          setExpanded((previous) => ({
                            ...previous,
                            [block.id]: Math.min(total, visibleCount + EXPAND_STEP),
                          }))
                        }
                      >
                        Mostrar {nf.format(Math.min(EXPAND_STEP, total - visibleCount))} registros
                        más
                        <span>({nf.format(total - visibleCount)} pendientes)</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {blocks.length === 0 && (
            <div className="ll-console__empty">
              No hay coincidencias de este patrón con los filtros seleccionados entre los registros
              conservados.
            </div>
          )}
        </div>

        <footer className="ll-console__footer">
          <span>
            Página <strong>{nf.format(page)}</strong> de <strong>{nf.format(totalPages)}</strong>
            <span className="ll-console__footer-divider"> · </span>
            {nf.format(matchingIndices.length)} coincidencias en la muestra
          </span>
          <div className="ll-console__pager">
            <button type="button" disabled={page <= 1} onClick={() => changePage(page - 1)}>
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => changePage(page + 1)}
            >
              Siguiente
            </button>
          </div>
        </footer>
      </div>
    </section>
  );
}
