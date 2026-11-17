import { useEffect, useRef, useState, type ReactNode } from 'react';

import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { processLogFileInWorker } from '../../core/logs/processing/processLogFileInWorker';
import type { LogProcessingProgress, LogProcessingResult } from '../../core/logs/processing/types';
import { formatFileSize } from '../../core/utils/formatFileSize';

import './ProcessingScreen.css';

interface ProcessingScreenProps {
  file: File;
  onBack: () => void;
  onComplete: (result: LogProcessingResult) => void;
}

type IconName = 'file' | 'search' | 'chart' | 'check' | 'clock';

const phases: ReadonlyArray<{ title: string; description: string; icon: IconName }> = [
  { title: 'Preparando archivo', description: 'Detectando formato', icon: 'file' },
  { title: 'Leyendo registros', description: 'Interpretando líneas', icon: 'search' },
  { title: 'Clasificando eventos', description: 'Agrupando severidades', icon: 'chart' },
  { title: 'Finalizando', description: 'Abriendo resultados', icon: 'check' },
];

/**
 * Hitos visuales asociados al progreso REAL de lectura.
 * Son puntos del recorrido (0 %, 33 %, 66 %, 100 %),
 * no tareas independientes ni temporizadores.
 */
const PHASE_MILESTONES = [0, 33, 66, 100] as const;

type PhaseState = 'pending' | 'active' | 'done';

/**
 * Fill each connector using the same real progress as the lower bar.
 * 0–33%: first connector; 33–66%: second; 66–100%: third.
 * There are no independent animation timers.
 */
function getConnectorFill(index: number, percent: number): number {
  const start = PHASE_MILESTONES[index] ?? 0;
  const end = PHASE_MILESTONES[index + 1] ?? 100;
  if (end <= start) return 0;
  return Math.max(0, Math.min(100, ((percent - start) / (end - start)) * 100));
}

function getPhaseState(
  index: number,
  stage: LogProcessingProgress['stage'],
  percent: number,
  completed: boolean,
): PhaseState {
  if (completed) return 'done';
  if (stage === 'detecting') return index === 0 ? 'active' : 'pending';

  const currentIndex = percent >= PHASE_MILESTONES[2]
    ? 2
    : percent >= PHASE_MILESTONES[1]
      ? 1
      : 0;

  if (index < currentIndex) return 'done';
  return index === currentIndex ? 'active' : 'pending';
}

const numberFormat = new Intl.NumberFormat('es-ES');

