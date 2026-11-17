import type { LogProcessingResult } from '../../../../../core/logs/processing/types';

const nf = new Intl.NumberFormat('es-ES');

const levels = [
  { id: 'emerg', color: '#b24bff' },
  { id: 'alert', color: '#b24bff' },
  { id: 'crit', color: '#b24bff' },
  { id: 'error', color: '#ee258f' },
  { id: 'warn', color: '#ff9850' },
  { id: 'notice', color: '#ffc448' },
  { id: 'info', color: '#ffc448' },
  { id: 'debug', color: '#ffc448' },
] as const;

export function NginxSeverityChart({ result }: { result: LogProcessingResult }) {
  const available = levels.filter((level) => (result.levelCounts[level.id] ?? 0) > 0);

  return (
    <article className="ll-dash-panel ll-dash-panel--levels">
      <div className="ll-dash-panel-heading">
        <div>
          <h2>Severidades</h2>

          <p>Distribución del archivo completo</p>
        </div>
      </div>

      {available.length === 0 ? (
        <p className="ll-dash-muted">No se encontraron eventos válidos.</p>
      ) : (
        <div className="ll-dash-level-list">
          {available.map(({ id, color }) => {
            const count = result.levelCounts[id] ?? 0;

            const percent = result.parsedLines > 0 ? (count / result.parsedLines) * 100 : 0;

            return (
              <div className="ll-dash-level" key={id}>
                <div>
                  <span>
                    <i
                      style={{
                        background: color,
                      }}
                    />

                    {id.toUpperCase()}
                  </span>

                  <strong>{nf.format(count)}</strong>
                </div>

                <div className="ll-dash-level__track">
                  <span
                    style={{
                      width: `${percent}%`,
                      background: color,
                    }}
                  />
                </div>

                <small>{percent.toFixed(1).replace('.', ',')} %</small>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}
