import { useEffect, useRef } from 'react';

import { NGINX_PROBLEM_GUIDES } from '../../../../../core/logs/analysis/nginxProblemGuides';
import type { NginxProblemSummary } from '../../../../../core/logs/analysis/nginxProblemPatterns';

import { NginxCopyButton } from './NginxCopyButton';
import './NginxProblemDialog.css';

const numberFormat = new Intl.NumberFormat('es-ES');
const percentageFormat = new Intl.NumberFormat('es-ES', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

interface Props {
  problem: NginxProblemSummary;
  totalRecords: number;
  complete: boolean;
  onClose: () => void;
  onExplore: () => void;
}

function formatTime(time: string | null): string {
  return time?.replace('T', ' ') ?? 'Sin fecha';
}

export function NginxProblemDialog({ problem, totalRecords, complete, onClose, onExplore }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const guide = NGINX_PROBLEM_GUIDES[problem.id];
  const severityEntries = Object.entries(problem.levelCounts).sort((a, b) => b[1] - a[1]);
  const mainSeverity = severityEntries[0]?.[0] ?? '—';
  const percentage = totalRecords ? problem.count / totalRecords : 0;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="ll-problem-dialog"
      aria-labelledby="ll-problem-dialog-title"
      aria-describedby="ll-problem-dialog-summary"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const b = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < b.left ||
          event.clientX > b.right ||
          event.clientY < b.top ||
          event.clientY > b.bottom
        )
          onClose();
      }}
    >
      <header className="ll-problem-dialog__header">
        <div className="ll-problem-dialog__heading">
          <span className="ll-problem-dialog__alert" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m12 3 10 18H2L12 3Z" />
              <path d="M12 9v5" />
              <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <div>
            <div className="ll-problem-dialog__titleline">
              <h2 id="ll-problem-dialog-title">{guide.title}</h2>
              <span className="ll-problem-dialog__level">{mainSeverity.toUpperCase()}</span>
            </div>
            <p id="ll-problem-dialog-summary">{guide.summary}</p>
          </div>
        </div>
        <button
          type="button"
          className="ll-problem-dialog__close"
          onClick={onClose}
          aria-label="Cerrar diagnóstico"
          title="Cerrar diagnóstico"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          >
            <path d="M6 6 18 18M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div className="ll-problem-dialog__layout">
        <div className="ll-problem-dialog__content">
          <section>
            <div className="ll-problem-dialog__section-heading">
              <span className="ll-problem-dialog__section-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5M12 8h.01" />
                </svg>
              </span>
              <h3>Descripción</h3>
            </div>
            <div className="ll-problem-dialog__section-body">
              <p>{guide.description}</p>
            </div>
          </section>
          <section>
            <div className="ll-problem-dialog__section-heading">
              <span className="ll-problem-dialog__section-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path
                    d="M10 3.5 8.8 5.7l-2.4.4-1.2-1.3-2 2 1.3 1.2-.4 2.4L2 11.6v2.8l2.1 1.2.4 2.4-1.3 1.2 2 2 1.2-1.3 2.4.4 1.2 2.2h2.8l1.2-2.2 2.4-.4 1.2 1.3 2-2-1.3-1.2.4-2.4 2.1-1.2v-2.8l-2.1-1.2-.4-2.4 1.3-1.2-2-2-1.2 1.3-2.4-.4L12.8 3.5Z"
                    transform="translate(1.5 -1.5) scale(.88)"
                  />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </span>
              <h3>Posibles causas</h3>
            </div>
            <div className="ll-problem-dialog__section-body">
              <ul>
                {guide.possibleCauses.map((cause) => (
                  <li key={cause}>{cause}</li>
                ))}
              </ul>
            </div>
          </section>
          <section>
            <div className="ll-problem-dialog__section-heading">
              <span className="ll-problem-dialog__section-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="5" y="3" width="14" height="18" rx="2" />
                  <path d="m8 10 2 2 4-4M8 16h8" />
                </svg>
              </span>
              <h3>Qué comprobar</h3>
            </div>
            <div className="ll-problem-dialog__section-body">
              <ul>
                {guide.checks.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <aside className="ll-problem-dialog__stats" aria-label="Estadísticas del patrón">
          <span className="ll-problem-dialog__stat-label">Coincidencias</span>
          <strong className="ll-problem-dialog__count">{numberFormat.format(problem.count)}</strong>
          <span className="ll-problem-dialog__source">
            {complete ? 'Archivo completo' : 'Registros conservados'}
          </span>
          <div className="ll-problem-dialog__stat-divider" />
          <span className="ll-problem-dialog__stat-label">De los registros válidos</span>
          <strong>{percentageFormat.format(percentage)}</strong>
          <div className="ll-problem-dialog__stat-divider" />
          <span className="ll-problem-dialog__stat-label">Primera aparición</span>
          <span className="ll-problem-dialog__time">{formatTime(problem.firstSeen)}</span>
          <span className="ll-problem-dialog__stat-label">Última aparición</span>
          <span className="ll-problem-dialog__time">{formatTime(problem.lastSeen)}</span>
          <div className="ll-problem-dialog__stat-divider" />
          <span className="ll-problem-dialog__stat-label">Niveles registrados</span>
          <div className="ll-problem-dialog__levels">
            {severityEntries.map(([level, count]) => (
              <span key={level}>
                <small>{level.toUpperCase()}</small>
                <strong>{numberFormat.format(count)}</strong>
              </span>
            ))}
          </div>
        </aside>
      </div>

      <section className="ll-problem-dialog__example">
        <div className="ll-problem-dialog__example-heading">
          <div className="ll-problem-dialog__section-heading">
            <span className="ll-problem-dialog__section-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="m7 10 3 2-3 2M13 15h4" />
              </svg>
            </span>
            <h3>Ejemplo real del archivo</h3>
          </div>
        </div>
        <div className="ll-problem-dialog__code">
          <NginxCopyButton value={problem.exampleMessage} label="Copiar ejemplo" compact />
          <pre>{problem.exampleMessage}</pre>
        </div>
      </section>

      <footer className="ll-problem-dialog__footer">
        <button type="button" className="ll-problem-dialog__investigate" onClick={onExplore}>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
            <path d="m7 10 3 2-3 2M13 15h4" />
          </svg>
          <span>Ver registros relacionados</span>
        </button>
      </footer>
    </dialog>
  );
}