function elapsedLabel(milliseconds: number): string {
  if (milliseconds < 60_000) {
    return `${(milliseconds / 1_000).toFixed(1).replace('.', ',')} s`;
  }

  const seconds = Math.floor(milliseconds / 1_000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function Icon({ name, size = 25 }: { name: IconName; size?: number }) {
  const elements: Record<IconName, ReactNode> = {
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h6" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    chart: <path d="M5 20v-6M12 20V5M19 20v-10" />,
    check: <path d="m4 12 5 5L20 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l4 2" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {elements[name]}
    </svg>
  );
}

function initialProgress(fileSize: number): LogProcessingProgress {
  return {
    stage: 'detecting',
    bytesRead: 0,
    totalBytes: fileSize,
    percent: 0,
    processedLines: 0,
    parsedLines: 0,
    invalidLines: 0,
  };
}

export function ProcessingScreen({ file, onBack, onComplete }: ProcessingScreenProps) {
  const abortRef = useRef<AbortController | null>(null);
  const onCompleteRef = useRef(onComplete);

  const [progress, setProgress] = useState<LogProcessingProgress>(() => initialProgress(file.size));
  const [result, setResult] = useState<LogProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let active = true;
    const startedAt = performance.now();
    const controller = new AbortController();
    abortRef.current = controller;

    const clockTimer = window.setInterval(() => {
      if (active) setDurationMs(performance.now() - startedAt);
    }, 100);

    void processLogFileInWorker(file, {
      signal: controller.signal,
      onProgress(update) {
        if (active && update.stage !== 'completed') setProgress(update);
      },
    })
      .then((processed) => {
        if (!active) return;
        window.clearInterval(clockTimer);
        setDurationMs(performance.now() - startedAt);
        setResult(processed);
        setProgress({
          stage: 'completed',
          bytesRead: file.size,
          totalBytes: file.size,
          percent: 100,
          processedLines: processed.totalNonEmptyLines,
          parsedLines: processed.parsedLines,
          invalidLines: processed.invalidLines,
        });

        // Sin espera artificial: la vista de progreso solo se muestra
        // cuando el archivo tarda mas de 300 ms en procesarse.
        // El dashboard recibe los resultados en cuanto estan listos.
        onCompleteRef.current(processed);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        if (caught instanceof Error && caught.name === 'AbortError') return;
        window.clearInterval(clockTimer);
        setDurationMs(performance.now() - startedAt);
        setError(caught instanceof Error ? caught.message : 'No se pudo procesar el archivo.');
      });

    return () => {
      active = false;
      window.clearInterval(clockTimer);
      controller.abort();
      if (abortRef.current === controller) abortRef.current = null;
    };
  }, [file]);

  const finished = result !== null;
  const failed = error !== null;
  // El 100 % solo se muestra cuando el Worker ha entregado el resultado.
  const percent = finished ? 100 : Math.max(0, Math.min(99, progress.percent));
  const detectedFormat = result?.detection.name ?? result?.format ?? 'Análisis local';

  const title = failed
    ? 'No se pudo analizar el archivo'
    : finished
      ? 'Análisis completado'
      : 'Analizando tu archivo...';

  const subtitle = failed
    ? 'El archivo no se ha podido interpretar.'
    : finished
      ? 'Todos los registros procesados. Abriendo el dashboard...'
      : progress.stage === 'detecting'
        ? 'Identificando el formato del archivo.'
        : 'Leyendo y clasificando los registros en tu navegador.';

  const close = () => {
    abortRef.current?.abort();
    onBack();
  };

  return (
    <main className="ll-p-page">
      <AmbientBackground />

      <header className="ll-p-header">
        <a href="/" aria-label="Volver al inicio de LogLens">
          <img src="/LogLens_loglens-horizontal.svg" alt="LogLens" />
        </a>
        <p>Analiza tus logs de forma rápida y visual</p>
      </header>

      <section className="ll-p-layout" aria-label="Estado del análisis">
        <div className="ll-p-file">
          <span className="ll-p-file-icon"><Icon name="file" size={30} /></span>
          <span className="ll-p-file-text">
            <strong>{file.name}</strong>
            <small>{formatFileSize(file.size)} · {detectedFormat}</small>
          </span>
          <button type="button" onClick={close} className="ll-p-close" aria-label="Cancelar análisis y volver">×</button>
        </div>

        <div className="ll-p-heading" aria-live="polite">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        {!failed && (
          <>
            <div className="ll-p-phases" aria-label="Hitos del análisis">
              {/* Three independent visual spans, each ending BEFORE the circles. */}
              <div className="ll-p-phase-connectors" aria-hidden="true">
                {[0, 1, 2].map((index) => (
                  <span key={index} className={`ll-p-connector ll-p-connector--${index + 1}`}>
                    <span
                      className="ll-p-connector-fill"
                      style={{ width: `${getConnectorFill(index, percent)}%` }}
                    />
                  </span>
                ))}
              </div>
              {phases.map((phase, index) => {
                const phaseState = getPhaseState(index, progress.stage, percent, finished);
                return (
                  <div
                    className={`ll-p-phase ll-p-phase--${phaseState}`}
                    key={phase.title}
                    aria-current={phaseState === 'active' ? 'step' : undefined}
                  >
                    <span className="ll-p-phase-icon"><Icon name={phase.icon} /></span>
                    <strong>{phase.title}</strong>
                    <small>{phase.description}</small>
                  </div>
                );
              })}
            </div>

            <div className="ll-p-progress">
              <div
                className="ll-p-progress-track"
                role="progressbar"
                aria-label="Porcentaje real de lectura del archivo"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
              >
                <span className="ll-p-progress-fill" style={{ width: `${percent}%` }} />
              </div>
              <strong>{percent}%</strong>
            </div>

            <p className="ll-p-progress-description" role="status">
              {finished
                ? `${numberFormat.format(result.totalNonEmptyLines)} líneas analizadas · ${numberFormat.format(result.invalidLines)} sin interpretar`
                : progress.stage === 'detecting'
                  ? 'Comprobando el formato...'
                  : `${numberFormat.format(progress.processedLines)} líneas procesadas · ${formatFileSize(progress.bytesRead)} / ${formatFileSize(progress.totalBytes)}`}
            </p>
          </>
        )}

        {failed && (
          <p role="alert" className="ll-p-error">
            {error} Actualmente se admite Nginx Error Log.
          </p>
        )}

        <div className="ll-p-metrics">
          <div className="ll-p-metric">
            <span className="ll-p-metric-icon ll-p-metric-icon--violet"><Icon name="file" /></span>
            <span><strong>{numberFormat.format(progress.processedLines)}</strong><small>Líneas procesadas</small></span>
          </div>
          <div className="ll-p-metric">
            <span className="ll-p-metric-icon ll-p-metric-icon--pink"><Icon name="search" /></span>
            <span><strong>{numberFormat.format(progress.parsedLines)}</strong><small>Registros interpretados</small></span>
          </div>
          <div className="ll-p-metric">
            <span className="ll-p-metric-icon ll-p-metric-icon--orange"><Icon name="clock" /></span>
            <span><strong>{elapsedLabel(durationMs)}</strong><small>Tiempo real de análisis</small></span>
          </div>
        </div>

        <div className="ll-p-actions">
          {failed ? (
            <button type="button" onClick={close} className="ll-p-action ll-p-action--primary">Analizar otro archivo</button>
          ) : finished ? (
            <p>Abriendo el dashboard...</p>
          ) : (
            <button type="button" onClick={close} className="ll-p-action">Cancelar análisis</button>
          )}
        </div>
      </section>
    </main>
  );
}
